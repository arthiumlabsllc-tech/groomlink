import cron from 'node-cron';
import { BookingStatus, PaymentStatus, QueueStatus } from '@prisma/client';
import prisma from '../config/database';
import redis from '../config/redis';
import logger from '../config/logger';
import { bookingConfig } from '../config/booking';
import { getIO } from '../config/socket';
import { sendReminderSMS } from '../services/sms.service';
import { startAutoCompletionJob } from './autoComplete';

/**
 * Initialize all background job schedulers
 */
export function initScheduler(): void {
  logger.info('Initializing background job scheduler...');

  // Job 1: Appointment reminders - every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await sendAppointmentReminders();
  });

  // Job 2: Auto-cancel unpaid bookings - every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    await autoCancelUnpaidBookings();
  });

  // Job 3: Release expired holds - every minute
  cron.schedule('* * * * *', async () => {
    await releaseExpiredHolds();
  });

  // Job 4: Queue timeout - every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await handleQueueTimeouts();
  });

  // Job 5: Auto-completion with reminders - every 30 minutes
  startAutoCompletionJob();

  logger.info('Background job scheduler initialized with 5 jobs');
}

/**
 * Send SMS reminders for appointments starting within 2 hours
 */
async function sendAppointmentReminders(): Promise<void> {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find confirmed bookings starting within 2 hours that haven't had reminders sent
    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        reminderSent: false,
        date: {
          gte: now,
          lte: twoHoursFromNow,
        },
      },
      include: {
        customer: {
          select: {
            phoneNumber: true,
          },
        },
        salon: {
          select: {
            businessName: true,
          },
        },
      },
    });

    for (const booking of bookings) {
      try {
        if (booking.customer.phoneNumber) {
          await sendReminderSMS(
            booking.customer.phoneNumber,
            booking.salon.businessName,
            booking.startTime
          );

          // Mark reminder as sent
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSent: true },
          });

          logger.info(`Reminder sent for booking ${booking.id}`);
        }
      } catch (error) {
        logger.error(`Failed to send reminder for booking ${booking.id}:`, error);
      }
    }

    if (bookings.length > 0) {
      logger.info(`Processed ${bookings.length} appointment reminders`);
    }
  } catch (error) {
    logger.error('Error in sendAppointmentReminders job:', error);
  }
}

/**
 * Auto-cancel unpaid bookings that have exceeded the payment window
 */
async function autoCancelUnpaidBookings(): Promise<void> {
  try {
    const cutoffTime = new Date(
      Date.now() - bookingConfig.autoCancelUnpaidMinutes * 60 * 1000
    );

    // Find pending bookings that haven't been paid and exceeded the auto-cancel window
    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        createdAt: {
          lt: cutoffTime,
        },
        payment: {
          status: {
            not: PaymentStatus.SUCCESS,
          },
        },
      },
      include: {
        salon: {
          select: {
            businessName: true,
          },
        },
        customer: {
          select: {
            phoneNumber: true,
          },
        },
      },
    });

    for (const booking of bookings) {
      try {
        // Cancel the booking
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            salonNotes: 'Auto-cancelled: Payment not received within time limit',
          },
        });

        // Invalidate availability cache
        await invalidateAvailabilityCache(
          booking.salonId,
          booking.workerId || undefined,
          booking.date
        );

        // Emit slot:updated event via Socket.io
        const io = getIO();
        io.emit('slot:updated', {
          salonId: booking.salonId,
          workerId: booking.workerId,
          date: booking.date.toISOString(),
        });

        logger.info(`Auto-cancelled unpaid booking ${booking.id}`);
      } catch (error) {
        logger.error(`Failed to auto-cancel booking ${booking.id}:`, error);
      }
    }

    if (bookings.length > 0) {
      logger.info(`Processed ${bookings.length} auto-cancellations`);
    }
  } catch (error) {
    logger.error('Error in autoCancelUnpaidBookings job:', error);
  }
}

/**
 * Release expired booking holds
 */
async function releaseExpiredHolds(): Promise<void> {
  try {
    const now = new Date();

    // Find bookings with expired holds that are still pending
    const bookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        holdExpiresAt: {
          not: null,
          lt: now,
        },
      },
      include: {
        salon: {
          select: {
            businessName: true,
          },
        },
      },
    });

    for (const booking of bookings) {
      try {
        // Cancel the booking due to expired hold
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            salonNotes: 'Auto-cancelled: Booking hold expired',
          },
        });

        // Invalidate availability cache
        await invalidateAvailabilityCache(
          booking.salonId,
          booking.workerId || undefined,
          booking.date
        );

        // Emit slot:updated event via Socket.io
        const io = getIO();
        io.emit('slot:updated', {
          salonId: booking.salonId,
          workerId: booking.workerId,
          date: booking.date.toISOString(),
        });

        logger.info(`Released expired hold for booking ${booking.id}`);
      } catch (error) {
        logger.error(`Failed to release expired hold for booking ${booking.id}:`, error);
      }
    }

    if (bookings.length > 0) {
      logger.info(`Processed ${bookings.length} expired holds`);
    }
  } catch (error) {
    logger.error('Error in releaseExpiredHolds job:', error);
  }
}

/**
 * Handle queue timeouts - auto-skip CALLED entries, auto-complete IN_SERVICE entries
 */
async function handleQueueTimeouts(): Promise<void> {
  try {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    // Find CALLED entries that have been waiting for more than 10 minutes
    // Use calledAt field since SalonQueue doesn't have updatedAt
    const calledEntries = await prisma.salonQueue.findMany({
      where: {
        status: QueueStatus.CALLED,
        calledAt: {
          lt: tenMinutesAgo,
        },
      },
      include: {
        salon: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Auto-skip CALLED entries
    for (const entry of calledEntries) {
      try {
        await prisma.salonQueue.update({
          where: { id: entry.id },
          data: {
            status: QueueStatus.SKIPPED,
          },
        });

        // Recalculate positions for remaining entries
        await recalculateQueuePositions(entry.salonId);

        // Emit queue update via Socket.io
        const io = getIO();
        io.to(`salon:${entry.salonId}`).emit('queue:updated', { salonId: entry.salonId });
        io.to(`user:${entry.customerId}`).emit('queue:skipped', { entry });

        logger.info(`Auto-skipped queue entry ${entry.id} (customer did not respond within 10 minutes)`);
      } catch (error) {
        logger.error(`Failed to auto-skip queue entry ${entry.id}:`, error);
      }
    }

    // Find IN_SERVICE entries that have been in service for more than 3 hours
    // For IN_SERVICE, we don't have a startedAt field, so we use joinedAt as approximation
    // This is a reasonable fallback since entries go from CALLED -> IN_SERVICE quickly
    const inServiceEntries = await prisma.salonQueue.findMany({
      where: {
        status: QueueStatus.IN_SERVICE,
        joinedAt: {
          lt: threeHoursAgo,
        },
      },
      include: {
        salon: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Auto-complete IN_SERVICE entries
    for (const entry of inServiceEntries) {
      try {
        await prisma.salonQueue.update({
          where: { id: entry.id },
          data: {
            status: QueueStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        // Recalculate positions for remaining entries
        await recalculateQueuePositions(entry.salonId);

        // Remove from Redis sorted set
        const redisKey = `queue:${entry.salonId}`;
        await redis.zrem(redisKey, entry.id);

        // Emit queue update via Socket.io
        const io = getIO();
        io.to(`salon:${entry.salonId}`).emit('queue:completed', { entry });
        io.to(`salon:${entry.salonId}`).emit('queue:updated', { salonId: entry.salonId });
        io.to(`user:${entry.customerId}`).emit('queue:completed', { entry });

        logger.info(`Auto-completed queue entry ${entry.id} (service exceeded 3 hours)`);
      } catch (error) {
        logger.error(`Failed to auto-complete queue entry ${entry.id}:`, error);
      }
    }

    const totalProcessed = calledEntries.length + inServiceEntries.length;
    if (totalProcessed > 0) {
      logger.info(`Processed ${totalProcessed} queue timeouts (${calledEntries.length} skipped, ${inServiceEntries.length} completed)`);
    }
  } catch (error) {
    logger.error('Error in handleQueueTimeouts job:', error);
  }
}

/**
 * Invalidate availability cache for a salon/worker/date
 */
async function invalidateAvailabilityCache(
  salonId: string,
  workerId: string | undefined,
  date: Date
): Promise<void> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `availability:${salonId}:${workerId || 'any'}:${dateStr}`;
    await redis.del(cacheKey);
    logger.debug(`Invalidated availability cache: ${cacheKey}`);
  } catch (error) {
    logger.error('Failed to invalidate availability cache', { error });
  }
}

/**
 * Recalculate positions for all active entries in a salon's queue
 */
async function recalculateQueuePositions(salonId: string): Promise<void> {
  try {
    const activeStatuses: QueueStatus[] = [
      QueueStatus.WAITING,
      QueueStatus.CALLED,
      QueueStatus.IN_SERVICE,
    ];

    const activeEntries = await prisma.salonQueue.findMany({
      where: {
        salonId,
        status: { in: activeStatuses },
      },
      orderBy: [
        { status: 'asc' }, // IN_SERVICE first, then CALLED, then WAITING
        { joinedAt: 'asc' },
      ],
    });

    // Update positions
    const redisKey = `queue:${salonId}`;
    const updates = [];

    for (let i = 0; i < activeEntries.length; i++) {
      const entry = activeEntries[i];
      const newPosition = i + 1;

      updates.push(
        prisma.salonQueue.update({
          where: { id: entry.id },
          data: { position: newPosition },
        })
      );

      // Update Redis sorted set
      await redis.zadd(redisKey, newPosition, entry.id);
    }

    await Promise.all(updates);
  } catch (error) {
    logger.error(`Failed to recalculate queue positions for salon ${salonId}:`, error);
  }
}

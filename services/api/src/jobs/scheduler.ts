import cron from 'node-cron';
import { BookingStatus, PaymentStatus, QueueStatus } from '@prisma/client';
import prisma from '../config/database';
import redis from '../config/redis';
import logger from '../config/logger';
import { bookingConfig } from '../config/booking';
import { getIO } from '../config/socket';
import { sendReminderSMS } from '../services/sms.service';
import * as pushService from '../services/pushNotification.service';
import { startAutoCompletionJob } from './autoComplete';
import { checkExpiredSponsorships, expireUnpaidSponsorshipOrders } from '../services/sponsorship.service';
import { cleanupOrphanedPayments } from '../services/payment.service';
import { initSubscriptionJobs } from './subscription.jobs';
import { getPolicyValue } from '../services/escrow.service';
import { checkAndApplyRestriction } from '../services/noshow.service';
import { runAnomalyScan } from '../services/accounting-anomaly.service';

/**
 * TIMEZONE NOTE: Ghana Time (Africa/Accra = GMT+0)
 * 
 * The API container runs with TZ=Africa/Accra set in docker-compose.prod.yml.
 * This means `new Date()` returns Ghana time, which aligns with UTC since
 * Ghana is in the GMT timezone (no daylight saving time).
 * 
 * All scheduled jobs and date comparisons assume Ghana timezone.
 * This ensures consistent behavior even if the server's default timezone changes.
 */

/**
 * Initialize all background job schedulers
 */
export function initScheduler(): void {
  logger.info('Initializing background job scheduler...');

  // Job 1: Appointment reminders (24h + 2h graduated) - every 5 minutes
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

  // Job 6: Check expired sponsorships + expire unpaid sponsorship orders - every hour
  cron.schedule('0 * * * *', async () => {
    await checkExpiredSponsorships();
    await expireUnpaidSponsorshipOrders();
  });

  // Job 7: Cleanup orphaned payments - every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await cleanupOrphanedPayments();
      logger.info('Orphaned payment cleanup job completed', result);
    } catch (error) {
      logger.error('Error in orphaned payment cleanup job:', error);
    }
  });

  // Job 8: Initialize subscription jobs (reminders and expiration handling)
  initSubscriptionJobs();

  // Job 9: Auto no-show detection + grace-period reminders - every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await detectAndHandleNoShows();
  });

  // Job 10: AI Accountant anomaly scan - daily at 06:00 Ghana time
  cron.schedule('0 6 * * *', async () => {
    try {
      const result = await runAnomalyScan();
      logger.info('Daily AI Accountant anomaly scan completed', {
        alertsCreated: result.alertsCreated,
      });
    } catch (error) {
      logger.error('Daily AI Accountant anomaly scan failed:', error);
    }
  });

  logger.info('Background job scheduler initialized with 10 jobs');
}

/**
 * Send graduated SMS + push reminders for upcoming appointments:
 *  - 24-hour reminder (one day ahead)
 *  - 2-hour  reminder (urgent, last call)
 *
 * TIMEZONE NOTE: The `date` field is midnight UTC with no time component.
 * We query a broad date range and filter in-memory using the actual
 * appointment datetime (date + startTime) to avoid false positives.
 */
async function sendAppointmentReminders(): Promise<void> {
  try {
    const now = new Date();

    // ─── 24-hour reminder ────────────────────────────────────────────────────
    // Window: appointments starting between [now + 24h, now + 25h]
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Broad date range: today through day-after-tomorrow (catches all candidates)
    const startOfToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const endOfRange  = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 3));

    const candidates24h = await prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        date: {
          gte: startOfToday,
          lt: endOfRange,
        },
        reminderSent24h: false,
      },
      include: {
        customer: true,
        salon: true,
        service: true,
      },
    });

    // Filter in-memory using actual appointment datetime (date + startTime)
    const eligible24h = candidates24h.filter((b) => {
      const dateStr = b.date.toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = b.startTime.split(':').map(Number);
      const apptTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));
      return apptTime >= in24h && apptTime <= in25h;
    });

    for (const booking of eligible24h) {
      try {
        const salonName = booking.salon.businessName;
        const serviceName = booking.service?.name || 'your appointment';

        // SMS to customer
        if (booking.customer.phoneNumber) {
          await sendReminderSMS(
            booking.customer.phoneNumber,
            salonName,
            booking.startTime
          ).catch((err) =>
            logger.error('Failed to send 24h SMS reminder', { err, bookingId: booking.id })
          );
        }

        // Push to customer
        pushService
          .sendPushToUser(booking.customer.id, {
            title: '📅 Appointment Tomorrow',
            body: `Reminder: Your appointment at ${salonName} for ${serviceName} is tomorrow at ${booking.startTime}.`,
            data: { type: 'appointment_reminder_24h', bookingId: booking.id },
          })
          .catch((err) =>
            logger.error('Failed to send 24h push reminder', { err, bookingId: booking.id })
          );

        // Mark flag
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSent24h: true },
        });

        logger.info(`24h reminder sent for booking ${booking.id}`);
      } catch (error) {
        logger.error(`Failed to send 24h reminder for booking ${booking.id}:`, error);
      }
    }

    if (eligible24h.length > 0) {
      logger.info(`Processed ${eligible24h.length} 24-hour appointment reminders`);
    }

    // ─── 2-hour reminder (urgent) ─────────────────────────────────────────────
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
            id: true,
            phoneNumber: true,
          },
        },
        salon: {
          select: {
            businessName: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
        guests: {
          select: {
            guestPhone: true,
          },
        },
      },
    });

    for (const booking of bookings) {
      try {
        const reminderPromises: Promise<boolean>[] = [];

        // Send to primary customer
        if (booking.customer.phoneNumber) {
          reminderPromises.push(
            sendReminderSMS(
              booking.customer.phoneNumber,
              booking.salon.businessName,
              booking.startTime
            )
          );
        }

        // Send to group guests with phone numbers
        if (booking.guests && booking.guests.length > 0) {
          const guestPhones = booking.guests
            .map((g) => g.guestPhone)
            .filter((phone): phone is string => !!phone);

          for (const guestPhone of guestPhones) {
            reminderPromises.push(
              sendReminderSMS(
                guestPhone,
                booking.salon.businessName,
                booking.startTime
              )
            );
          }
        }

        // Wait for all reminders to be sent
        if (reminderPromises.length > 0) {
          await Promise.all(reminderPromises);

          // Send push notification to customer (urgent wording)
          pushService
            .sendPushToUser(booking.customer.id, {
              title: '⏰ Appointment in 2 Hours',
              body: `Heads up! Your appointment at ${booking.salon.businessName} is in about 2 hours (${booking.startTime}). Please arrive on time to avoid a no-show.`,
              data: { type: 'appointment_reminder', bookingId: booking.id },
            })
            .catch((err) =>
              logger.error('Failed to send appointment reminder push', { err, bookingId: booking.id })
            );

          // Mark reminder as sent
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSent: true },
          });

          logger.info(
            `2h reminder sent for booking ${booking.id} (${reminderPromises.length} recipient(s))`
          );
        }
      } catch (error) {
        logger.error(`Failed to send 2h reminder for booking ${booking.id}:`, error);
      }
    }

    if (bookings.length > 0) {
      logger.info(`Processed ${bookings.length} 2-hour appointment reminders`);
    }
  } catch (error) {
    logger.error('Error in sendAppointmentReminders job:', error);
  }
}

/**
 * Detect overdue CONFIRMED bookings and auto-transition them to NO_SHOW.
 *
 * Flow per candidate booking:
 *  1. Compute minutes past the appointment end time.
 *  2. If < 30 min past → skip (not yet eligible).
 *  3. If >= graceMinutes (from PlatformPolicy `auto_noshow_grace_minutes`):
 *       → Atomically (inside $transaction):
 *           - Re-read booking (optimistic re-check prevents race conditions)
 *           - Set status = NO_SHOW, noShowFlag = true
 *           - Create NoShowRecord
 *           - Increment User.noShowCount
 *       → Outside transaction:
 *           - Call checkAndApplyRestriction() (may restrict account)
 *           - Send push notifications to salon owner + customer
 *           - Emit socket event
 *  4. If within grace period and reminder not yet sent:
 *       → Send a one-time push reminder to the salon owner
 *       → Set noshowReminderSent = true
 */
async function detectAndHandleNoShows(): Promise<void> {
  try {
    const now = new Date();

    // Candidates: CONFIRMED, not already flagged, appointment date is today or earlier
    const candidates = await prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        noShowFlag: false,
        date: {
          lte: now,
        },
      },
      include: {
        salon: { include: { owner: true } },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (candidates.length === 0) return;

    // Read policy values (with safe defaults)
    let graceMinutes: number;
    try {
      const val = await getPolicyValue('auto_noshow_grace_minutes');
      graceMinutes = parseInt(val, 10) || 60;
    } catch {
      graceMinutes = 60;
    }

    for (const booking of candidates) {
      // Build the appointment end datetime from date + endTime
      const dateStr = booking.date.toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const [endHours, endMinutes] = booking.endTime.split(':').map(Number);
      const appointmentEnd = new Date(Date.UTC(year, month - 1, day, endHours, endMinutes));
      const minutesPast = Math.floor((now.getTime() - appointmentEnd.getTime()) / (60 * 1000));

      // Not yet eligible — appointment ended less than 30 minutes ago
      if (minutesPast < 30) continue;

      if (minutesPast >= graceMinutes) {
        // ── AUTO-TRANSITION TO NO_SHOW ──────────────────────────────────────────
        try {
          await prisma.$transaction(async (tx) => {
            // Optimistic re-check inside transaction (prevents race condition)
            const freshBooking = await tx.booking.findUnique({
              where: { id: booking.id },
              include: { customer: true },
            });

            if (
              !freshBooking ||
              freshBooking.status !== BookingStatus.CONFIRMED ||
              freshBooking.noShowFlag
            ) {
              return; // Already handled by another process or manually
            }

            // Mark booking as no-show
            await tx.booking.update({
              where: { id: booking.id },
              data: { status: BookingStatus.NO_SHOW, noShowFlag: true },
            });

            // Create NoShowRecord (system-initiated)
            await tx.noShowRecord.create({
              data: {
                bookingId: booking.id,
                userId: booking.customerId,
                markedById: 'system',
                markedByRole: 'SYSTEM',
                markedAt: new Date(),
                disputed: false,
              },
            });

            // Increment customer's no-show count
            await tx.user.update({
              where: { id: booking.customerId },
              data: { noShowCount: { increment: 1 } },
            });
          });

          // Apply account restriction if threshold is reached (outside transaction)
          try {
            await checkAndApplyRestriction(booking.customerId);
          } catch (restrictionErr) {
            logger.error(
              `Failed to check/apply restriction for user ${booking.customerId}:`,
              restrictionErr
            );
          }

          // ── Notifications (outside transaction) ─────────────────────────────
          const customerName =
            booking.customer
              ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
              : 'Customer';
          const salonName = booking.salon?.businessName || 'the salon';

          // Push to salon owner
          if (booking.salon?.owner) {
            pushService
              .sendPushToUser(booking.salon.owner.id, {
                title: 'Auto No-Show',
                body: `${customerName} did not check in for their ${booking.endTime} appointment. The booking has been auto-marked as no-show.`,
                data: { type: 'booking_no_show', bookingId: booking.id },
              })
              .catch(() => {});
          }

          // Push to customer
          pushService
            .sendPushToUser(booking.customerId, {
              title: 'No-Show Recorded',
              body: `You were marked as a no-show for your appointment at ${salonName}. This affects your account standing. You can dispute this in the app.`,
              data: { type: 'booking_no_show', bookingId: booking.id },
            })
            .catch(() => {});

          // Emit socket event to salon room
          try {
            const io = getIO();
            io.to(`salon:${booking.salonId}`).emit('booking:noShow', {
              bookingId: booking.id,
              message: 'Auto no-show: customer did not check in',
            });
          } catch (socketErr) {
            logger.error('Failed to emit booking:noShow socket event:', socketErr);
          }

          logger.info(`Auto no-show: Booking ${booking.id} marked as no-show`);
        } catch (err) {
          logger.error(`Auto no-show failed for booking ${booking.id}:`, err);
        }
      } else if (!booking.noshowReminderSent) {
        // ── WITHIN GRACE PERIOD — send one-time reminder to partner ─────────────
        try {
          const remainingMinutes = graceMinutes - minutesPast;

          if (booking.salon?.owner) {
            const customerName =
              booking.customer
                ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
                : 'Customer';

            pushService
              .sendPushToUser(booking.salon.owner.id, {
                title: 'Customer Not Checked In',
                body: `${customerName}'s appointment time has passed. Has the customer arrived? Booking will auto-mark as no-show in ${remainingMinutes} minutes.`,
                data: { type: 'noshow_grace_reminder', bookingId: booking.id },
              })
              .catch(() => {});
          }

          await prisma.booking.update({
            where: { id: booking.id },
            data: { noshowReminderSent: true },
          });
        } catch (err) {
          logger.error(`No-show grace reminder failed for booking ${booking.id}:`, err);
        }
      }
    }
  } catch (error) {
    logger.error('Error in detectAndHandleNoShows job:', error);
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

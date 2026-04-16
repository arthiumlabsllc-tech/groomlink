import cron from 'node-cron';
import { BookingStatus } from '@prisma/client';
import prisma from '../config/database';
import logger from '../config/logger';
import { sendSMS } from '../services/sms.service';
import { releaseEscrow } from '../services/escrow.service';

/**
 * TIMEZONE NOTE: Ghana Time (Africa/Accra = GMT+0)
 * 
 * The API container runs with TZ=Africa/Accra set in docker-compose.prod.yml.
 * This means `new Date()` returns Ghana time, which aligns with UTC since
 * Ghana is in the GMT timezone (no daylight saving time).
 * 
 * All auto-completion timing and date comparisons assume Ghana timezone.
 * The hoursSinceAppointment calculation uses local time which matches Ghana time.
 */

/**
 * Start the auto-completion cron job
 * Runs every 30 minutes to check for bookings that need completion reminders or auto-completion
 */
export const startAutoCompletionJob = (): void => {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      await checkAndAutoCompleteBookings();
    } catch (error) {
      logger.error('Auto-completion job error:', error);
    }
  });

  logger.info('Auto-completion cron job started (every 30 minutes)');
};

/**
 * Check for pending bookings and process completion reminders and auto-completion
 */
async function checkAndAutoCompleteBookings(): Promise<void> {
  const now = new Date();

  // Find confirmed bookings where appointment time has passed and not yet completed
  const pendingBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      serviceCompleted: false,
      date: { lte: now },
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          ownerId: true,
          autoCompletionHours: true,
          completionReminderEnabled: true,
          phoneNumber: true,
        },
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      },
      escrow: {
        select: {
          id: true,
          status: true,
        },
      },
      completionReminders: {
        select: {
          id: true,
          reminderType: true,
          sentAt: true,
        },
      },
      service: {
        select: {
          name: true,
        },
      },
    },
  });

  if (pendingBookings.length === 0) {
    logger.debug('No pending bookings found for auto-completion check');
    return;
  }

  logger.info(`Found ${pendingBookings.length} pending bookings for completion check`);

  for (const booking of pendingBookings) {
    try {
      await processBookingForCompletion(booking, now);
    } catch (error) {
      logger.error(`Error processing booking ${booking.id} for auto-completion:`, error);
    }
  }
}

/**
 * Process a single booking for completion reminders or auto-completion
 */
async function processBookingForCompletion(
  booking: {
    id: string;
    reference: string;
    date: Date;
    startTime: string;
    serviceCompleted: boolean;
    salon: {
      id: string;
      businessName: string;
      ownerId: string;
      autoCompletionHours: number;
      completionReminderEnabled: boolean;
      phoneNumber: string;
    };
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
    };
    escrow: { id: string; status: string } | null;
    completionReminders: { id: string; reminderType: string; sentAt: Date }[];
    service: { name: string } | null;
  },
  now: Date
): Promise<void> {
  // Calculate hours since appointment
  // Booking has date (DateTime) and startTime (String like "09:00")
  const bookingDate = new Date(booking.date);
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  bookingDate.setHours(hours, minutes, 0, 0);

  const hoursSinceAppointment = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60);

  // Skip if appointment hasn't started yet
  if (hoursSinceAppointment < 0) {
    return;
  }

  const reminderCount = booking.completionReminders.length;
  const autoCompleteHours = booking.salon.autoCompletionHours || 2;

  // First reminder: right after appointment (0-0.5h, 0 reminders sent)
  if (hoursSinceAppointment >= 0 && hoursSinceAppointment < 0.5 && reminderCount === 0) {
    if (booking.salon.completionReminderEnabled) {
      await sendFirstReminder(booking);
    }
    return;
  }

  // Urgent reminder: 1 hour after (1-1.5h, 1 reminder sent)
  if (hoursSinceAppointment >= 1 && hoursSinceAppointment < 1.5 && reminderCount === 1) {
    if (booking.salon.completionReminderEnabled) {
      await sendUrgentReminder(booking);
    }
    return;
  }

  // Auto-complete after configured hours
  if (hoursSinceAppointment >= autoCompleteHours) {
    await autoCompleteBooking(booking, hoursSinceAppointment);
  }
}

/**
 * Send the first completion reminder to the salon owner
 */
async function sendFirstReminder(booking: {
  id: string;
  reference: string;
  startTime: string;
  salon: {
    id: string;
    businessName: string;
    ownerId: string;
    phoneNumber: string;
  };
  customer: {
    firstName: string;
    lastName: string;
  };
  service: { name: string } | null;
}): Promise<void> {
  // Create CompletionReminder record
  await prisma.completionReminder.create({
    data: {
      bookingId: booking.id,
      reminderType: 'manual',
      sentToId: booking.salon.ownerId,
    },
  });

  // Send SMS to salon owner
  const message = `GroomLink: The appointment with ${booking.customer.firstName} ${booking.customer.lastName}${booking.service ? ` for ${booking.service.name}` : ''} at ${booking.startTime} has ended. Please mark the service as completed in your dashboard.`;

  try {
    await sendSMS({
      to: booking.salon.phoneNumber,
      message,
    });
    logger.info(`First completion reminder sent for booking ${booking.id} to salon ${booking.salon.id}`);
  } catch (smsError) {
    logger.error(`Failed to send first reminder SMS for booking ${booking.id}:`, smsError);
    // Continue even if SMS fails - the reminder record was created
  }
}

/**
 * Send an urgent completion reminder to the salon owner
 */
async function sendUrgentReminder(booking: {
  id: string;
  reference: string;
  salon: {
    id: string;
    businessName: string;
    ownerId: string;
    phoneNumber: string;
    autoCompletionHours: number;
  };
  customer: {
    firstName: string;
    lastName: string;
  };
  service: { name: string } | null;
}): Promise<void> {
  // Create CompletionReminder record
  await prisma.completionReminder.create({
    data: {
      bookingId: booking.id,
      reminderType: 'auto_pending',
      sentToId: booking.salon.ownerId,
    },
  });

  const autoCompleteHours = booking.salon.autoCompletionHours || 2;

  // Send urgent SMS to salon owner
  const message = `URGENT GroomLink: Service completion pending for booking ${booking.reference}. Auto-completion will occur in ${Math.max(0.5, autoCompleteHours - 1).toFixed(1)} hours. Mark as completed now to avoid automatic processing.`;

  try {
    await sendSMS({
      to: booking.salon.phoneNumber,
      message,
    });
    logger.info(`Urgent completion reminder sent for booking ${booking.id} to salon ${booking.salon.id}`);
  } catch (smsError) {
    logger.error(`Failed to send urgent reminder SMS for booking ${booking.id}:`, smsError);
    // Continue even if SMS fails - the reminder record was created
  }
}

/**
 * Auto-complete a booking and release escrow funds
 */
async function autoCompleteBooking(
  booking: {
    id: string;
    reference: string;
    salon: {
      id: string;
      businessName: string;
      ownerId: string;
      phoneNumber: string;
    };
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
    };
    escrow: { id: string; status: string } | null;
    completionReminders: { id: string; reminderType: string; sentAt: Date }[];
  },
  hoursSinceAppointment: number
): Promise<void> {
  logger.info(`Auto-completing booking ${booking.id} after ${hoursSinceAppointment.toFixed(1)} hours`);

  // Update booking status
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.COMPLETED,
      serviceCompleted: true,
      serviceCompletedAt: new Date(),
      completionMethod: 'auto',
      completedAt: new Date(),
    },
  });

  // Create completion reminder record for the auto-completion
  await prisma.completionReminder.create({
    data: {
      bookingId: booking.id,
      reminderType: 'auto_completed',
      sentToId: booking.salon.ownerId,
    },
  });

  // Release escrow if held
  if (booking.escrow && booking.escrow.status === 'held') {
    try {
      await releaseEscrow(booking.escrow.id);
      logger.info(`Escrow released for auto-completed booking ${booking.id}`);
    } catch (escrowError) {
      logger.error(`Failed to release escrow for booking ${booking.id}:`, escrowError);
      // Continue - the booking is marked complete, escrow can be released manually
    }
  }

  // Send notification to salon owner
  const salonMessage = `GroomLink: Booking ${booking.reference} has been auto-completed. Funds have been released to your account.`;
  try {
    await sendSMS({
      to: booking.salon.phoneNumber,
      message: salonMessage,
    });
  } catch (smsError) {
    logger.error(`Failed to send auto-completion SMS to salon for booking ${booking.id}:`, smsError);
  }

  // Send notification to customer
  if (booking.customer.phoneNumber) {
    const customerMessage = `GroomLink: Your appointment at ${booking.salon.businessName} has been marked as completed. Thank you for using GroomLink!`;
    try {
      await sendSMS({
        to: booking.customer.phoneNumber,
        message: customerMessage,
      });
    } catch (smsError) {
      logger.error(`Failed to send auto-completion SMS to customer for booking ${booking.id}:`, smsError);
    }
  }

  logger.info(`Booking ${booking.id} auto-completed successfully`);
}

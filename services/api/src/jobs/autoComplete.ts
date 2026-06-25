import cron from 'node-cron';
import { BookingStatus } from '@prisma/client';
import prisma from '../config/database';
import logger from '../config/logger';
import { sendSMS } from '../services/sms.service';
import { releaseEscrow } from '../services/escrow.service';
import * as pushService from '../services/pushNotification.service';
import { emitToUser } from '../config/socket';

/**
 * TIMEZONE NOTE: Ghana Time (Africa/Accra = GMT+0)
 * 
 * The API container runs with TZ=Africa/Accra set in docker-compose.prod.yml.
 * This means `new Date()` returns Ghana time, which aligns with UTC since
 * Ghana is in the GMT timezone (no daylight saving time).
 * 
 * SAFETY-NET AUTO-RELEASE:
 * This job now serves as a 48-hour safety net for the two-party confirmation system.
 * Flow:
 * 1. Salon marks service complete -> customer gets notified
 * 2. Customer confirms -> escrow released immediately (handled in completion.service.ts)
 * 3. If customer doesn't confirm within 48h -> this job auto-releases escrow
 * 
 * Additionally, sends reminders to customers who haven't confirmed:
 * - 2 hours after salon marks done: first reminder
 * - 24 hours after salon marks done: urgent reminder
 * - 48 hours after salon marks done: auto-release as safety net
 */

/**
 * Start the auto-completion safety-net cron job
 * Runs every 30 minutes to check for bookings awaiting customer confirmation
 */
export const startAutoCompletionJob = (): void => {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      await checkAndAutoReleaseBookings();
    } catch (error) {
      logger.error('Auto-completion safety-net job error:', error);
    }
  });

  logger.info('Auto-completion safety-net cron job started (every 30 minutes)');
};

/**
 * Check for completed bookings awaiting customer confirmation and process reminders/auto-release
 */
async function checkAndAutoReleaseBookings(): Promise<void> {
  const now = new Date();

  // Find bookings where salon marked complete but customer hasn't confirmed
  const pendingConfirmation = await prisma.booking.findMany({
    where: {
      status: BookingStatus.COMPLETED,
      serviceCompleted: true,
      customerConfirmed: false,
      disputeRaised: false,
      escrow: {
        status: 'held',
      },
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          ownerId: true,
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
          amountHeld: true,
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

  if (pendingConfirmation.length === 0) {
    logger.debug('No bookings pending customer confirmation');
    return;
  }

  logger.info(`Found ${pendingConfirmation.length} bookings pending customer confirmation`);

  for (const booking of pendingConfirmation) {
    try {
      await processBookingForSafetyNet(booking, now);
    } catch (error) {
      logger.error(`Error processing booking ${booking.id} for safety-net:`, error);
    }
  }
}

/**
 * Process a single booking for customer confirmation reminders or safety-net auto-release
 */
async function processBookingForSafetyNet(
  booking: {
    id: string;
    reference: string;
    serviceCompletedAt: Date | null;
    salon: {
      id: string;
      businessName: string;
      ownerId: string;
      completionReminderEnabled: boolean;
      phoneNumber: string;
    };
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
    };
    escrow: { id: string; status: string; amountHeld: any } | null;
    completionReminders: { id: string; reminderType: string; sentAt: Date }[];
    service: { name: string } | null;
  },
  now: Date
): Promise<void> {
  // Calculate hours since salon marked service complete
  const completedAt = booking.serviceCompletedAt || now;
  const hoursSinceCompletion = (now.getTime() - new Date(completedAt).getTime()) / (1000 * 60 * 60);

  // Skip if just completed (give customer time to respond naturally)
  if (hoursSinceCompletion < 2) {
    return;
  }

  // Count reminders sent specifically for customer confirmation
  const customerReminders = booking.completionReminders.filter(
    r => r.reminderType === 'customer_confirm_reminder' || r.reminderType === 'customer_confirm_urgent'
  );
  const reminderCount = customerReminders.length;

  // First reminder: 2 hours after salon marks done (0 reminders sent)
  if (hoursSinceCompletion >= 2 && hoursSinceCompletion < 3 && reminderCount === 0) {
    await sendCustomerConfirmReminder(booking);
    return;
  }

  // Urgent reminder: 24 hours after salon marks done (1 reminder sent)
  if (hoursSinceCompletion >= 24 && hoursSinceCompletion < 25 && reminderCount === 1) {
    await sendCustomerUrgentReminder(booking);
    return;
  }

  // Safety-net auto-release: 48 hours after salon marks done
  if (hoursSinceCompletion >= 48) {
    await safetyNetRelease(booking, hoursSinceCompletion);
  }
}

/**
 * Send first reminder to customer to confirm service completion
 */
async function sendCustomerConfirmReminder(booking: {
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
  service: { name: string } | null;
}): Promise<void> {
  // Create reminder record
  await prisma.completionReminder.create({
    data: {
      bookingId: booking.id,
      reminderType: 'customer_confirm_reminder',
      sentToId: booking.customer.id,
    },
  });

  // Send SMS to customer
  if (booking.customer.phoneNumber) {
    const message = `GroomLink: ${booking.salon.businessName} has marked your${booking.service ? ` ${booking.service.name}` : ''} service as complete. Please open the app to confirm and release payment. If there was an issue, you can raise a dispute.`;
    try {
      await sendSMS({ to: booking.customer.phoneNumber, message });
      logger.info(`Customer confirmation reminder sent for booking ${booking.id}`);
    } catch (smsError) {
      logger.error(`Failed to send customer reminder for booking ${booking.id}:`, smsError);
    }
  }

  // Send push notification
  pushService.sendPushToUser(
    booking.customer.id,
    {
      title: 'Please Confirm Your Service',
      body: `Was your service at ${booking.salon.businessName} completed satisfactorily? Tap to confirm.`,
      data: { type: 'completion_confirmation', bookingId: booking.id },
    }
  ).catch((err) => logger.error('Failed to send push reminder', { err }));

  // Notify customer in real-time via socket
  emitToUser(booking.customer.id, 'booking:completion_reminder', {
    bookingId: booking.id,
    salonId: booking.salon.id,
    message: `Please confirm your service at ${booking.salon.businessName} to release payment.`,
  });

  // Notify salon owner that reminder was sent
  pushService.sendPushToSalon(
    booking.salon.id,
    {
      title: 'Customer Reminder Sent',
      body: `We reminded ${booking.customer.firstName} to confirm their service. Waiting for response.`,
      data: { type: 'completion_reminder_sent', bookingId: booking.id },
    }
  ).catch((err) => logger.error('Failed to send push to salon for reminder', { err }));
}

/**
 * Send urgent reminder to customer (24h mark)
 */
async function sendCustomerUrgentReminder(booking: {
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
  service: { name: string } | null;
}): Promise<void> {
  // Create reminder record
  await prisma.completionReminder.create({
    data: {
      bookingId: booking.id,
      reminderType: 'customer_confirm_urgent',
      sentToId: booking.customer.id,
    },
  });

  // Send urgent SMS
  if (booking.customer.phoneNumber) {
    const message = `REMINDER - GroomLink: Your service at ${booking.salon.businessName} needs confirmation. Payment will be auto-released in 24 hours if not confirmed or disputed. Open the app now.`;
    try {
      await sendSMS({ to: booking.customer.phoneNumber, message });
      logger.info(`Urgent customer confirmation reminder sent for booking ${booking.id}`);
    } catch (smsError) {
      logger.error(`Failed to send urgent customer reminder for booking ${booking.id}:`, smsError);
    }
  }

  // Send push notification
  pushService.sendPushToUser(
    booking.customer.id,
    {
      title: 'Urgent: Confirm Your Service',
      body: `Payment for your service at ${booking.salon.businessName} will be auto-released in 24h. Tap to confirm or dispute.`,
      data: { type: 'completion_confirmation', bookingId: booking.id },
    }
  ).catch((err) => logger.error('Failed to send urgent push reminder', { err }));

  // Notify customer in real-time via socket (urgent)
  emitToUser(booking.customer.id, 'booking:completion_urgent', {
    bookingId: booking.id,
    salonId: booking.salon.id,
    message: `URGENT: Confirm your service at ${booking.salon.businessName} or payment will auto-release in 24h.`,
  });

  // Notify salon owner that urgent reminder was sent
  pushService.sendPushToSalon(
    booking.salon.id,
    {
      title: 'Urgent Reminder Sent to Customer',
      body: `${booking.customer.firstName} was sent an urgent reminder. Payment will auto-release in 24h if not confirmed.`,
      data: { type: 'completion_urgent_sent', bookingId: booking.id },
    }
  ).catch((err) => logger.error('Failed to send urgent push to salon', { err }));

  // Also notify salon owner of the status
  if (booking.salon.phoneNumber) {
    const salonMsg = `GroomLink: Customer hasn't confirmed booking ${booking.reference} yet. Payment will auto-release in 24 hours as a safety measure.`;
    sendSMS({ to: booking.salon.phoneNumber, message: salonMsg }).catch(() => {});
  }
}

/**
 * Safety-net auto-release: Release escrow after 48h without customer confirmation
 * This protects salon owners from unresponsive customers
 */
async function safetyNetRelease(
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
    escrow: { id: string; status: string; amountHeld: any } | null;
    completionReminders: { id: string; reminderType: string; sentAt: Date }[];
  },
  hoursSinceCompletion: number
): Promise<void> {
  logger.info(`Safety-net auto-release for booking ${booking.id} after ${hoursSinceCompletion.toFixed(1)} hours`);

  // Mark customer as auto-confirmed (safety net)
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      customerConfirmed: true,
      customerConfirmedAt: new Date(),
      completedAt: new Date(),
      autoReleaseAt: new Date(), // actual release time
    },
  });

  // Create completion reminder record for the safety-net release
  await prisma.completionReminder.create({
    data: {
      bookingId: booking.id,
      reminderType: 'auto_completed',
      sentToId: booking.salon.ownerId,
    },
  });

  // Release escrow
  if (booking.escrow && booking.escrow.status === 'held') {
    try {
      await releaseEscrow(booking.escrow.id);
      logger.info(`Escrow released (safety-net) for booking ${booking.id}`);
    } catch (escrowError) {
      logger.error(`Failed to release escrow for booking ${booking.id}:`, escrowError);
    }
  }

  // Notify salon owner
  const salonMessage = `GroomLink: Payment for booking ${booking.reference} has been auto-released (48h safety net). Funds will arrive in 1-2 business days.`;
  try {
    await sendSMS({ to: booking.salon.phoneNumber, message: salonMessage });
  } catch (smsError) {
    logger.error(`Failed to send safety-net SMS to salon for booking ${booking.id}:`, smsError);
  }

  // Notify customer
  if (booking.customer.phoneNumber) {
    const customerMessage = `GroomLink: Payment of GHS ${booking.escrow?.amountHeld || ''} for your service at ${booking.salon.businessName} has been released to the provider (48h auto-confirmation).`;
    try {
      await sendSMS({ to: booking.customer.phoneNumber, message: customerMessage });
    } catch (smsError) {
      logger.error(`Failed to send safety-net SMS to customer for booking ${booking.id}:`, smsError);
    }
  }

  // Notify customer via socket
  emitToUser(booking.customer.id, 'booking:auto_released', {
    bookingId: booking.id,
    salonId: booking.salon.id,
    message: `Payment for your service at ${booking.salon.businessName} has been auto-released (48h safety net).`,
  });

  // Notify salon owner via push
  pushService.sendPushToSalon(
    booking.salon.id,
    {
      title: 'Payment Auto-Released',
      body: `Payment for ${booking.customer.firstName}'s service has been auto-released (48h safety net). Funds arriving in 1-2 days.`,
      data: { type: 'payment_auto_released', bookingId: booking.id },
    }
  ).catch((err) => logger.error('Failed to send safety-net push to salon', { err }));

  logger.info(`Booking ${booking.id} safety-net release completed successfully`);
}

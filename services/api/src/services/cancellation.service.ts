import prisma from '../config/database';
import logger from '../config/logger';
import redis from '../config/redis';
import { BookingStatus } from '@prisma/client';
import * as smsService from './sms.service';
import { getPolicyValue, refundEscrow } from './escrow.service';
import { emitSlotUpdated, emitBookingCancelled, emitToSalon } from '../config/socket';
import * as pushService from './pushNotification.service';
import { createNotification } from './notification.service';
import { notifyWaitlistOnCancellation } from './waitlist.service';
import { paymentProviderRegistry } from './payment-provider.registry';

/**
 * Refund calculation result
 */
export interface RefundCalculation {
  refundPercentage: number;
  refundAmount: number;
  platformKeeps: number;
  providerCompensation: number;
  hoursNotice: number;
  eligibleForReschedule: boolean;
  tier: 'FREE' | 'PARTIAL' | 'NONE';
}

/**
 * Calculate refund amount and percentages based on cancellation time
 * @param booking - The booking object with date, startTime, and finalAmount
 * @param cancellationTime - When the cancellation is being made
 */
export async function calculateRefund(
  booking: {
    date: Date;
    startTime: string;
    finalAmount: { toNumber: () => number };
  },
  cancellationTime: Date
): Promise<RefundCalculation> {
  // Calculate the booking datetime
  const bookingDateTime = new Date(booking.date);
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  bookingDateTime.setHours(hours, minutes, 0, 0);

  // Calculate hours notice (time between cancellation and appointment)
  const msDiff = bookingDateTime.getTime() - cancellationTime.getTime();
  const hoursNotice = msDiff / (1000 * 60 * 60);

  // Fetch policy thresholds
  const fullRefundHours = parseFloat(await getPolicyValue('full_refund_hours')) || 48;
  const partialRefund75Hours = parseFloat(await getPolicyValue('partial_refund_75_hours')) || 24;
  const partialRefund50Hours = parseFloat(await getPolicyValue('partial_refund_50_hours')) || 12;
  const processingFee = parseFloat(await getPolicyValue('cancellation_processing_fee')) || 2.0;

  const bookingAmount = booking.finalAmount.toNumber();

  let refundPercentage: number;
  let refundAmount: number;
  let platformKeeps: number;
  let providerCompensation: number;
  let eligibleForReschedule: boolean;
  let tier: 'FREE' | 'PARTIAL' | 'NONE';

  if (hoursNotice >= fullRefundHours) {
    // 48+ hours: 100% refund minus processing fee
    refundPercentage = 100;
    refundAmount = Math.max(0, bookingAmount - processingFee);
    platformKeeps = processingFee;
    providerCompensation = 0;
    eligibleForReschedule = true;
    tier = 'FREE';
  } else if (hoursNotice >= partialRefund75Hours) {
    // 24-48 hours: 75% refund, 25% to provider
    refundPercentage = 75;
    refundAmount = bookingAmount * 0.75;
    platformKeeps = 0;
    providerCompensation = bookingAmount * 0.25;
    eligibleForReschedule = true;
    tier = 'PARTIAL';
  } else if (hoursNotice >= partialRefund50Hours) {
    // 12-24 hours: 50% refund, 50% to provider
    refundPercentage = 50;
    refundAmount = bookingAmount * 0.50;
    platformKeeps = 0;
    providerCompensation = bookingAmount * 0.50;
    eligibleForReschedule = false;
    tier = 'PARTIAL';
  } else {
    // Under 12 hours: 0% refund, 100% to provider
    refundPercentage = 0;
    refundAmount = 0;
    platformKeeps = 0;
    providerCompensation = bookingAmount;
    eligibleForReschedule = false;
    tier = 'NONE';
  }

  return {
    refundPercentage,
    refundAmount,
    platformKeeps,
    providerCompensation,
    hoursNotice,
    eligibleForReschedule,
    tier,
  };
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
    const pattern = `availability:${salonId}:*:${dateStr}`;

    let cursor = '0';
    const keysToDelete: string[] = [];

    do {
      const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        keysToDelete.push(...keys);
      }
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      logger.debug(`Invalidated availability cache keys: ${keysToDelete.join(', ')}`);
    } else {
      const specificKey = `availability:${salonId}:${workerId || 'any'}:${dateStr}`;
      await redis.del(specificKey);
      logger.debug(`Invalidated specific availability cache: ${specificKey}`);
    }
  } catch (error) {
    logger.error('Failed to invalidate availability cache', { error });
  }
}

/**
 * Cancel a booking with appropriate refund calculation
 * @param bookingId - The booking to cancel
 * @param cancelledBy - Who is cancelling ('customer', 'provider', 'system')
 * @param reason - Optional reason for cancellation
 */
export async function cancelBookingWithRefund(
  bookingId: string,
  cancelledBy: 'customer' | 'provider' | 'system',
  reason?: string
) {
  // Fetch booking with all required relations
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      escrow: true,
      salon: {
        select: {
          id: true,
          businessName: true,
          phoneNumber: true,
          ownerId: true,
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
      service: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new Error('Booking is already cancelled');
  }

  const cancellationTime = new Date();
  const refundCalc = await calculateRefund(booking, cancellationTime);

  // Process refund through escrow if exists
  let refundTransactionId: string | undefined;
  if (booking.escrow && refundCalc.refundAmount > 0) {
    try {
      const result = await refundEscrow(booking.escrow.id, refundCalc.refundPercentage);
      refundTransactionId = result.escrow.refundTransactionId || undefined;
      logger.info(`Refund processed for booking ${bookingId}`, {
        refundAmount: result.refundAmount,
        refundPercentage: refundCalc.refundPercentage,
      });
    } catch (refundError) {
      logger.error('Failed to process refund', { bookingId, refundError });
      // Continue with cancellation even if refund fails
    }
  }

  // If provider compensation > 0, release that portion to provider
  if (booking.escrow && refundCalc.providerCompensation > 0) {
    try {
      // Update escrow to release provider compensation
      await prisma.escrowAccount.update({
        where: { id: booking.escrow.id },
        data: {
          providerAmount: refundCalc.providerCompensation,
        },
      });

      // Create transaction record for provider compensation
      await prisma.escrowTransaction.create({
        data: {
          escrowId: booking.escrow.id,
          transactionType: 'release',
          amount: refundCalc.providerCompensation,
          previousBalance: booking.finalAmount.toNumber(),
          newBalance: 0,
          reference: `provider-compensation-${bookingId}`,
        },
      });

      logger.info(`Provider compensation released for booking ${bookingId}`, {
        providerCompensation: refundCalc.providerCompensation,
      });
    } catch (releaseError) {
      logger.error('Failed to release provider compensation', { bookingId, releaseError });
    }
  }

  // Create cancellation record
  const cancellationRecord = await prisma.cancellationRecord.create({
    data: {
      bookingId,
      cancelledBy,
      cancellationTime,
      noticeHours: refundCalc.hoursNotice,
      refundPercentage: refundCalc.refundPercentage,
      refundAmount: refundCalc.refundAmount,
      platformFeeKept: refundCalc.platformKeeps,
      providerCompensation: refundCalc.providerCompensation,
      reason,
    },
  });

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: cancellationTime,
      refundEligible: refundCalc.refundAmount > 0,
      refundPercentage: refundCalc.refundPercentage,
    },
  });

  // Invalidate availability cache
  await invalidateAvailabilityCache(booking.salonId, booking.workerId || undefined, booking.date);

  // Emit slot:updated event for real-time sync
  emitSlotUpdated(booking.salonId, {
    workerId: booking.workerId || undefined,
    date: booking.date.toISOString().split('T')[0],
    action: 'cancelled',
  });

  // Emit booking:cancelled event to customer
  emitBookingCancelled(booking.customerId, {
    bookingId,
    reason,
    cancelledBy,
    refundAmount: refundCalc.refundAmount,
  });

  // Emit cancellation to salon room so partners-app dashboard updates in real-time
  emitToSalon(booking.salonId, 'booking:cancelled', {
    bookingId,
    reason,
    cancelledBy,
    customerName: `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim(),
    serviceName: booking.service?.name || 'service',
  });

  // Send push notification to salon owner (works when app is backgrounded/killed)
  pushService.pushBookingCancelled(
    booking.salonId,
    `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() || 'Customer',
    booking.service?.name || 'service',
    bookingId
  ).catch((err) => logger.error('Failed to send push for cancellation', { err }));

  // Create persistent notification for salon owner
  createNotification({
    userId: booking.salon.ownerId,
    type: 'BOOKING_CANCELLED' as any,
    title: 'Booking Cancelled',
    message: `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() + ` cancelled their ${booking.service?.name || 'service'} booking`,
    data: { bookingId, reason, refundAmount: refundCalc.refundAmount },
  }).catch((err) => logger.error('Failed to create cancellation notification for salon', { err }));

  // Notify waitlisted customers about the available slot
  notifyWaitlistOnCancellation(
    booking.salonId,
    booking.workerId || null,
    booking.date,
    booking.startTime
  ).catch((err) => {
    logger.error('Failed to notify waitlist on cancellation', { bookingId, err });
  });

  // Send SMS to customer
  if (booking.customer.phoneNumber) {
    const customerMessage =
      refundCalc.refundAmount > 0
        ? `Your appointment at ${booking.salon.businessName} has been cancelled. Refund of GHS ${refundCalc.refundAmount.toFixed(2)} will be processed within 3-5 business days.\n\nGroomLink`
        : `Your appointment at ${booking.salon.businessName} has been cancelled. Unfortunately, no refund is available for cancellations within ${Math.round(refundCalc.hoursNotice)} hours of the appointment.\n\nGroomLink`;

    smsService.sendSMS({ to: booking.customer.phoneNumber, message: customerMessage }).catch((err) => {
      logger.error('Failed to send cancellation SMS to customer', { err });
    });
  }

  // Send SMS to salon
  if (booking.salon.phoneNumber) {
    const salonMessage =
      refundCalc.providerCompensation > 0
        ? `Booking ${booking.reference || bookingId} has been cancelled. Compensation of GHS ${refundCalc.providerCompensation.toFixed(2)} will be credited to your account.\n\nGroomLink`
        : `Booking ${booking.reference || bookingId} has been cancelled.\n\nGroomLink`;

    smsService.sendSMS({ to: booking.salon.phoneNumber, message: salonMessage }).catch((err) => {
      logger.error('Failed to send cancellation SMS to salon', { err });
    });
  }

  logger.info(`Booking cancelled with refund: ${bookingId}`, {
    cancelledBy,
    refundPercentage: refundCalc.refundPercentage,
    refundAmount: refundCalc.refundAmount,
    providerCompensation: refundCalc.providerCompensation,
  });

  return {
    ...cancellationRecord,
    refundBreakdown: {
      refundAmount: refundCalc.refundAmount,
      refundPercentage: refundCalc.refundPercentage,
      platformFee: refundCalc.platformKeeps,
      providerAmount: refundCalc.providerCompensation,
      tier: refundCalc.tier,
    },
  };
}

/**
 * Handle provider-initiated cancellation (full refund to customer, penalty to provider)
 * @param bookingId - The booking to cancel
 * @param providerId - The provider (salon owner) cancelling the booking
 * @param reason - Optional reason for cancellation
 */
export async function handleProviderCancellation(
  bookingId: string,
  providerId: string,
  reason?: string
) {
  // Fetch booking with salon to verify ownership
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          phoneNumber: true,
          ownerId: true,
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
      service: {
        select: {
          name: true,
        },
      },
      escrow: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Verify provider owns this salon
  if (booking.salon.ownerId !== providerId) {
    throw new Error('You are not authorized to cancel this booking');
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new Error('Booking is already cancelled');
  }

  const cancellationTime = new Date();

  // Full refund to customer
  if (booking.escrow) {
    try {
      await refundEscrow(booking.escrow.id, 100);
      logger.info(`Full refund processed for provider-cancelled booking ${bookingId}`);
    } catch (refundError) {
      logger.error('Failed to process full refund for provider cancellation', {
        bookingId,
        refundError,
      });
    }
  }

  // Fetch penalty policy values
  const penaltyDays = parseInt(await getPolicyValue('provider_cancel_penalty_days')) || 7;
  const searchPenalty = parseFloat(await getPolicyValue('provider_cancel_search_penalty')) || 0.5;

  // Create provider penalty
  const penalty = await prisma.providerPenalty.create({
    data: {
      providerId,
      bookingId,
      penaltyType: 'cancellation',
      visibilityPenaltyDays: penaltyDays,
      searchRankPenalty: searchPenalty,
      appliedAt: cancellationTime,
      expiresAt: new Date(cancellationTime.getTime() + penaltyDays * 24 * 60 * 60 * 1000),
    },
  });

  // Create cancellation record
  const cancellationRecord = await prisma.cancellationRecord.create({
    data: {
      bookingId,
      cancelledBy: 'provider',
      cancellationTime,
      noticeHours: 0, // Provider cancellation doesn't use notice hours for refund calculation
      refundPercentage: 100,
      refundAmount: booking.escrow ? booking.finalAmount.toNumber() : 0,
      platformFeeKept: 0,
      providerCompensation: 0,
      reason,
    },
  });

  // Update booking status
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: cancellationTime,
      providerCancelled: true,
      refundEligible: true,
      refundPercentage: 100,
    },
  });

  // Invalidate availability cache
  await invalidateAvailabilityCache(booking.salonId, booking.workerId || undefined, booking.date);

  // Emit events
  emitSlotUpdated(booking.salonId, {
    workerId: booking.workerId || undefined,
    date: booking.date.toISOString().split('T')[0],
    action: 'cancelled',
  });

  // Emit cancellation to customer
  emitBookingCancelled(booking.customerId, {
    bookingId,
    reason,
    cancelledBy: 'provider',
    refundAmount: booking.finalAmount.toNumber(),
  });

  // Emit cancellation to salon room so partners-app dashboard updates in real-time
  emitToSalon(booking.salonId, 'booking:cancelled', {
    bookingId,
    reason,
    cancelledBy: 'provider',
    customerName: `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim(),
    serviceName: booking.service?.name || 'service',
  });

  // Send push notification to salon owner (works when app is backgrounded/killed)
  pushService.pushBookingCancelled(
    booking.salonId,
    `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() || 'Customer',
    booking.service?.name || 'service',
    bookingId
  ).catch((err) => logger.error('Failed to send push for provider cancellation', { err }));

  // Create persistent notification for customer
  createNotification({
    userId: booking.customerId,
    type: 'BOOKING_CANCELLED' as any,
    title: 'Booking Cancelled by Provider',
    message: `${booking.salon.businessName} cancelled your ${booking.service?.name || 'service'} booking. A full refund has been initiated.`,
    data: { bookingId, reason, salonName: booking.salon.businessName },
  }).catch((err) => logger.error('Failed to create cancellation notification for customer', { err }));

  // Notify waitlisted customers about the available slot
  notifyWaitlistOnCancellation(
    booking.salonId,
    booking.workerId || null,
    booking.date,
    booking.startTime
  ).catch((err) => {
    logger.error('Failed to notify waitlist on provider cancellation', { bookingId, err });
  });

  // Send SMS to customer (full refund + apology)
  if (booking.customer.phoneNumber) {
    const customerMessage = `We apologize, but your appointment at ${booking.salon.businessName} has been cancelled by the salon. A full refund will be processed within 3-5 business days. We're sorry for any inconvenience.\n\nGroomLink`;

    smsService.sendSMS({ to: booking.customer.phoneNumber, message: customerMessage }).catch((err) => {
      logger.error('Failed to send provider cancellation SMS to customer', { err });
    });
  }

  // Send SMS to salon (penalty warning)
  if (booking.salon.phoneNumber) {
    const salonMessage = `You cancelled booking ${booking.reference || bookingId}. Your salon visibility has been reduced for ${penaltyDays} days. Repeated cancellations may result in account suspension.\n\nGroomLink`;

    smsService.sendSMS({ to: booking.salon.phoneNumber, message: salonMessage }).catch((err) => {
      logger.error('Failed to send penalty warning SMS to salon', { err });
    });
  }

  logger.info(`Provider cancellation processed for booking ${bookingId}`, {
    providerId,
    penaltyDays,
    searchPenalty,
  });

  return { cancellationRecord, penalty };
}

/**
 * Reschedule a booking to a new date/time
 * @param bookingId - The booking to reschedule
 * @param newDate - The new date (ISO string)
 * @param newTime - The new start time (HH:mm)
 * @param newStaffId - Optional new staff member
 */
export async function rescheduleBooking(
  bookingId: string,
  newDate: string,
  newTime: string,
  newStaffId?: string
) {
  // Fetch booking with salon and service
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          phoneNumber: true,
          maxConcurrentClients: true,
          operatingModel: true,
        },
      },
      service: {
        select: {
          duration: true,
          name: true,
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
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
    throw new Error('Only pending or confirmed bookings can be rescheduled');
  }

  // Calculate hours before appointment
  const bookingDateTime = new Date(booking.date);
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  bookingDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const hoursBeforeAppointment = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Fetch free reschedule hours policy
  const freeRescheduleHours = parseFloat(await getPolicyValue('free_reschedule_hours')) || 12;

  if (hoursBeforeAppointment < freeRescheduleHours) {
    throw new Error(
      `Cannot reschedule within ${freeRescheduleHours} hours of the appointment. Please contact the salon directly.`
    );
  }

  // Parse new date and calculate new end time
  const parsedNewDate = new Date(newDate);
  const [newHour, newMinute] = newTime.split(':').map(Number);
  const endDate = new Date(parsedNewDate);
  endDate.setHours(newHour, newMinute + booking.service.duration);
  const newEndTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

  // Check capacity for new time slot (exclude current booking from capacity check)
  const { checkCapacity } = await import('./booking.service');
  const capacityCheck = await checkCapacity(
    booking.salonId,
    parsedNewDate,
    newTime,
    newEndTime,
    booking.totalPeople || 1,
    newStaffId || booking.workerId || undefined,
    bookingId // Exclude the current booking being rescheduled
  );

  if (!capacityCheck.hasCapacity) {
    throw new Error('The selected time slot does not have enough capacity. Please choose another time.');
  }

  if (newStaffId && !capacityCheck.staffCapacityOk) {
    throw new Error('The selected staff member is not available for this time slot. Please choose another staff or time.');
  }

  // Calculate new cancellation deadline using policy (UTC-safe)
  let freeCancellationHours = 48;
  try {
    const freeCancellationHoursStr = await getPolicyValue('free_cancellation_hours');
    freeCancellationHours = parseInt(freeCancellationHoursStr, 10) || 48;
  } catch (e) {
    // use default 48h
  }
  const dateStr = parsedNewDate.toISOString().split('T')[0];
  const [dlYear, dlMonth, dlDay] = dateStr.split('-').map(Number);
  const [dlHours, dlMinutes] = newTime.split(':').map(Number);
  const bookingDateTimeMs = Date.UTC(dlYear, dlMonth - 1, dlDay, dlHours, dlMinutes);
  const cancellationDeadline = new Date(bookingDateTimeMs - (freeCancellationHours * 60 * 60 * 1000));

  // Update booking
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      date: parsedNewDate,
      startTime: newTime,
      endTime: newEndTime,
      workerId: newStaffId || booking.workerId,
      cancellationDeadline,
    },
  });

  // Invalidate cache for old AND new date/staff
  // Use date string comparison to avoid timezone issues with getTime()
  const oldDateStr = booking.date.toISOString().split('T')[0];
  const newDateStr = parsedNewDate.toISOString().split('T')[0];
  
  // Always invalidate old slot
  await invalidateAvailabilityCache(booking.salonId, booking.workerId || undefined, booking.date);
  
  // Invalidate new slot if date, time, or staff changed
  // Note: time change doesn't need separate invalidation since cache is per-date, not per-time
  // But we need to invalidate if:
  // 1. Date changed (new date's cache)
  // 2. Staff changed (new staff's cache for the date)
  if (oldDateStr !== newDateStr || booking.workerId !== newStaffId) {
    await invalidateAvailabilityCache(booking.salonId, newStaffId || booking.workerId || undefined, parsedNewDate);
  }

  // Emit slot:updated events
  emitSlotUpdated(booking.salonId, {
    workerId: booking.workerId || undefined,
    date: oldDateStr,
    action: 'reschedule-from',
  });

  if (oldDateStr !== newDateStr || booking.workerId !== newStaffId) {
    emitSlotUpdated(booking.salonId, {
      workerId: newStaffId || booking.workerId || undefined,
      date: newDateStr,
      action: 'reschedule-to',
    });
  }

  // Send SMS notifications
  const formattedDate = parsedNewDate.toLocaleDateString('en-GH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // SMS to customer
  if (booking.customer.phoneNumber) {
    const customerMessage = `Your appointment at ${booking.salon.businessName} has been rescheduled to ${formattedDate} at ${newTime}.\n\nGroomLink`;

    smsService.sendSMS({ to: booking.customer.phoneNumber, message: customerMessage }).catch((err) => {
      logger.error('Failed to send reschedule SMS to customer', { err });
    });
  }

  // SMS to salon
  if (booking.salon.phoneNumber) {
    const salonMessage = `Booking ${booking.reference || bookingId} has been rescheduled to ${formattedDate} at ${newTime}.\n\nGroomLink`;

    smsService.sendSMS({ to: booking.salon.phoneNumber, message: salonMessage }).catch((err) => {
      logger.error('Failed to send reschedule SMS to salon', { err });
    });
  }

  logger.info(`Booking rescheduled: ${bookingId}`, {
    newDate: newDateStr,
    newTime,
    newStaffId,
  });

  return updatedBooking;
}

/**
 * One-Click Refund: Provider initiates a full refund to the customer's original payment method.
 * This is used when a customer cancels and the barber taps "Refund".
 * Routes the refund through the active payment gateway configured by admin in SiteSettings.
 * - If admin set Paystack (default): reverse charge via Paystack refund API
 * - If admin set Hubtel: send money back via Hubtel payout
 * - Graceful fallback: if active gateway fails, tries the other gateway
 */
export async function oneClickRefund(bookingId: string, providerId: string) {
  // Fetch booking with all required relations
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      escrow: true,
      payment: true,
      salon: {
        select: {
          id: true,
          businessName: true,
          ownerId: true,
        },
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          email: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Verify provider owns this salon
  if (booking.salon.ownerId !== providerId) {
    throw new Error('You are not authorized to refund this booking');
  }

  if (booking.status !== BookingStatus.CANCELLED) {
    throw new Error('Only cancelled bookings can be refunded');
  }

  if (!booking.escrow) {
    throw new Error('No escrow record found for this booking');
  }

  if (booking.escrow.status === 'refunded' && booking.escrow.refundTransactionId) {
    throw new Error('This booking has already been refunded');
  }

  // Allow refund only for valid escrow states:
  // - 'held': initial state after payment
  // - 'refund_failed': previous automatic refund attempt failed (payout methods failed)
  // - 'refunded' without refundTransactionId: legacy false-positive (payout failed but status was marked refunded)
  const allowedEscrowStatuses = ['held', 'refund_failed', 'refunded'];
  if (!allowedEscrowStatuses.includes(booking.escrow.status)) {
    throw new Error(`Escrow is in '${booking.escrow.status}' state and cannot be refunded`);
  }

  const refundAmount = parseFloat(booking.escrow.amountHeld.toString());
  let refundMethod = 'unknown';
  let refundReference: string | undefined;

  // Determine active gateway from admin SiteSettings
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const activeGateway = settings?.paymentGateway || 'paystack';

  const payment = booking.payment;
  const providerRef = payment?.providerRef || payment?.paystackTransactionId;

  if (activeGateway === 'hubtel') {
    // Admin set Hubtel as active — try Hubtel first
    const hubtelRef = await hubtelRefundFallback(booking, refundAmount);
    if (hubtelRef) {
      refundMethod = 'hubtel_momo';
      refundReference = hubtelRef;
    } else {
      // Hubtel failed — fallback to Paystack
      if (providerRef) {
        const psRef = await paystackRefundDirect(providerRef, refundAmount, booking);
        if (psRef) {
          refundMethod = 'paystack_fallback';
          refundReference = psRef;
        }
      }
    }
  } else {
    // Paystack is active (default) — try Paystack first
    if (providerRef) {
      const psRef = await paystackRefundDirect(providerRef, refundAmount, booking);
      if (psRef) {
        refundMethod = 'paystack';
        refundReference = psRef;
      }
    }

    // Paystack failed or no providerRef — try Paystack transfer as fallback
    if (!refundReference && booking.customer?.phoneNumber) {
      const psTransferRef = await paystackTransferRefund(booking, refundAmount);
      if (psTransferRef) {
        refundMethod = 'paystack_transfer';
        refundReference = psTransferRef;
      }
    }

    // Last resort: try Hubtel if configured
    if (!refundReference) {
      const hubtelRef = await hubtelRefundFallback(booking, refundAmount);
      if (hubtelRef) {
        refundMethod = 'hubtel_momo_fallback';
        refundReference = hubtelRef;
      }
    }
  }

  if (!refundReference) {
    logger.error('All refund methods failed for one-click refund', { bookingId, activeGateway });
    throw new Error(
      'Refund could not be processed. Please ensure payment gateway credentials are configured in admin settings.'
    );
  }

  // Update escrow status to refunded (success on this attempt)
  await prisma.escrowAccount.update({
    where: { id: booking.escrow.id },
    data: {
      status: 'refunded',
      refundTransactionId: refundReference,
      hubtelPayoutReference: refundMethod.startsWith('hubtel') ? refundReference : booking.escrow.hubtelPayoutReference,
      payoutGateway: refundMethod.startsWith('hubtel') ? 'hubtel' : 'paystack',
    },
  });

  // Create refund transaction record (only if not already created by previous escrow refund call)
  const existingRefundTx = await prisma.escrowTransaction.findFirst({
    where: {
      escrowId: booking.escrow.id,
      transactionType: 'refund',
    },
  });
  if (!existingRefundTx) {
    const currentBalance = parseFloat(booking.escrow.amountHeld.toString());
    await prisma.escrowTransaction.create({
      data: {
        escrowId: booking.escrow.id,
        transactionType: 'refund',
        amount: refundAmount,
        previousBalance: currentBalance,
        newBalance: currentBalance - refundAmount,
        reference: refundReference || `one-click-refund-${bookingId}`,
      },
    });
  }

  // Update booking refund fields
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      refundEligible: true,
      refundPercentage: 100,
    },
  });

  // Send SMS to customer
  if (booking.customer.phoneNumber) {
    const message = `Refund initiated for your cancelled booking at ${booking.salon.businessName}. GH₵${refundAmount.toFixed(2)} will be back in your account within 24 hours.\n\nGroomLink`;
    smsService.sendSMS({ to: booking.customer.phoneNumber, message }).catch((err) => {
      logger.error('Failed to send refund SMS to customer', { err });
    });
  }

  logger.info('One-click refund completed', { bookingId, refundMethod, refundAmount, refundReference });

  return {
    success: true,
    refundAmount,
    refundMethod,
    refundReference,
    message: 'Refund initiated. Money back in customer\'s account within 24 hours.',
  };
}

/**
 * Helper: Hubtel MoMo refund fallback
 */
async function hubtelRefundFallback(booking: any, refundAmount: number): Promise<string | undefined> {
  const customerPhone = booking.customer?.phoneNumber;
  if (!customerPhone) {
    logger.warn('No customer phone for Hubtel refund', { bookingId: booking.id });
    return undefined;
  }

  const { initiateHubtelPayout, getHubtelChannel, formatGhanaPhone } = await import('./payout.service');
  const reference = `GROOMLINK-REFUND-${booking.reference || booking.id}-${Date.now()}`;

  try {
    // Detect MoMo provider from phone number
    const phonePrefix = customerPhone.replace(/[^0-9]/g, '').slice(0, 4);
    let channel = 'mtn-gh';
    if (phonePrefix === '0200' || phonePrefix === '0201' || customerPhone.startsWith('020')) {
      channel = 'vodafone-gh';
    } else if (customerPhone.startsWith('027') || customerPhone.startsWith('026')) {
      channel = 'airteltigo-gh';
    }

    const result = await initiateHubtelPayout({
      recipientPhone: customerPhone,
      recipientName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      amount: refundAmount,
      channel: getHubtelChannel(channel.replace('-gh', '')),
      reference,
      description: 'Refund for cancelled booking',
    });

    return result?.Data?.ClientReference || reference;
  } catch (error: any) {
    logger.error('Hubtel refund payout failed', { bookingId: booking.id, error: error.message });
    return undefined; // Return undefined so caller knows it failed and can try fallback
  }
}

/**
 * Helper: Process Paystack refund via reverse charge
 */
async function paystackRefundDirect(
  providerRef: string,
  refundAmount: number,
  booking: any
): Promise<string | undefined> {
  try {
    const providerResult = await paymentProviderRegistry.getProvider('paystack');
    if (!providerResult) {
      logger.warn('Paystack provider not configured for refund');
      return undefined;
    }

    const result = await providerResult.provider.processRefund(
      {
        transactionReference: providerRef,
        amount: refundAmount,
        reason: `One-click refund for cancelled booking ${booking.reference || booking.id}`,
      },
      providerResult.credentials
    );

    if (result.success) {
      logger.info('Paystack one-click refund processed', {
        bookingId: booking.id,
        refundAmount,
        refundRef: result.refundReference,
      });
      return result.refundReference;
    }

    logger.warn('Paystack refund failed', { bookingId: booking.id, message: result.message });
    return undefined;
  } catch (error: any) {
    logger.error('Paystack refund error', { bookingId: booking.id, error: error.message });
    return undefined;
  }
}

/**
 * Helper: Send refund as Paystack transfer to customer's phone (MoMo)
 */
async function paystackTransferRefund(booking: any, refundAmount: number): Promise<string | undefined> {
  const customerPhone = booking.customer?.phoneNumber;
  if (!customerPhone) return undefined;

  try {
    const providerResult = await paymentProviderRegistry.getProvider('paystack');
    if (!providerResult) return undefined;

    // Detect MoMo provider from phone prefix
    const phonePrefix = customerPhone.replace(/[^0-9]/g, '').slice(0, 4);
    let momoProvider = 'mtn';
    if (phonePrefix === '0200' || phonePrefix === '0201' || customerPhone.startsWith('020')) {
      momoProvider = 'vodafone';
    } else if (customerPhone.startsWith('027') || customerPhone.startsWith('026')) {
      momoProvider = 'airteltigo';
    }

    const reference = `GROOMLINK-REFUND-${booking.reference || booking.id}-${Date.now()}`;
    const result = await providerResult.provider.sendPayout(
      {
        recipient: {
          name: `${booking.customer.firstName} ${booking.customer.lastName}`,
          payoutType: 'mobile_money',
          mobileMoneyNumber: customerPhone,
          mobileMoneyProvider: momoProvider,
        },
        amount: refundAmount,
        reference,
        reason: 'Refund for cancelled booking',
      },
      providerResult.credentials
    );

    if (result.success) {
      logger.info('Paystack transfer refund sent', { bookingId: booking.id, reference });
      return result.payoutReference || reference;
    }

    logger.warn('Paystack transfer refund failed', { bookingId: booking.id, message: result.message });
    return undefined;
  } catch (error: any) {
    logger.error('Paystack transfer refund error', { bookingId: booking.id, error: error.message });
    return undefined;
  }
}

/**
 * Get a preview of refund calculation without executing cancellation
 * @param bookingId - The booking to preview refund for
 */
export async function getRefundPreview(bookingId: string): Promise<RefundCalculation> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      date: true,
      startTime: true,
      finalAmount: true,
      status: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new Error('Booking is already cancelled');
  }

  // Calculate refund with current time
  return calculateRefund(booking, new Date());
}

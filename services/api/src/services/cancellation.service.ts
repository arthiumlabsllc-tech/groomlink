import prisma from '../config/database';
import logger from '../config/logger';
import redis from '../config/redis';
import { BookingStatus } from '@prisma/client';
import * as smsService from './sms.service';
import { getPolicyValue, refundEscrow } from './escrow.service';
import { emitSlotUpdated, emitBookingCancelled } from '../config/socket';

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

  if (hoursNotice >= fullRefundHours) {
    // 48+ hours: 100% refund minus processing fee
    refundPercentage = 100;
    refundAmount = Math.max(0, bookingAmount - processingFee);
    platformKeeps = processingFee;
    providerCompensation = 0;
    eligibleForReschedule = true;
  } else if (hoursNotice >= partialRefund75Hours) {
    // 24-48 hours: 75% refund, 25% to provider
    refundPercentage = 75;
    refundAmount = bookingAmount * 0.75;
    platformKeeps = 0;
    providerCompensation = bookingAmount * 0.25;
    eligibleForReschedule = true;
  } else if (hoursNotice >= partialRefund50Hours) {
    // 12-24 hours: 50% refund, 50% to provider
    refundPercentage = 50;
    refundAmount = bookingAmount * 0.50;
    platformKeeps = 0;
    providerCompensation = bookingAmount * 0.50;
    eligibleForReschedule = false;
  } else {
    // Under 12 hours: 0% refund, 100% to provider
    refundPercentage = 0;
    refundAmount = 0;
    platformKeeps = 0;
    providerCompensation = bookingAmount;
    eligibleForReschedule = false;
  }

  return {
    refundPercentage,
    refundAmount,
    platformKeeps,
    providerCompensation,
    hoursNotice,
    eligibleForReschedule,
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

  // Emit booking:cancelled event
  emitBookingCancelled(booking.customerId, {
    bookingId,
    reason,
    cancelledBy,
    refundAmount: refundCalc.refundAmount,
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

  return cancellationRecord;
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

  emitBookingCancelled(booking.customerId, {
    bookingId,
    reason,
    cancelledBy: 'provider',
    refundAmount: booking.finalAmount.toNumber(),
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

  // Calculate new cancellation deadline (same as original booking window)
  const cancellationDeadline = new Date(parsedNewDate);
  const [cancelHours] = newTime.split(':').map(Number);
  cancellationDeadline.setHours(cancelHours - 12, 0, 0, 0); // 12 hours before appointment

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

  // Invalidate cache for old AND new date
  await invalidateAvailabilityCache(booking.salonId, booking.workerId || undefined, booking.date);
  if (booking.date.getTime() !== parsedNewDate.getTime()) {
    await invalidateAvailabilityCache(booking.salonId, newStaffId || booking.workerId || undefined, parsedNewDate);
  }

  // Emit slot:updated events
  const oldDateStr = booking.date.toISOString().split('T')[0];
  const newDateStr = parsedNewDate.toISOString().split('T')[0];

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

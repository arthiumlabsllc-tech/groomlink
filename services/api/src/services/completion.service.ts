import prisma from '../config/database';
import redis from '../config/redis';
import logger from '../config/logger';
import { releaseEscrow, refundEscrow, getEscrowByBookingId } from './escrow.service';
import * as smsService from './sms.service';
import { emitBookingCompleted } from '../config/socket';
import * as pushService from './pushNotification.service';
import QRCode from 'qrcode';

/**
 * Manual completion by salon owner
 * - Verifies salon ownership
 * - Verifies appointment time has passed
 * - Marks service as completed but does NOT release escrow
 * - Notifies customer to confirm completion (escrow released on customer confirmation)
 */
export async function manualComplete(bookingId: string, completedById: string) {
  try {
    // Fetch booking with escrow, salon, customer relations
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        escrow: true,
        salon: {
          include: {
            owner: true,
          },
        },
        customer: true,
        service: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify salon ownership
    if (booking.salon.ownerId !== completedById) {
      throw new Error('Unauthorized: Only the salon owner can complete this booking');
    }

    // Verify appointment time has passed (using endTime)
    const bookingDateTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.endTime}`);
    const now = new Date();
    if (bookingDateTime > now) {
      throw new Error('Cannot complete booking before service end time');
    }

    // Verify not already completed
    if (booking.serviceCompleted) {
      throw new Error('Booking is already marked as completed');
    }

    // Verify escrow exists and is held
    if (!booking.escrow) {
      throw new Error('Escrow account not found for this booking');
    }
    if (booking.escrow.status !== 'held') {
      throw new Error(`Cannot release escrow with status: ${booking.escrow.status}`);
    }

    // DO NOT release escrow here - wait for customer confirmation
    // Escrow stays in 'held' status until customer confirms

    // Update booking - mark service as completed, awaiting customer confirmation
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        serviceCompleted: true,
        serviceCompletedAt: new Date(),
        serviceCompletedBy: completedById,
        completionMethod: 'manual',
        status: 'COMPLETED',
      },
      include: {
        salon: true,
        customer: true,
        escrow: true,
      },
    });

    // Send SMS to customer asking them to confirm
    if (booking.customer?.phoneNumber) {
      const customerMessage = `Your service at ${booking.salon.businessName} has been marked as complete. Please open GroomLink to confirm and release payment of GHS ${booking.escrow.amountHeld}. If there's an issue, you can raise a dispute.`;
      smsService.sendSMS({
        to: booking.customer.phoneNumber,
        message: customerMessage,
      }).catch((err) => logger.error('Failed to send completion confirmation SMS to customer', { err }));
    }

    // Send push notification to customer to confirm
    pushService.sendPushToUser(
      booking.customerId,
      {
        title: 'Service Completed - Please Confirm',
        body: `Your service at ${booking.salon.businessName} is done. Tap to confirm and release payment.`,
        data: { type: 'completion_confirmation', bookingId: booking.id },
      }
    ).catch((err) => logger.error('Failed to send push for completion confirmation', { err }));

    // Send SMS to salon owner confirming they marked it done
    if (booking.salon.owner?.phoneNumber) {
      const salonMessage = `You've marked booking ${booking.reference || bookingId} as complete. Payment will be released once the customer confirms. GroomLink`;
      smsService.sendSMS({
        to: booking.salon.owner.phoneNumber,
        message: salonMessage,
      }).catch((err) => logger.error('Failed to send completion SMS to salon', { err }));
    }

    logger.info(`Booking marked complete by salon, awaiting customer confirmation: ${bookingId}`, {
      completedBy: completedById,
      escrowId: booking.escrow.id,
    });

    // Emit socket event to salon
    emitBookingCompleted(booking.salonId, {
      bookingId: updatedBooking.id,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.service?.name || 'Service',
      totalAmount: booking.escrow.amountHeld.toString(),
    });

    return updatedBooking;
  } catch (error) {
    logger.error('Error in manualComplete:', { bookingId, completedById, error });
    throw error;
  }
}

/**
 * Customer confirms service completion
 * - Verifies booking belongs to customer
 * - Releases escrow and updates booking
 */
export async function customerConfirmComplete(bookingId: string, userId: string) {
  try {
    // Fetch booking with escrow, salon, customer
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        escrow: true,
        salon: {
          include: {
            owner: true,
          },
        },
        customer: true,
        service: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify booking belongs to user
    if (booking.customerId !== userId) {
      throw new Error('Unauthorized: This booking does not belong to you');
    }

    // If customer already confirmed (e.g. 48h safety-net auto-released), return success gracefully
    if (booking.customerConfirmed) {
      logger.info(`Customer confirmation already done for booking ${bookingId} (likely auto-released)`);
      // Return the current booking state - payment was already released
      const currentBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { salon: true, customer: true, escrow: true },
      });
      return currentBooking;
    }

    // Verify escrow exists
    if (!booking.escrow) {
      throw new Error('Escrow account not found for this booking');
    }

    // If escrow already released (safety-net beat the customer), handle gracefully
    if (booking.escrow.status !== 'held') {
      logger.info(`Escrow already ${booking.escrow.status} for booking ${bookingId} - marking customer confirmed`);
      // Just mark customer as confirmed since payment already went through
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          customerConfirmed: true,
          customerConfirmedAt: new Date(),
        },
        include: { salon: true, customer: true, escrow: true },
      });
      return updatedBooking;
    }

    // Release escrow - this is the normal flow (customer confirms before 48h)
    await releaseEscrow(booking.escrow.id);

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        customerConfirmed: true,
        customerConfirmedAt: new Date(),
        completionMethod: 'customer_confirmation',
        completedAt: new Date(),
        status: 'COMPLETED',
      },
      include: {
        salon: true,
        customer: true,
        escrow: true,
      },
    });

    // Send SMS to salon owner
    if (booking.salon.owner?.phoneNumber) {
      const salonMessage = `Customer has confirmed service completion for booking ${booking.reference || bookingId}. Payment has been released and will arrive in 1-2 business days. GroomLink`;
      smsService.sendSMS({
        to: booking.salon.owner.phoneNumber,
        message: salonMessage,
      }).catch((err) => logger.error('Failed to send confirmation SMS to salon', { err }));
    }

    logger.info(`Booking completed by customer confirmation: ${bookingId}`, {
      customerId: userId,
      escrowId: booking.escrow.id,
    });

    // Emit socket event to salon for audible notification
    emitBookingCompleted(booking.salonId, {
      bookingId: updatedBooking.id,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.service?.name || 'Service',
      totalAmount: booking.escrow.amountHeld.toString(),
    });

    // Send push notification (works when app is backgrounded)
    pushService.pushServiceCompleted(
      booking.salonId,
      `${booking.customer.firstName} ${booking.customer.lastName}`,
      booking.service?.name || 'Service',
      booking.id,
      booking.escrow.amountHeld.toString()
    ).catch((err) => logger.error('Failed to send push for customer confirm completion', { err }));

    return updatedBooking;
  } catch (error) {
    logger.error('Error in customerConfirmComplete:', { bookingId, userId, error });
    throw error;
  }
}

/**
 * QR code completion
 * - Validates QR token from Redis
 * - Verifies salon ownership
 * - Releases escrow and updates booking
 */
export async function qrComplete(bookingId: string, salonOwnerId: string) {
  try {
    // Check Redis for QR token
    const qrKey = `qr:${bookingId}`;
    const qrDataString = await redis.get(qrKey);

    if (!qrDataString) {
      throw new Error('QR code expired or invalid');
    }

    // Fetch booking with escrow, salon
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        escrow: true,
        salon: {
          include: {
            owner: true,
          },
        },
        customer: true,
        service: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify salon ownership
    if (booking.salon.ownerId !== salonOwnerId) {
      throw new Error('Unauthorized: Only the salon owner can complete this booking');
    }

    // Verify not already completed
    if (booking.serviceCompleted) {
      throw new Error('Booking is already marked as completed');
    }

    // Verify escrow exists and is held
    if (!booking.escrow) {
      throw new Error('Escrow account not found for this booking');
    }
    if (booking.escrow.status !== 'held') {
      throw new Error(`Cannot release escrow with status: ${booking.escrow.status}`);
    }

    // Release escrow
    await releaseEscrow(booking.escrow.id);

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        serviceCompleted: true,
        serviceCompletedAt: new Date(),
        serviceCompletedBy: salonOwnerId,
        completionMethod: 'qr_scan',
        status: 'COMPLETED',
      },
      include: {
        salon: true,
        customer: true,
        escrow: true,
      },
    });

    // Delete QR from Redis
    await redis.del(qrKey);

    // Send SMS to customer
    if (booking.customer?.phoneNumber) {
      const customerMessage = `Your service at ${booking.salon.businessName} has been completed via QR check-in. Payment of GHS ${booking.escrow.amountHeld} has been released. Thank you for using GroomLink!`;
      smsService.sendSMS({
        to: booking.customer.phoneNumber,
        message: customerMessage,
      }).catch((err) => logger.error('Failed to send QR completion SMS to customer', { err }));
    }

    logger.info(`Booking completed via QR scan: ${bookingId}`, {
      salonOwnerId,
      escrowId: booking.escrow.id,
    });

    // Emit socket event to salon for audible notification
    emitBookingCompleted(booking.salonId, {
      bookingId: updatedBooking.id,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.service?.name || 'Service',
      totalAmount: booking.escrow.amountHeld.toString(),
    });

    // Send push notification (works when app is backgrounded)
    pushService.pushServiceCompleted(
      booking.salonId,
      `${booking.customer.firstName} ${booking.customer.lastName}`,
      booking.service?.name || 'Service',
      booking.id,
      booking.escrow.amountHeld.toString()
    ).catch((err) => logger.error('Failed to send push for QR completion', { err }));

    return updatedBooking;
  } catch (error) {
    logger.error('Error in qrComplete:', { bookingId, salonOwnerId, error });
    throw error;
  }
}

/**
 * Auto-complete booking (called by cron job)
 * - Re-fetches booking to check if already completed
 * - Releases escrow and updates booking
 */
export async function autoCompleteBooking(bookingId: string) {
  try {
    // Re-fetch booking (it may have been completed since cron picked it up)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        escrow: true,
        salon: {
          include: {
            owner: true,
          },
        },
        customer: true,
        service: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // If already completed, return early
    if (booking.serviceCompleted) {
      logger.info(`Booking ${bookingId} already completed, skipping auto-complete`);
      return booking;
    }

    // Verify escrow exists and is held
    if (!booking.escrow) {
      throw new Error('Escrow account not found for this booking');
    }
    if (booking.escrow.status !== 'held') {
      throw new Error(`Cannot release escrow with status: ${booking.escrow.status}`);
    }

    // Release escrow
    await releaseEscrow(booking.escrow.id);

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        serviceCompleted: true,
        serviceCompletedAt: new Date(),
        completionMethod: 'auto',
        autoCompletionAttempts: {
          increment: 1,
        },
        status: 'COMPLETED',
      },
      include: {
        salon: true,
        customer: true,
        escrow: true,
      },
    });

    // Send SMS to customer
    if (booking.customer?.phoneNumber) {
      const customerMessage = `Your booking ${booking.reference || bookingId} at ${booking.salon.businessName} has been auto-completed. You have 24 hours to raise a dispute if there were any issues. GroomLink`;
      smsService.sendSMS({
        to: booking.customer.phoneNumber,
        message: customerMessage,
      }).catch((err) => logger.error('Failed to send auto-complete SMS to customer', { err }));
    }

    // Send SMS to salon owner
    if (booking.salon.owner?.phoneNumber) {
      const salonMessage = `Booking ${booking.reference || bookingId} has been auto-completed. Payment has been released and will arrive in 1-2 business days. Customer has 24h to dispute. GroomLink`;
      smsService.sendSMS({
        to: booking.salon.owner.phoneNumber,
        message: salonMessage,
      }).catch((err) => logger.error('Failed to send auto-complete SMS to salon', { err }));
    }

    logger.info(`Booking auto-completed: ${bookingId}`, {
      escrowId: booking.escrow.id,
    });

    // Emit socket event to salon for audible notification
    emitBookingCompleted(booking.salonId, {
      bookingId: updatedBooking.id,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.service?.name || 'Service',
      totalAmount: booking.escrow.amountHeld.toString(),
    });

    // Send push notification (works when app is backgrounded)
    pushService.pushServiceCompleted(
      booking.salonId,
      `${booking.customer.firstName} ${booking.customer.lastName}`,
      booking.service?.name || 'Service',
      booking.id,
      booking.escrow.amountHeld.toString()
    ).catch((err) => logger.error('Failed to send push for auto completion', { err }));

    return updatedBooking;
  } catch (error) {
    logger.error('Error in autoCompleteBooking:', { bookingId, error });
    throw error;
  }
}

/**
 * Generate QR code for booking check-in
 * - Creates QR data and stores in Redis with 24h TTL
 * - Returns data URL for QR code image
 */
export async function generateQRCode(bookingId: string): Promise<string> {
  try {
    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        reference: true,
        salonId: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Create QR data object — keep minimal for scannability
    // Only bookingId is required by the scanner; reference is human-readable backup
    const qrData = {
      bookingId: booking.id,
      bookingReference: booking.reference,
    };

    const qrDataString = JSON.stringify(qrData);

    // Generate QR code data URL with error correction level M (15% recovery)
    // This makes the QR code scannable even if partially obscured or displayed small
    const qrDataUrl = await QRCode.toDataURL(qrDataString, {
      errorCorrectionLevel: 'M',
      margin: 2,
    });

    // Store in Redis with 24h TTL (86400 seconds)
    await redis.setex(`qr:${bookingId}`, 86400, qrDataString);

    logger.info(`QR code generated for booking: ${bookingId}`);

    return qrDataUrl;
  } catch (error) {
    logger.error('Error generating QR code:', { bookingId, error });
    throw error;
  }
}

/**
 * Raise a dispute for a booking
 * - Verifies ownership (customer or salon)
 * - Updates booking with dispute info
 */
export async function raiseDispute(bookingId: string, userId: string, reason: string) {
  try {
    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        salon: {
          include: {
            owner: true,
          },
        },
        customer: true,
        escrow: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify ownership (customer or salon owner)
    const isCustomer = booking.customerId === userId;
    const isSalonOwner = booking.salon.ownerId === userId;

    if (!isCustomer && !isSalonOwner) {
      throw new Error('Unauthorized: Only the customer or salon owner can raise a dispute');
    }

    // Verify booking is not already completed
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      throw new Error(`Cannot raise dispute for booking with status: ${booking.status}`);
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        disputeRaised: true,
        disputeReason: reason,
      },
      include: {
        salon: true,
        customer: true,
        escrow: true,
      },
    });

    // Send SMS to salon owner
    if (booking.salon.owner?.phoneNumber) {
      const salonMessage = `A dispute has been raised for booking ${booking.reference || bookingId}. Reason: ${reason}. Payment is on hold pending resolution. GroomLink`;
      smsService.sendSMS({
        to: booking.salon.owner.phoneNumber,
        message: salonMessage,
      }).catch((err) => logger.error('Failed to send dispute SMS to salon', { err }));
    }

    // Send SMS to customer
    if (booking.customer?.phoneNumber && isSalonOwner) {
      const customerMessage = `A dispute has been raised for your booking ${booking.reference || bookingId} by the salon. Reason: ${reason}. Our team will review and resolve shortly. GroomLink`;
      smsService.sendSMS({
        to: booking.customer.phoneNumber,
        message: customerMessage,
      }).catch((err) => logger.error('Failed to send dispute SMS to customer', { err }));
    }

    logger.info(`Dispute raised for booking: ${bookingId}`, {
      raisedBy: userId,
      reason,
    });

    return updatedBooking;
  } catch (error) {
    logger.error('Error in raiseDispute:', { bookingId, userId, reason, error });
    throw error;
  }
}

/**
 * Resolve a dispute for a booking
 * - Validates resolution parameters
 * - Either releases to provider or refunds to customer
 */
export async function resolveDispute(
  bookingId: string,
  resolution: string,
  releaseToProvider: boolean,
  refundToCustomer: boolean
) {
  try {
    // Validate: can't both release AND refund
    if (releaseToProvider && refundToCustomer) {
      throw new Error('Cannot both release to provider AND refund to customer');
    }

    if (!releaseToProvider && !refundToCustomer) {
      throw new Error('Must specify either releaseToProvider or refundToCustomer');
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        escrow: true,
        salon: {
          include: {
            owner: true,
          },
        },
        customer: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify dispute was raised
    if (!booking.disputeRaised) {
      throw new Error('No dispute has been raised for this booking');
    }

    // Verify escrow exists
    if (!booking.escrow) {
      throw new Error('Escrow account not found for this booking');
    }

    let result: { booking: any; escrow?: any; refundAmount?: number };

    if (releaseToProvider) {
      // Release escrow to provider
      const releasedEscrow = await releaseEscrow(booking.escrow.id);

      // Update booking
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          serviceCompleted: true,
          serviceCompletedAt: new Date(),
          completionMethod: 'admin_resolution',
          status: 'COMPLETED',
        },
        include: {
          salon: true,
          customer: true,
          escrow: true,
        },
      });

      result = { booking: updatedBooking, escrow: releasedEscrow };

      // Send SMS to both parties
      const message = `Dispute for booking ${booking.reference || bookingId} has been resolved. Payment released to salon. Resolution: ${resolution}. GroomLink`;

      if (booking.customer?.phoneNumber) {
        smsService.sendSMS({
          to: booking.customer.phoneNumber,
          message,
        }).catch((err) => logger.error('Failed to send dispute resolution SMS to customer', { err }));
      }

      if (booking.salon.owner?.phoneNumber) {
        smsService.sendSMS({
          to: booking.salon.owner.phoneNumber,
          message,
        }).catch((err) => logger.error('Failed to send dispute resolution SMS to salon', { err }));
      }
    } else {
      // Refund to customer (100%)
      const { escrow: refundedEscrow, refundAmount } = await refundEscrow(booking.escrow.id, 100);

      // Update booking
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
        include: {
          salon: true,
          customer: true,
          escrow: true,
        },
      });

      result = { booking: updatedBooking, escrow: refundedEscrow, refundAmount };

      // Send SMS to both parties
      const message = `Dispute for booking ${booking.reference || bookingId} has been resolved. Refund of GHS ${refundAmount} issued to customer. Resolution: ${resolution}. GroomLink`;

      if (booking.customer?.phoneNumber) {
        smsService.sendSMS({
          to: booking.customer.phoneNumber,
          message,
        }).catch((err) => logger.error('Failed to send dispute resolution SMS to customer', { err }));
      }

      if (booking.salon.owner?.phoneNumber) {
        smsService.sendSMS({
          to: booking.salon.owner.phoneNumber,
          message,
        }).catch((err) => logger.error('Failed to send dispute resolution SMS to salon', { err }));
      }
    }

    logger.info(`Dispute resolved for booking: ${bookingId}`, {
      resolution,
      releaseToProvider,
      refundToCustomer,
    });

    return result;
  } catch (error) {
    logger.error('Error in resolveDispute:', { bookingId, resolution, releaseToProvider, refundToCustomer, error });
    throw error;
  }
}

import prisma from '../config/database';
import redis from '../config/redis';
import logger from '../config/logger';
import { releaseEscrow, refundEscrow, getEscrowByBookingId } from './escrow.service';
import * as smsService from './sms.service';
import QRCode from 'qrcode';

/**
 * Manual completion by salon owner
 * - Verifies salon ownership
 * - Verifies appointment time has passed
 * - Releases escrow and updates booking
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

    // Release escrow
    await releaseEscrow(booking.escrow.id);

    // Update booking
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

    // Send SMS to customer
    if (booking.customer?.phoneNumber) {
      const customerMessage = `Your service at ${booking.salon.businessName} has been completed. Payment of GHS ${booking.escrow.amountHeld} has been released to the salon. Thank you for using GroomLink!`;
      smsService.sendSMS({
        to: booking.customer.phoneNumber,
        message: customerMessage,
      }).catch((err) => logger.error('Failed to send completion SMS to customer', { err }));
    }

    // Send SMS to salon owner
    if (booking.salon.owner?.phoneNumber) {
      const salonMessage = `Payment for booking ${booking.reference || bookingId} has been released. Funds will arrive in your account within 1-2 business days. GroomLink`;
      smsService.sendSMS({
        to: booking.salon.owner.phoneNumber,
        message: salonMessage,
      }).catch((err) => logger.error('Failed to send completion SMS to salon', { err }));
    }

    logger.info(`Booking manually completed: ${bookingId}`, {
      completedBy: completedById,
      escrowId: booking.escrow.id,
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
      },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Verify booking belongs to user
    if (booking.customerId !== userId) {
      throw new Error('Unauthorized: This booking does not belong to you');
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
        completionMethod: 'customer_confirmation',
        customerConfirmed: true,
        customerConfirmedAt: new Date(),
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

    // Create QR data object
    const qrData = {
      bookingId: booking.id,
      bookingReference: booking.reference,
      salonId: booking.salonId,
      timestamp: Date.now(),
    };

    const qrDataString = JSON.stringify(qrData);

    // Generate QR code data URL
    const qrDataUrl = await QRCode.toDataURL(qrDataString);

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

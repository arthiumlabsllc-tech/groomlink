import prisma from '../config/database';
import logger from '../config/logger';
import { getPolicyValue } from './escrow.service';
import { NoShowRecord, BookingStatus } from '@prisma/client';

/**
 * Parameters for recording a no-show
 */
export interface RecordNoShowParams {
  bookingId: string;
  markedById: string;
  markedByRole: 'PROVIDER' | 'ADMIN';
}

/**
 * Parameters for disputing a no-show
 */
export interface DisputeNoShowParams {
  noShowRecordId: string;
  userId: string;
  reason: string;
}

/**
 * Parameters for resolving a no-show dispute
 */
export interface ResolveDisputeParams {
  noShowRecordId: string;
  resolution: string;
  upheld: boolean;
}

/**
 * Account restriction check result
 */
export interface AccountRestrictionResult {
  restricted: boolean;
  reason?: string;
  restrictedUntil?: Date;
  noShowCount: number;
}

/**
 * Record a no-show for a booking
 * - Verifies booking exists and status is 'confirmed'
 * - Checks no duplicate NoShowRecord for this bookingId
 * - Creates NoShowRecord
 * - Updates Booking: sets noShowFlag = true, status = 'no_show'
 * - Increments User.noShowCount for the booking's userId
 * - Calls checkAndApplyRestriction internally
 */
export async function recordNoShow(params: RecordNoShowParams): Promise<NoShowRecord> {
  const { bookingId, markedById, markedByRole } = params;

  try {
    // Verify booking exists and is confirmed
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new Error(`Cannot mark booking as no-show: status is ${booking.status}`);
    }

    // Check for existing no-show record
    const existingNoShow = await prisma.noShowRecord.findUnique({
      where: { bookingId },
    });

    if (existingNoShow) {
      throw new Error('No-show record already exists for this booking');
    }

    const userId = booking.customerId;

    // Create no-show record and update booking/user in a transaction
    const noShowRecord = await prisma.$transaction(async (tx) => {
      // Create the no-show record
      const record = await tx.noShowRecord.create({
        data: {
          bookingId,
          userId,
          markedById,
          markedByRole,
          markedAt: new Date(),
          disputed: false,
        },
      });

      // Update booking status and no-show flag
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.NO_SHOW,
          noShowFlag: true,
        },
      });

      // Increment user's no-show count
      await tx.user.update({
        where: { id: userId },
        data: {
          noShowCount: {
            increment: 1,
          },
        },
      });

      return record;
    });

    // Check and apply restriction after transaction
    await checkAndApplyRestriction(userId);

    logger.info(`No-show recorded for booking ${bookingId}`, {
      userId,
      markedById,
      markedByRole,
    });

    return noShowRecord;
  } catch (error) {
    logger.error('Error recording no-show:', { bookingId, markedById, error });
    throw error;
  }
}

/**
 * Check account restriction status for a user
 * - Fetches user's noShowCount, accountRestricted, restrictedUntil
 * - If restrictedUntil is in the past, auto-lifts restriction
 * - Returns restriction status
 */
export async function checkAccountRestriction(userId: string): Promise<AccountRestrictionResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        noShowCount: true,
        accountRestricted: true,
        restrictedUntil: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if restriction has expired
    if (user.accountRestricted && user.restrictedUntil) {
      const now = new Date();
      if (user.restrictedUntil < now) {
        // Auto-lift restriction
        await prisma.user.update({
          where: { id: userId },
          data: {
            accountRestricted: false,
            restrictedUntil: null,
          },
        });

        logger.info(`Auto-lifted restriction for user ${userId}`, {
          restrictedUntil: user.restrictedUntil,
        });

        return {
          restricted: false,
          noShowCount: user.noShowCount,
        };
      }
    }

    return {
      restricted: user.accountRestricted,
      reason: user.accountRestricted ? 'Account restricted due to excessive no-shows' : undefined,
      restrictedUntil: user.restrictedUntil || undefined,
      noShowCount: user.noShowCount,
    };
  } catch (error) {
    logger.error('Error checking account restriction:', { userId, error });
    throw error;
  }
}

/**
 * Check and apply restriction to a user if they exceed the no-show threshold
 * - Gets no_show_restriction_threshold from getPolicyValue (default "3")
 * - Gets no_show_restriction_days from getPolicyValue (default "30")
 * - If user.noShowCount >= threshold, sets accountRestricted=true, restrictedUntil = now + restriction_days
 */
export async function checkAndApplyRestriction(userId: string): Promise<void> {
  try {
    // Get policy values
    let threshold: number;
    let restrictionDays: number;

    try {
      const thresholdStr = await getPolicyValue('no_show_restriction_threshold');
      threshold = parseInt(thresholdStr, 10);
      if (isNaN(threshold)) {
        threshold = 3;
      }
    } catch {
      threshold = 3;
    }

    try {
      const daysStr = await getPolicyValue('no_show_restriction_days');
      restrictionDays = parseInt(daysStr, 10);
      if (isNaN(restrictionDays)) {
        restrictionDays = 30;
      }
    } catch {
      restrictionDays = 30;
    }

    // Get current user no-show count
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        noShowCount: true,
        accountRestricted: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Apply restriction if threshold is met or exceeded
    if (user.noShowCount >= threshold && !user.accountRestricted) {
      const restrictedUntil = new Date();
      restrictedUntil.setDate(restrictedUntil.getDate() + restrictionDays);

      await prisma.user.update({
        where: { id: userId },
        data: {
          accountRestricted: true,
          restrictedUntil,
        },
      });

      logger.info(`Account restricted for user ${userId}`, {
        noShowCount: user.noShowCount,
        threshold,
        restrictedUntil,
      });
    }
  } catch (error) {
    logger.error('Error checking and applying restriction:', { userId, error });
    throw error;
  }
}

/**
 * Dispute a no-show record
 * - Finds the NoShowRecord, verifies it belongs to a booking owned by userId
 * - Sets disputed=true, disputeReason=reason
 */
export async function disputeNoShow(params: DisputeNoShowParams): Promise<NoShowRecord> {
  const { noShowRecordId, userId, reason } = params;

  try {
    // Find the no-show record with booking details
    const noShowRecord = await prisma.noShowRecord.findUnique({
      where: { id: noShowRecordId },
      include: { booking: true },
    });

    if (!noShowRecord) {
      throw new Error('No-show record not found');
    }

    // Verify the booking belongs to the user
    if (noShowRecord.booking.customerId !== userId) {
      throw new Error('You are not authorized to dispute this no-show record');
    }

    // Update the record with dispute information
    const updatedRecord = await prisma.noShowRecord.update({
      where: { id: noShowRecordId },
      data: {
        disputed: true,
        disputeReason: reason,
      },
    });

    logger.info(`No-show disputed for record ${noShowRecordId}`, {
      userId,
      bookingId: noShowRecord.bookingId,
    });

    return updatedRecord;
  } catch (error) {
    logger.error('Error disputing no-show:', { noShowRecordId, userId, error });
    throw error;
  }
}

/**
 * Resolve a no-show dispute
 * - Updates NoShowRecord: disputeResolvedAt=now, disputeResolution=resolution
 * - If NOT upheld (dispute won by customer): decrements User.noShowCount, sets booking noShowFlag=false, updates booking status back to 'cancelled'
 * - Re-checks restriction after decrement
 */
export async function resolveDispute(params: ResolveDisputeParams): Promise<NoShowRecord> {
  const { noShowRecordId, resolution, upheld } = params;

  try {
    // Get the no-show record with booking details
    const noShowRecord = await prisma.noShowRecord.findUnique({
      where: { id: noShowRecordId },
      include: { booking: true },
    });

    if (!noShowRecord) {
      throw new Error('No-show record not found');
    }

    const userId = noShowRecord.userId;
    const bookingId = noShowRecord.bookingId;

    // Update the record with resolution
    const updatedRecord = await prisma.$transaction(async (tx) => {
      const record = await tx.noShowRecord.update({
        where: { id: noShowRecordId },
        data: {
          disputeResolvedAt: new Date(),
          disputeResolution: resolution,
        },
      });

      // If dispute is NOT upheld (customer won), reverse the no-show
      if (!upheld) {
        // Decrement user's no-show count
        await tx.user.update({
          where: { id: userId },
          data: {
            noShowCount: {
              decrement: 1,
            },
          },
        });

        // Update booking to reverse no-show status
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            noShowFlag: false,
            status: BookingStatus.CANCELLED,
          },
        });
      }

      return record;
    });

    // If dispute was won by customer, re-check restriction
    if (!upheld) {
      await checkAndApplyRestriction(userId);

      logger.info(`No-show dispute resolved in favor of customer for record ${noShowRecordId}`, {
        userId,
        bookingId,
      });
    } else {
      logger.info(`No-show dispute upheld for record ${noShowRecordId}`, {
        userId,
        bookingId,
      });
    }

    return updatedRecord;
  } catch (error) {
    logger.error('Error resolving no-show dispute:', { noShowRecordId, upheld, error });
    throw error;
  }
}

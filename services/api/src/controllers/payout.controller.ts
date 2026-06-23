import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import * as payoutService from '../services/payout.service';
import * as notificationService from '../services/notification.service';
import * as pushService from '../services/pushNotification.service';
import {
  getActivePaymentGateway,
  payoutViaPaystack,
  detectMomoProviderFromPhone,
} from '../services/escrow.service';
import { initiateHubtelPayout, getHubtelChannel } from '../services/payout.service';
import prisma from '../config/database';
import logger from '../config/logger';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

// Validation schemas
const setupPayoutAccountSchema = z.object({
  payoutType: z.enum(['bank', 'mobile_money']),
  // Bank account fields
  bankCode: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  // Mobile money fields
  momoProvider: z.enum(['mtn', 'vodafone', 'airteltigo']).optional(),
  momoNumber: z.string().optional(),
}).refine((data) => {
  if (data.payoutType === 'bank') {
    return !!data.bankCode && !!data.bankAccountNumber && !!data.bankAccountName;
  }
  if (data.payoutType === 'mobile_money') {
    return !!data.momoProvider && !!data.momoNumber;
  }
  return false;
}, {
  message: 'Invalid payout account data for selected type',
});

/**
 * Setup or update payout account for a salon
 * POST /salons/:id/payout-account
 */
export async function setupPayoutAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id: salonId } = req.params;
    
    // Validate request body
    const validatedData = setupPayoutAccountSchema.parse(req.body);

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { ownerId: true, businessName: true },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    // Check ownership - only salon owner or admin can setup payout
    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'You do not have permission to manage payout settings for this salon', 403);
      return;
    }

    // Setup payout account
    const payoutAccount = await payoutService.setupPayoutAccount(salonId, validatedData);

    successResponse(res, {
      message: 'Payout account setup successfully',
      payoutAccount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'SETUP_FAILED', (error as Error).message, 400);
  }
}

/**
 * Get current payout account details for a salon
 * GET /salons/:id/payout-account
 */
export async function getPayoutAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id: salonId } = req.params;

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { ownerId: true },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    // Check ownership - only salon owner or admin can view payout settings
    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'You do not have permission to view payout settings for this salon', 403);
      return;
    }

    const payoutAccount = await payoutService.getPayoutAccount(salonId);

    if (!payoutAccount) {
      errorResponse(res, 'NOT_FOUND', 'Payout account not found', 404);
      return;
    }

    successResponse(res, payoutAccount);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get supported banks list
 * GET /payouts/banks
 */
export function getSupportedBanks(req: Request, res: Response): void {
  try {
    const banks = payoutService.getSupportedBanks();
    successResponse(res, { banks });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get supported mobile money providers
 * GET /payouts/momo-providers
 */
export function getSupportedMomoProviders(req: Request, res: Response): void {
  try {
    const providers = payoutService.getSupportedMomoProviders();
    successResponse(res, { providers });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get payout balance summary for a salon
 * GET /salons/:id/payout-balance
 */
export async function getPayoutBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id: salonId } = req.params;

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { ownerId: true },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    // Check ownership
    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'You do not have permission to view payout balance for this salon', 403);
      return;
    }

    // Calculate payout balances from escrow accounts
    const [
      heldResult,
      releasedResult,
      refundedResult,
    ] = await Promise.all([
      // Money held in escrow (not yet paid out)
      prisma.escrowAccount.aggregate({
        where: {
          salonId,
          status: 'held',
        },
        _sum: { providerAmount: true },
        _count: true,
      }),
      // Money already paid out
      prisma.escrowAccount.aggregate({
        where: {
          salonId,
          status: 'released',
        },
        _sum: { providerAmount: true },
        _count: true,
      }),
      // Refunded amount
      prisma.escrowAccount.aggregate({
        where: {
          salonId,
          status: 'refunded',
        },
        _sum: { amountHeld: true },
        _count: true,
      }),
    ]);

    // Total revenue from successful payments
    const totalRevenueResult = await prisma.payment.aggregate({
      where: {
        booking: { salonId },
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });

    const availableBalance = Number(heldResult._sum.providerAmount || 0);
    const paidOutBalance = Number(releasedResult._sum.providerAmount || 0);
    const refundedBalance = Number(refundedResult._sum.amountHeld || 0);
    const totalRevenue = Number(totalRevenueResult._sum.amount || 0);

    successResponse(res, {
      availableBalance,     // Money in escrow waiting to be paid out
      paidOutBalance,       // Money already paid out to salon
      refundedBalance,      // Money refunded to customers
      totalRevenue,         // Total revenue from all successful payments
      heldCount: heldResult._count,
      releasedCount: releasedResult._count,
      refundedCount: refundedResult._count,
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Request a manual payout of available balance to partner's MoMo
 * POST /salons/:id/request-payout
 */
export async function requestPayout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id: salonId } = req.params;
    const { amount } = req.body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      errorResponse(res, 'VALIDATION_ERROR', 'Amount must be a positive number', 400);
      return;
    }

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        ownerId: true,
        businessName: true,
        momoNumber: true,
        momoProvider: true,
      },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'You do not have permission to request payouts for this salon', 403);
      return;
    }

    // Verify MoMo is configured
    if (!salon.momoNumber || !salon.momoProvider) {
      errorResponse(
        res,
        'PAYOUT_ACCOUNT_MISSING',
        'Please set up your Mobile Money payout account in Salon Settings before requesting a payout.',
        400
      );
      return;
    }

    // Calculate available balance from held escrows
    const heldResult = await prisma.escrowAccount.aggregate({
      where: { salonId, status: 'held' },
      _sum: { providerAmount: true },
    });

    const availableBalance = Number(heldResult._sum.providerAmount || 0);

    if (amount > availableBalance) {
      errorResponse(
        res,
        'INSUFFICIENT_BALANCE',
        `Insufficient balance. Your available balance is GH₵${availableBalance.toFixed(2)}`,
        400
      );
      return;
    }

    // Find held escrows for this salon, sort by oldest first
    const heldEscrows = await prisma.escrowAccount.findMany({
      where: { salonId, status: 'held' },
      orderBy: { createdAt: 'asc' },
      include: {
        booking: {
          select: {
            reference: true,
            service: { select: { name: true } },
          },
        },
      },
    });

    // Route payout through the active payment gateway (admin-configured)
    const activeGateway = await getActivePaymentGateway();
    const payoutReference = `GROOMLINK-MANUAL-PAYOUT-${salonId.slice(0, 8)}-${Date.now()}`;
    let payoutRef: string | undefined;
    let payoutGateway = 'unknown';

    // Try Hubtel if admin set it as active gateway
    if (activeGateway === 'hubtel') {
      try {
        const payoutResult = await initiateHubtelPayout({
          recipientPhone: salon.momoNumber,
          recipientName: salon.businessName,
          amount,
          channel: getHubtelChannel(salon.momoProvider),
          reference: payoutReference,
          description: `Manual payout request - ${salon.businessName}`,
        });
        payoutRef = payoutResult?.Data?.ClientReference || payoutReference;
        payoutGateway = 'hubtel';
        logger.info(`Hubtel manual payout initiated for salon ${salonId}`, {
          amount,
          payoutRef,
        });
      } catch (hubtelError: any) {
        logger.warn('Hubtel manual payout failed, falling back to Paystack', {
          salonId,
          error: hubtelError.message,
        });
        // Fall through to Paystack fallback
      }
    }

    // Try Paystack (when active gateway is paystack, or as Hubtel fallback)
    if (!payoutRef) {
      const detectedProvider = detectMomoProviderFromPhone(salon.momoNumber);
      const psRef = await payoutViaPaystack({
        recipientPhone: salon.momoNumber,
        recipientName: salon.businessName,
        amount,
        momoProvider: detectedProvider,
        reference: payoutReference,
        description: `Manual payout request - ${salon.businessName}`,
      });
      if (psRef) {
        payoutRef = psRef;
        payoutGateway = 'paystack';
      }
    }

    if (!payoutRef) {
      // Payout failed - notify partner
      pushService.pushPayoutFailed(
        req.user.id,
        amount,
        'Please contact support if this persists.'
      ).catch((err) => logger.error('Failed to send payout failed notification', { err }));

      errorResponse(
        res,
        'PAYOUT_FAILED',
        `Failed to transfer funds via ${activeGateway} or Paystack. Please try again or contact support.`,
        500
      );
      return;
    }

    // Payout succeeded - mark escrows as released (oldest first until amount is covered)
    let remainingAmount = amount;
    const releasedEscrowIds: string[] = [];

    for (const escrow of heldEscrows) {
      if (remainingAmount <= 0) break;

      const escrowProviderAmount = Number(escrow.providerAmount);
      const amountToRelease = Math.min(escrowProviderAmount, remainingAmount);

      // Calculate commission for this escrow if not already set
      const amountHeld = Number(escrow.amountHeld);
      const bookingFee = Number(escrow.bookingFee || 0);
      const servicePrice = amountHeld - bookingFee;
      const commission = Number(escrow.commission || servicePrice * 0.05);

      await prisma.$transaction(async (tx) => {
        await tx.escrowAccount.update({
          where: { id: escrow.id },
          data: {
            status: 'released',
            releasedAt: new Date(),
            commission: commission,
            payoutGateway: payoutGateway,
          },
        });

        await tx.escrowTransaction.create({
          data: {
            escrowId: escrow.id,
            transactionType: 'release',
            amount: amountToRelease,
            previousBalance: escrowProviderAmount,
            newBalance: 0,
          },
        });
      });

      releasedEscrowIds.push(escrow.id);
      remainingAmount -= amountToRelease;
    }

    // Send push notification for successful payout
    pushService.pushPayoutSent(
      req.user.id,
      amount,
      salon.momoProvider
    ).catch((err) => logger.error('Failed to send payout sent notification', { err }));

    // Create in-app notification
    notificationService.createNotification({
      userId: req.user.id,
      type: 'PAYMENT_RECEIVED',
      title: 'Payout Sent',
      message: `GH₵${amount.toFixed(2)} has been sent to your ${salon.momoProvider.toUpperCase()} MoMo.`,
      data: { type: 'payout_sent', amount, gateway: payoutGateway, reference: payoutRef },
    }).catch((err) => logger.error('Failed to create payout notification', { err }));

    logger.info(`Manual payout processed for salon ${salonId}`, {
      amount,
      gateway: payoutGateway,
      reference: payoutRef,
      escrowsReleased: releasedEscrowIds.length,
    });

    successResponse(res, {
      message: `GH₵${amount.toFixed(2)} has been sent to your ${salon.momoProvider.toUpperCase()} MoMo`,
      payoutReference: payoutRef,
      gateway: payoutGateway,
      amount,
      escrowsReleased: releasedEscrowIds.length,
    });
  } catch (error) {
    logger.error('Request payout error:', { error, salonId: req.params.id });
    errorResponse(res, 'PAYOUT_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get payout history for a salon
 * GET /salons/:id/payout-history
 */
export async function getPayoutHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id: salonId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { ownerId: true, momoNumber: true },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'You do not have permission to view payout history for this salon', 403);
      return;
    }

    // Get released escrows (payout history) with pagination
    const [payouts, totalCount, summaryStats, monthlyStats] = await Promise.all([
      prisma.escrowAccount.findMany({
        where: { salonId, status: 'released' },
        orderBy: { releasedAt: 'desc' },
        skip,
        take: limit,
        include: {
          booking: {
            select: {
              reference: true,
              date: true,
              service: { select: { name: true } },
              customer: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.escrowAccount.count({
        where: { salonId, status: 'released' },
      }),
      // All-time summary
      prisma.escrowAccount.aggregate({
        where: { salonId, status: 'released' },
        _sum: { providerAmount: true, commission: true, platformFee: true },
      }),
      // This month's earnings
      prisma.escrowAccount.aggregate({
        where: {
          salonId,
          status: 'released',
          releasedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { providerAmount: true, commission: true },
        _count: true,
      }),
    ]);

    // Mask MoMo number for display
    const maskedMomo = salon.momoNumber
      ? `${salon.momoNumber.slice(0, 4)}****${salon.momoNumber.slice(-3)}`
      : null;

    // Format payouts for response
    const formattedPayouts = payouts.map((p) => ({
      id: p.id,
      date: p.releasedAt || p.updatedAt,
      amountPaid: Number(p.providerAmount || 0),
      commission: Number(p.commission || 0),
      netReceived: Number(p.providerAmount || 0),
      bookingReference: p.booking.reference,
      serviceName: p.booking.service?.name || 'Service',
      customerName: `${p.booking.customer?.firstName || ''} ${p.booking.customer?.lastName || ''}`.trim(),
      gateway: p.payoutGateway || 'unknown',
      status: 'sent',
      momoNumber: maskedMomo,
    }));

    successResponse(res, {
      payouts: formattedPayouts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalPaidOut: Number(summaryStats._sum.providerAmount || 0),
        totalCommission: Number(summaryStats._sum.commission || 0),
        totalPlatformFees: Number(summaryStats._sum.platformFee || 0),
        totalPayouts: totalCount,
      },
      thisMonth: {
        earned: Number(monthlyStats._sum.providerAmount || 0),
        commission: Number(monthlyStats._sum.commission || 0),
        payoutCount: monthlyStats._count,
      },
    });
  } catch (error) {
    logger.error('Get payout history error:', { error, salonId: req.params.id });
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import * as payoutService from '../services/payout.service';
import prisma from '../config/database';
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

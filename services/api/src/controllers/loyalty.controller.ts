import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import * as loyaltyService from '../services/loyalty.service';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

const redeemPointsSchema = z.object({
  points: z.number().int().positive('Points must be a positive integer'),
  bookingId: z.string().optional(),
});

/**
 * GET /api/loyalty
 * Get the authenticated customer's loyalty account (create if doesn't exist)
 */
export async function getLoyaltyAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const account = await loyaltyService.getOrCreateAccount(req.user.id);
    successResponse(res, account);
  } catch (error) {
    errorResponse(res, 'LOYALTY_ERROR', (error as Error).message, 500);
  }
}

/**
 * GET /api/loyalty/transactions
 * Get paginated loyalty transaction history
 */
export async function getLoyaltyTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { transactions, total } = await loyaltyService.getTransactions(
      req.user.id,
      page,
      limit
    );

    paginatedResponse(res, transactions, page, limit, total);
  } catch (error) {
    errorResponse(res, 'LOYALTY_ERROR', (error as Error).message, 500);
  }
}

/**
 * POST /api/loyalty/redeem
 * Redeem loyalty points
 */
export async function redeemPoints(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const data = redeemPointsSchema.parse(req.body);
    const result = await loyaltyService.redeemPoints(
      req.user.id,
      data.points,
      data.bookingId
    );

    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }

    const message = (error as Error).message;
    if (message === 'Insufficient points') {
      errorResponse(res, 'INSUFFICIENT_POINTS', message, 400);
      return;
    }

    if (message === 'Loyalty account not found') {
      errorResponse(res, 'NOT_FOUND', message, 404);
      return;
    }

    errorResponse(res, 'LOYALTY_ERROR', message, 500);
  }
}

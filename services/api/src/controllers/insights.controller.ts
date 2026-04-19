import { Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';
import * as insightsService from '../services/insights.service';

// Validation schemas
const periodSchema = z.enum(['daily', 'weekly', 'monthly']);

/**
 * Verify that the user owns the salon
 */
async function verifySalonOwnership(salonId: string, ownerId: string): Promise<boolean> {
  const salon = await prisma.salon.findFirst({
    where: { id: salonId, ownerId },
  });
  return salon !== null;
}

/**
 * Get the salon ID for the authenticated user
 * Assumes the user is a salon owner and has only one salon
 * If multiple salons, returns the first one
 */
async function getSalonIdForOwner(userId: string): Promise<string | null> {
  const salon = await prisma.salon.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
  return salon?.id || null;
}

/**
 * GET /api/insights/peak-hours
 * Get peak hours analytics for the salon
 */
export async function getPeakHours(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salonId = await getSalonIdForOwner(req.user.id);
    if (!salonId) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    const data = await insightsService.getPeakHours(salonId);
    successResponse(res, data);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/insights/pricing
 * Get pricing insights comparing salon's prices with city average
 */
export async function getPricingInsights(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salonId = await getSalonIdForOwner(req.user.id);
    if (!salonId) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    const data = await insightsService.getPricingInsights(salonId);
    successResponse(res, data);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/insights/staff-performance
 * Get staff performance metrics
 */
export async function getStaffPerformance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salonId = await getSalonIdForOwner(req.user.id);
    if (!salonId) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    const data = await insightsService.getStaffPerformance(salonId);
    successResponse(res, data);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/insights/loyalty-metrics
 * Get loyalty metrics including repeat customers and at-risk customers
 */
export async function getLoyaltyMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salonId = await getSalonIdForOwner(req.user.id);
    if (!salonId) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    const data = await insightsService.getLoyaltyMetrics(salonId);
    successResponse(res, data);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/insights/revenue
 * Get revenue aggregated by period for charts
 * Query param: period (daily, weekly, monthly)
 */
export async function getRevenue(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salonId = await getSalonIdForOwner(req.user.id);
    if (!salonId) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    // Validate period parameter
    const periodParam = (req.query.period as string) || 'daily';
    const periodResult = periodSchema.safeParse(periodParam);

    if (!periodResult.success) {
      errorResponse(res, 'VALIDATION_ERROR', 'Invalid period. Must be daily, weekly, or monthly', 400);
      return;
    }

    const data = await insightsService.getRevenue(salonId, periodResult.data);
    successResponse(res, data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

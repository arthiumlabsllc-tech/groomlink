import { Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import * as adminSubscriptionService from '../services/admin-subscription.service';
import logger from '../config/logger';

/**
 * GET /api/admin/subscriptions/overview
 * Dashboard stats for the subscription overview page
 */
export async function getOverviewHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const stats = await adminSubscriptionService.getOverview();
    successResponse(res, stats);
  } catch (error) {
    logger.error('Admin subscription overview failed:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/admin/subscriptions?page&limit&status
 * Paginated list of salon subscriptions
 */
export async function getSubscriptionsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 20);
    const status = req.query.status as string | undefined;

    const result = await adminSubscriptionService.getSubscriptions(page, limit, status || undefined);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error('Admin subscriptions list failed:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/admin/subscriptions/plans
 * All plans (including inactive) for the plans management page
 */
export async function getPlansHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const plans = await adminSubscriptionService.getAllPlans(true);
    successResponse(res, plans);
  } catch (error) {
    logger.error('Admin plans list failed:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * POST /api/admin/subscriptions/plans
 * Create a new plan
 */
export async function createPlanHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, slug, description, monthlyPrice, yearlyPrice, platformFeePercent, maxStaff, maxLocations, features } = req.body;

    if (!name || !slug) {
      errorResponse(res, 'VALIDATION_ERROR', 'name and slug are required', 400);
      return;
    }

    const plan = await adminSubscriptionService.createPlan({
      name,
      slug,
      description,
      monthlyPrice: Number(monthlyPrice) || 0,
      yearlyPrice: Number(yearlyPrice) || 0,
      platformFeePercent: Number(platformFeePercent) || 0,
      maxStaff: parseInt(maxStaff, 10) || 1,
      maxLocations: parseInt(maxLocations, 10) || 1,
      features: Array.isArray(features) ? features : [],
    });
    successResponse(res, plan, 201);
  } catch (error) {
    logger.error('Admin create plan failed:', error);
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 400);
  }
}

/**
 * PUT /api/admin/subscriptions/plans/:planId
 * Update an existing plan
 */
export async function updatePlanHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { planId } = req.params;
    const { name, description, monthlyPrice, yearlyPrice, platformFeePercent, maxStaff, maxLocations, features, isActive } = req.body;

    const plan = await adminSubscriptionService.updatePlan(planId, {
      name,
      description,
      monthlyPrice: monthlyPrice !== undefined ? Number(monthlyPrice) : undefined,
      yearlyPrice: yearlyPrice !== undefined ? Number(yearlyPrice) : undefined,
      platformFeePercent: platformFeePercent !== undefined ? Number(platformFeePercent) : undefined,
      maxStaff: maxStaff !== undefined ? parseInt(maxStaff, 10) : undefined,
      maxLocations: maxLocations !== undefined ? parseInt(maxLocations, 10) : undefined,
      features: Array.isArray(features) ? features : undefined,
      isActive: typeof isActive === 'boolean' ? isActive : undefined,
    });
    successResponse(res, plan);
  } catch (error) {
    logger.error('Admin update plan failed:', error);
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 400);
  }
}

/**
 * POST /api/admin/subscriptions/assign
 * Manually assign a plan to a salon (free grant)
 */
export async function assignPlanHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { salonId, planSlug } = req.body;
    if (!salonId || !planSlug) {
      errorResponse(res, 'VALIDATION_ERROR', 'salonId and planSlug are required', 400);
      return;
    }
    const subscription = await adminSubscriptionService.assignPlanToSalon(salonId, planSlug);
    successResponse(res, subscription);
  } catch (error) {
    logger.error('Admin assign plan failed:', error);
    errorResponse(res, 'ASSIGN_FAILED', (error as Error).message, 400);
  }
}

/**
 * GET /api/admin/subscriptions/invoices
 * Paginated invoices with filters
 */
export async function getInvoicesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 20);
    const { status, startDate, endDate, planSlug } = req.query as Record<string, string | undefined>;

    const result = await adminSubscriptionService.getInvoices(
      page,
      limit,
      status || undefined,
      startDate || undefined,
      endDate || undefined,
      planSlug || undefined
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error('Admin invoices list failed:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/admin/subscriptions/recent
 * Last 10 subscription changes
 */
export async function getRecentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const recent = await adminSubscriptionService.getRecentSubscriptions(10);
    successResponse(res, recent);
  } catch (error) {
    logger.error('Admin recent subscriptions failed:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/admin/subscriptions/expiring-soon
 * Subscriptions expiring in the next 7 days
 */
export async function getExpiringSoonHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const expiring = await adminSubscriptionService.getExpiringSoonSubscriptions(7);
    successResponse(res, expiring);
  } catch (error) {
    logger.error('Admin expiring subscriptions failed:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/admin/subscriptions/salon/:salonId
 * Current subscription for a salon
 */
export async function getSalonSubscriptionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const subscription = await adminSubscriptionService.getSalonSubscription(req.params.salonId);
    successResponse(res, subscription);
  } catch (error) {
    logger.error('Admin salon subscription fetch failed:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * POST /api/admin/subscriptions/salon/:salonId/extend
 * Extend a salon subscription by N days
 */
export async function extendSubscriptionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const days = parseInt(req.body.days, 10);
    if (!days || days <= 0 || days > 365) {
      errorResponse(res, 'VALIDATION_ERROR', 'days must be between 1 and 365', 400);
      return;
    }
    const subscription = await adminSubscriptionService.extendSubscription(req.params.salonId, days);
    successResponse(res, subscription);
  } catch (error) {
    logger.error('Admin extend subscription failed:', error);
    errorResponse(res, 'EXTEND_FAILED', (error as Error).message, 400);
  }
}

/**
 * GET /api/admin/subscriptions/salon/:salonId/invoices
 * Invoices for a specific salon
 */
export async function getSalonInvoicesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const invoices = await adminSubscriptionService.getSalonInvoices(req.params.salonId);
    successResponse(res, invoices);
  } catch (error) {
    logger.error('Admin salon invoices fetch failed:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

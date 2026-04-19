import { Response, Request } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import * as subscriptionService from '../services/subscription.service';
import prisma from '../config/database';
import logger from '../config/logger';
import crypto from 'crypto';

/**
 * GET /api/subscription/plans — PUBLIC
 * Get all active subscription plans
 */
export async function getPlans(req: Request, res: Response): Promise<void> {
  try {
    const plans = await subscriptionService.getPlans();
    successResponse(res, plans);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/subscription/status — SALON_OWNER authenticated
 * Get the current subscription status for the authenticated salon owner
 */
export async function getSubscriptionStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    const status = await subscriptionService.getSubscriptionStatus(salon.id);
    successResponse(res, status);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * POST /api/subscription/subscribe — SALON_OWNER authenticated
 * Subscribe the salon to a plan
 */
export async function subscribeToPlanHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    const { planSlug, billingPeriod } = req.body;

    if (!planSlug || !billingPeriod) {
      errorResponse(res, 'VALIDATION_ERROR', 'planSlug and billingPeriod are required', 400);
      return;
    }

    const result = await subscriptionService.subscribeToPlan(salon.id, planSlug, billingPeriod, req.user);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 'SUBSCRIBE_FAILED', (error as Error).message, 500);
  }
}

/**
 * POST /api/subscription/cancel — SALON_OWNER authenticated
 * Cancel the salon's active subscription
 */
export async function cancelSubscriptionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    const { cancelImmediately } = req.body;
    const result = await subscriptionService.cancelSubscription(salon.id, cancelImmediately);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 'CANCEL_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/subscription/invoices — SALON_OWNER authenticated
 * Get invoices for the salon's subscription
 */
export async function getInvoicesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    const invoices = await prisma.subscriptionInvoice.findMany({
      where: { salonId: salon.id },
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, invoices);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/subscription/check-feature — authenticated
 * Check if the salon has access to a specific feature
 */
export async function checkFeatureHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const salon = await prisma.salon.findFirst({ where: { ownerId: req.user.id } });
    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
      return;
    }

    const featureName = req.query.feature as string;
    if (!featureName) {
      errorResponse(res, 'VALIDATION_ERROR', 'feature query parameter is required', 400);
      return;
    }

    const hasFeature = await subscriptionService.checkFeatureAccess(salon.id, featureName);
    successResponse(res, { hasFeature });
  } catch (error) {
    errorResponse(res, 'CHECK_FAILED', (error as Error).message, 500);
  }
}

/**
 * POST /api/webhooks/hubtel/subscription — PUBLIC (webhook)
 * Handle Hubtel subscription payment webhook
 */
export async function handleSubscriptionWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body;

    // Verify HMAC-SHA512 signature if present
    const signature = req.headers['x-hubtel-signature'] as string | undefined;
    if (signature) {
      const secret = process.env.HUBTEL_API_SECRET;
      if (secret) {
        const expectedSignature = crypto
          .createHmac('sha512', secret)
          .update(JSON.stringify(payload))
          .digest('hex');

        if (signature !== expectedSignature) {
          logger.warn('Hubtel subscription webhook: invalid signature');
          res.status(200).json({ received: true, processed: false });
          return;
        }
      }
    }

    // Extract reference and status from body
    const responseCode = payload?.ResponseCode;
    const data = payload?.Data;
    const reference = data?.ClientReference || payload?.ClientReference;

    logger.info('Hubtel subscription webhook received', {
      responseCode,
      clientReference: reference,
      transactionId: data?.TransactionId,
    });

    // If success (ResponseCode "0000"), activate the subscription
    if (responseCode === '0000' && reference) {
      await subscriptionService.activateSubscription(reference);
    }

    // Always respond 200 to acknowledge
    res.status(200).json({ received: true, processed: true });
  } catch (error) {
    logger.error('Hubtel subscription webhook error:', error);
    // Still return 200 to prevent retries
    res.status(200).json({ received: true, processed: false });
  }
}

import { Response, Request } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import * as sponsorshipService from '../services/sponsorship.service';
import prisma from '../config/database';
import logger from '../config/logger';

// Validation schemas
const addSponsoredSalonSchema = z.object({
  salonId: z.string().uuid(),
  durationHours: z.number().int().min(1).max(8760), // Max 1 year
  endTime: z.string().datetime().optional(),
  amountPaid: z.number().min(0).optional(),
  packageId: z.string().uuid().optional(),
});

const removeSponsoredSalonSchema = z.object({
  id: z.string().uuid(),
});

const purchaseSponsorshipSchema = z.object({
  packageId: z.string().uuid(),
});

const resumePaymentSchema = z.object({
  sponsoredSalonId: z.string().uuid(),
});

/**
 * Add a sponsored salon
 * POST /admin/sponsored-salons
 */
export async function addSponsoredSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const validation = addSponsoredSalonSchema.safeParse(req.body);
    
    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.errors[0].message, 400);
      return;
    }

    const { salonId, durationHours, endTime, amountPaid, packageId } = validation.data;
    const adminId = req.user?.id;

    const sponsoredSalon = await sponsorshipService.addSponsoredSalon({
      salonId,
      durationHours,
      endTime: endTime ? new Date(endTime) : undefined,
      amountPaid,
      packageId,
      adminId,
    });

    successResponse(res, sponsoredSalon, 201);
  } catch (error) {
    logger.error('Error adding sponsored salon:', error);
    errorResponse(res, 'ADD_FAILED', (error as Error).message, 500);
  }
}

/**
 * Remove a sponsored salon
 * DELETE /admin/sponsored-salons/:id
 */
export async function removeSponsoredSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const validation = removeSponsoredSalonSchema.safeParse({ id });
    
    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', 'Invalid sponsorship ID', 400);
      return;
    }

    const sponsoredSalon = await sponsorshipService.removeSponsoredSalon(id);

    successResponse(res, sponsoredSalon);
  } catch (error) {
    logger.error('Error removing sponsored salon:', error);
    errorResponse(res, 'REMOVE_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get sponsored salons (paginated, with optional status filter)
 * GET /admin/sponsored-salons?page=&limit=&status=active|expired
 */
export async function getSponsoredSalons(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(parseInt((req.query.page as string) || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10) || 20, 1), 100);
    const statusParam = (req.query.status as string | undefined)?.toLowerCase();
    const status = statusParam === 'active' || statusParam === 'expired' ? statusParam : undefined;

    const { data, total } = await sponsorshipService.getSponsoredSalons(page, limit, status);

    paginatedResponse(res, data, page, limit, total);
  } catch (error) {
    logger.error('Error getting sponsored salons:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get all active sponsorship packages
 * GET /admin/sponsorship-packages
 */
export async function getPackages(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const packages = await sponsorshipService.getPackages();

    successResponse(res, packages);
  } catch (error) {
    logger.error('Error getting sponsorship packages:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Resolve the authenticated salon owner's salon
 */
async function resolveOwnerSalon(req: AuthenticatedRequest, res: Response): Promise<{ id: string; ownerId: string; phoneNumber: string | null } | null> {
  if (!req.user) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return null;
  }

  const salon = await prisma.salon.findFirst({
    where: { ownerId: req.user.id },
    select: { id: true, ownerId: true, phoneNumber: true },
  });

  if (!salon) {
    errorResponse(res, 'NOT_FOUND', 'No salon found for this user', 404);
    return null;
  }

  return salon;
}

/**
 * Get active sponsorship packages for salon owners
 * GET /sponsorship/packages
 */
export async function getPackagesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const salon = await resolveOwnerSalon(req, res);
    if (!salon) return;

    const packages = await sponsorshipService.getPackages();
    successResponse(res, packages);
  } catch (error) {
    logger.error('Error getting sponsorship packages:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get the sponsorship status for the authenticated salon owner
 * GET /sponsorship/status
 */
export async function getSponsorshipStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const salon = await resolveOwnerSalon(req, res);
    if (!salon) return;

    const status = await sponsorshipService.getSponsorshipStatus(salon.id);
    successResponse(res, status);
  } catch (error) {
    logger.error('Error getting sponsorship status:', error);
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Purchase a sponsorship package (initiates Hubtel checkout)
 * POST /sponsorship/purchase
 */
export async function purchaseSponsorshipHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const salon = await resolveOwnerSalon(req, res);
    if (!salon) return;

    const validation = purchaseSponsorshipSchema.safeParse(req.body);
    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.errors[0].message, 400);
      return;
    }

    const result = await sponsorshipService.purchaseSponsorship(salon.id, validation.data.packageId, req.user!);
    successResponse(res, result, 201);
  } catch (error) {
    logger.error('Error purchasing sponsorship:', error);
    errorResponse(res, 'PURCHASE_FAILED', (error as Error).message, 500);
  }
}

/**
 * Resume payment for a pending sponsorship order
 * POST /sponsorship/resume-payment
 */
export async function resumePaymentHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const salon = await resolveOwnerSalon(req, res);
    if (!salon) return;

    const validation = resumePaymentSchema.safeParse(req.body);
    if (!validation.success) {
      errorResponse(res, 'VALIDATION_ERROR', validation.error.errors[0].message, 400);
      return;
    }

    const result = await sponsorshipService.resumeSponsorshipPayment(validation.data.sponsoredSalonId, salon.id);
    successResponse(res, result);
  } catch (error) {
    logger.error('Error resuming sponsorship payment:', error);
    errorResponse(res, 'RESUME_FAILED', (error as Error).message, 500);
  }
}

/**
 * Hubtel webhook for sponsorship payments
 * POST /sponsorship/webhook/hubtel - PUBLIC
 */
export async function handleSponsorshipWebhook(req: Request, res: Response): Promise<void> {
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
          logger.warn('Hubtel sponsorship webhook: invalid signature');
          try {
            const { recordBadWebhookSignature } = await import('../services/security-alert.service');
            recordBadWebhookSignature({ provider: 'Hubtel', reason: 'HMAC mismatch', req }).catch(() => undefined);
          } catch (_) { /* ignore */ }
          res.status(200).json({ received: true, processed: false });
          return;
        }
      }
    }

    // Extract reference and status from body
    const responseCode = payload?.ResponseCode;
    const data = payload?.Data;
    const reference = data?.ClientReference || payload?.ClientReference;

    logger.info('Hubtel sponsorship webhook received', {
      responseCode,
      clientReference: reference,
      transactionId: data?.TransactionId,
    });

    // If success (ResponseCode "0000"), activate the sponsorship
    if (responseCode === '0000' && reference) {
      await sponsorshipService.activateSponsoredSalon(reference);
    }

    // Always respond 200 to acknowledge
    res.status(200).json({ received: true, processed: true });
  } catch (error) {
    logger.error('Hubtel sponsorship webhook error:', error);
    // Still return 200 to prevent retries
    res.status(200).json({ received: true, processed: false });
  }
}

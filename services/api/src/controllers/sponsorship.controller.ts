import { Response } from 'express';
import { z } from 'zod';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import * as sponsorshipService from '../services/sponsorship.service';
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

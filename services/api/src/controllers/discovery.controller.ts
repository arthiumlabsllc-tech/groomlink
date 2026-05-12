import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import * as discoveryService from '../services/discovery.service';
import prisma from '../config/database';
import { z } from 'zod';

/**
 * GET /api/discover/new-salons
 * Public- Get salons joined in the last 30 days
 */
export async function getNewSalons(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const salons = await discoveryService.getNewSalons(limit);
    successResponse(res, salons);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/discover/by-city/:city
 * Public- Get salons filtered by city
 */
export async function getSalonsByCity(req: Request, res: Response): Promise<void> {
  try {
    const { city } = req.params;
    if (!city) {
      errorResponse(res, 'VALIDATION_ERROR', 'City parameter is required', 400);
      return;
    }
    const salons = await discoveryService.getSalonsByCity(city);
    successResponse(res, salons);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/discover/cities
 * Public- Get distinct cities with salon counts
 */
export async function getCities(req: Request, res: Response): Promise<void> {
  try {
    const cities = await discoveryService.getCitiesWithCounts();
    successResponse(res, cities);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/discover/bookings-today
 * Public- Get today's booking count (live counter)
 */
export async function getBookingsToday(req: Request, res: Response): Promise<void> {
  try {
    const count = await discoveryService.getBookingsToday();
    successResponse(res, { count });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/discover/branded-page/my?salonId=xxx
 * Auth required, salon owner only- Get own branded page (includes unpublished)
 */
export async function getMyBrandedPage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (req.user.role !== 'SALON_OWNER' && req.user.role !== 'ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'Only salon owners can access branded pages', 403);
      return;
    }

    const { salonId } = req.query;
    if (!salonId || typeof salonId !== 'string') {
      errorResponse(res, 'VALIDATION_ERROR', 'salonId query parameter is required', 400);
      return;
    }

    // Verify that the authenticated user owns this salon
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { ownerId: true },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const brandedPage = await discoveryService.getMyBrandedPage(salonId);
    successResponse(res, brandedPage);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * GET /api/discover/branded-page/:slug
 * Public- Get branded page by slug
 */
export async function getBrandedPage(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    if (!slug) {
      errorResponse(res, 'VALIDATION_ERROR', 'Slug parameter is required', 400);
      return;
    }

    const brandedPage = await discoveryService.getBrandedPage(slug);

    if (!brandedPage) {
      errorResponse(res, 'NOT_FOUND', 'Branded page not found or not published', 404);
      return;
    }

    successResponse(res, brandedPage);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

const upsertBrandedPageSchema = z.object({
  salonId: z.string().uuid('Salon ID must be a valid UUID'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
  tagline: z.string().max(200, 'Tagline must be 200 characters or less').optional(),
  logoUrl: z.string().url('Must be a valid URL').optional(),
  isPublished: z.boolean().optional(),
  slug: z.string().min(2, 'Slug must be at least 2 characters').max(100, 'Slug must be 100 characters or less').optional(),
});

/**
 * PUT /api/discover/branded-page
 * Auth required, salon owner only- Create or update branded page
 */
export async function updateBrandedPage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    // Only salon owners can manage branded pages
    if (req.user.role !== 'SALON_OWNER' && req.user.role !== 'ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'Only salon owners can manage branded pages', 403);
      return;
    }

    const validatedData = upsertBrandedPageSchema.parse(req.body);
    const { salonId, ...pageData } = validatedData;

    // Verify that the authenticated user owns this salon
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { ownerId: true },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const brandedPage = await discoveryService.upsertBrandedPage(salonId, pageData);
    successResponse(res, brandedPage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 400);
  }
}

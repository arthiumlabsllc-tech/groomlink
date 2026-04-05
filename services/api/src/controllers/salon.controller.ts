import { Request, Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import * as salonService from '../services/salon.service';
import { AuthenticatedRequest } from '../types';
import { SalonType } from '@prisma/client';
import { z } from 'zod';

const createSalonSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(SalonType),
  phoneNumber: z.string(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string(),
  city: z.string(),
  region: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  workingDays: z.array(z.string()),
  hasParking: z.boolean().optional(),
  hasWifi: z.boolean().optional(),
  hasAC: z.boolean().optional(),
  acceptsWalkIns: z.boolean().optional(),
});

const updateSalonSchema = createSalonSchema.partial();

export async function getSalons(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const filters = {
      type: req.query.type as SalonType,
      city: req.query.city as string,
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      latitude: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      longitude: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
      radius: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
      search: req.query.search as string,
    };

    const { salons, total } = await salonService.getSalons(filters, page, limit);
    paginatedResponse(res, salons, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getNearbySalons(req: Request, res: Response): Promise<void> {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 10; // Default 10km
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (isNaN(lat) || isNaN(lng)) {
      errorResponse(res, 'VALIDATION_ERROR', 'Latitude and longitude are required', 400);
      return;
    }

    const { salons, total } = await salonService.getNearbySalons(lat, lng, radius, page, limit);
    paginatedResponse(res, salons, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getSalonStaff(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const staff = await salonService.getSalonStaff(id);
    successResponse(res, { staff });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getSalonServices(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const services = await salonService.getSalonServices(id);
    successResponse(res, { services });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getSalonById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const salon = await salonService.getSalonById(id);
    
    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    successResponse(res, salon);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function createSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const data = createSalonSchema.parse(req.body);
    const salon = await salonService.createSalon(req.user.id, data);
    successResponse(res, salon, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 400);
  }
}

export async function updateSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const data = updateSalonSchema.parse(req.body);
    const salon = await salonService.updateSalon(id, req.user.id, data);
    successResponse(res, salon);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 400);
  }
}

export async function getMySalons(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { salons, total } = await salonService.getSalons(
      { status: undefined },
      page,
      limit
    );
    
    // Filter by owner
    const mySalons = salons.filter(s => (s as any).ownerId === req.user!.id);
    paginatedResponse(res, mySalons, page, limit, mySalons.length);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getSalonStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const stats = await salonService.getSalonStats(id);
    successResponse(res, stats);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Admin endpoints
export async function getPendingSalons(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { salons, total } = await salonService.getPendingSalons(page, limit);
    paginatedResponse(res, salons, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function approveSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const salon = await salonService.updateSalonStatus(id, 'APPROVED');
    successResponse(res, salon);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 400);
  }
}

export async function rejectSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const salon = await salonService.updateSalonStatus(id, 'REJECTED', reason);
    successResponse(res, salon);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 400);
  }
}

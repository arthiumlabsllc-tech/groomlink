import { Request, Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import * as salonService from '../services/salon.service';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

// Define SalonType enum locally
enum SalonType {
  BARBERSHOP = 'BARBERSHOP',
  HAIR_SALON = 'HAIR_SALON',
  PEDICURE_SALON = 'PEDICURE_SALON',
  NAIL_SALON = 'NAIL_SALON',
  SPA = 'SPA',
  BEAUTY_SALON = 'BEAUTY_SALON',
}

const createSalonSchema = z.object({
  businessName: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(['BARBERSHOP', 'HAIR_SALON', 'PEDICURE_SALON', 'NAIL_SALON', 'SPA', 'BEAUTY_SALON']),
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

    // Query salons directly by ownerId from the database
    const [salons, total] = await Promise.all([
      prisma.salon.findMany({
        where: { ownerId: req.user.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workers: {
            where: { isActive: true },
            select: {
              id: true,
              fullName: true,
              avatar: true,
              specialties: true,
              rating: true,
              reviewCount: true,
            },
          },
          services: {
            where: { isActive: true },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
      }),
      prisma.salon.count({ where: { ownerId: req.user.id } }),
    ]);
    
    paginatedResponse(res, salons, page, limit, total);
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

// Map endpoint - get salons for map display
interface SalonMapData {
  id: string;
  businessName: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviewCount: number;
  openingTime: string | null;
  closingTime: string | null;
  workingDays: string[];
  city: string;
  address: string;
  phoneNumber: string;
}

export async function getSalonsForMap(req: Request, res: Response): Promise<void> {
  try {
    const { lat, lng, radius = 10 } = req.query;
    
    // Get all approved salons with location data
    const salons = await prisma.salon.findMany({
      where: { 
        status: 'APPROVED', 
        latitude: { not: undefined },
        longitude: { not: undefined }
      },
      select: {
        id: true, businessName: true, type: true,
        latitude: true, longitude: true,
        rating: true, reviewCount: true,
        openingTime: true, closingTime: true, workingDays: true,
        city: true, address: true, phoneNumber: true,
      }
    });

    // If lat/lng provided, filter by radius (Haversine approximation)
    let filtered: SalonMapData[] = salons;
    if (lat && lng) {
      const latNum = parseFloat(lat as string);
      const lngNum = parseFloat(lng as string);
      const radiusNum = parseFloat(radius as string);
      filtered = salons.filter((s: SalonMapData) => {
        if (!s.latitude || !s.longitude) return false;
        const dLat = (s.latitude - latNum) * Math.PI / 180;
        const dLng = (s.longitude - lngNum) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(latNum*Math.PI/180) * Math.cos(s.latitude*Math.PI/180) * Math.sin(dLng/2)**2;
        const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return distance <= radiusNum;
      });
    }

    // Determine open/closed status based on current time
    const now = new Date();
    const currentDay = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const result = filtered.map((s: SalonMapData) => ({
      ...s,
      isOpen: s.workingDays?.includes(currentDay) && s.openingTime && s.closingTime && currentTime >= s.openingTime && currentTime <= s.closingTime,
    }));

    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

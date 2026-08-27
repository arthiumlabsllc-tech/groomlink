import { Request, Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import * as salonService from '../services/salon.service';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types';
import { verifyToken } from '../utils/jwt';
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

enum ProviderCategory {
  BUSINESS = 'BUSINESS',
  FREELANCER = 'FREELANCER',
}

const createSalonSchema = z.object({
  businessName: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(['BARBERSHOP', 'HAIR_SALON', 'PEDICURE_SALON', 'NAIL_SALON', 'SPA', 'BEAUTY_SALON']),
  phoneNumber: z.string(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(), // Optional for freelancers
  city: z.string(),
  region: z.string(),
  latitude: z.number().optional(), // Optional - will be auto-geocoded from address
  longitude: z.number().optional(), // Optional - will be auto-geocoded from address
  openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // Optional for freelancers
  closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // Optional for freelancers
  workingDays: z.array(z.string()).optional(), // Optional for freelancers
  hasParking: z.boolean().optional(),
  hasWifi: z.boolean().optional(),
  hasAC: z.boolean().optional(),
  acceptsWalkIns: z.boolean().optional(),
  maxConcurrentClients: z.number().int().min(1).max(50).optional(),
  totalChairs: z.number().int().min(1).max(50).optional(),
  bufferTimeMinutes: z.number().int().min(0).max(60).optional(),
  operatingModel: z.string().optional(),
  providerCategory: z.enum(['BUSINESS', 'FREELANCER']).optional(),
  serviceAreas: z.array(z.string()).optional(),
});

const updateSalonSchema = createSalonSchema.partial().extend({
  operatingHours: z.record(z.any()).optional(),
  // Completion settings
  autoCompletionHours: z.number().int().min(1).max(72).optional(),
  requiresCustomerConfirmation: z.boolean().optional(),
  completionReminderEnabled: z.boolean().optional(),
  qrCheckinEnabled: z.boolean().optional(),
  // Payout account settings (must be whitelisted here or zod's .parse()
  // silently strips them — the payout fields live on the Salon model)
  payoutType: z.enum(['bank', 'mobile_money']).optional(),
  bankCode: z.string().max(20).optional(),
  bankAccountNumber: z.string().max(30).optional(),
  bankAccountName: z.string().max(100).optional(),
  momoProvider: z.enum(['mtn', 'vodafone', 'airteltigo', 'vod', 'tgo']).optional(),
  momoNumber: z
    .string()
    .regex(/^(\+?233|0)\d{9}$/, 'Enter a valid Ghana phone number for Mobile Money')
    .optional(),
})
.superRefine((data, ctx) => {
  // A payout type without its account details would leave the salon unable
  // to receive payouts, so reject incomplete submissions outright.
  if (data.payoutType === 'bank') {
    if (!data.bankCode || !data.bankAccountNumber?.trim() || !data.bankAccountName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bank name, account number and account name are required for bank payouts',
        path: ['payoutType'],
      });
    }
  }
  if (data.payoutType === 'mobile_money') {
    if (!data.momoNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mobile Money number is required for Mobile Money payouts',
        path: ['payoutType'],
      });
    }
  }
});

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
      isFeatured: req.query.featured === 'true' ? true : undefined,
      providerCategory: req.query.providerCategory as string || undefined,
      category: req.query.category as string || undefined,
      homeService: req.query.homeService === 'true' ? true : undefined,
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

    // Resolve viewer identity (used for both contact-info gating and status gating)
    let viewerUserId: string | null = null;
    let viewerRole: string | null = null;
    let canSeeContact = false;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = verifyToken(token);
        const userId = decoded.userId || (decoded as any).id;
        viewerRole = (decoded as any).role || null;
        if (userId && userId !== 'pending') {
          viewerUserId = userId;
          canSeeContact = await salonService.hasUserBookedSalon(userId, id);
        }
      } catch {
        // Invalid token - treat as anonymous
      }
    }

    // Hide non-APPROVED salons from public access. Owner and admins can still view.
    const isOwner = viewerUserId !== null && viewerUserId === salon.ownerId;
    const isAdmin = viewerRole === 'ADMIN' || viewerRole === 'SUPER_ADMIN';
    if (salon.status !== 'APPROVED' && !isOwner && !isAdmin) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    // Strip sensitive contact info if user hasn't booked
    const salonResponse = {
      ...salon,
      phoneNumber: canSeeContact ? salon.phoneNumber : null,
      email: canSeeContact ? salon.email : null,
      // For freelancers, hide exact address until booked (show serviceAreas instead)
      address: canSeeContact || salon.providerCategory !== 'FREELANCER' ? salon.address : null,
    };

    successResponse(res, salonResponse);
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

    // Additional validation for BUSINESS providers
    if (data.providerCategory !== 'FREELANCER') {
      if (!data.address || data.address.trim().length < 5) {
        errorResponse(res, 'VALIDATION_ERROR', 'Address is required for business owners (min 5 characters)', 400);
        return;
      }
      if (!data.openingTime) {
        errorResponse(res, 'VALIDATION_ERROR', 'Opening time is required for business owners', 400);
        return;
      }
      if (!data.closingTime) {
        errorResponse(res, 'VALIDATION_ERROR', 'Closing time is required for business owners', 400);
        return;
      }
      if (!data.workingDays || data.workingDays.length === 0) {
        errorResponse(res, 'VALIDATION_ERROR', 'At least one working day is required for business owners', 400);
        return;
      }
    }

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
    
    // Note: operatingHours is automatically included in the response as it's a scalar field
    
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

// Get salon reviews (public endpoint)
export async function getSalonReviews(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Check if salon exists
    const salon = await prisma.salon.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { salonId: id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.review.count({ where: { salonId: id } }),
    ]);

    paginatedResponse(res, reviews, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
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
    const { lat, lng, radius = 10, category, homeService } = req.query;
    
    // Build where clause
    const where: any = { 
      status: 'APPROVED', 
      latitude: { not: null },
      longitude: { not: null }
    };

    // Filter by provider category (FREELANCER for home service)
    if (homeService === 'true') {
      where.providerCategory = 'FREELANCER';
    }

    // Filter by service category
    if (category && typeof category === 'string') {
      where.services = {
        some: {
          isActive: true,
          category: { contains: category, mode: 'insensitive' },
        }
      };
    }
    
    // Get all approved salons with location data
    const salons = await prisma.salon.findMany({
      where,
      select: {
        id: true, businessName: true, type: true,
        latitude: true, longitude: true,
        rating: true, reviewCount: true,
        openingTime: true, closingTime: true, workingDays: true,
        city: true, address: true, phoneNumber: true,
        isFeatured: true,
        providerCategory: true,
        services: {
          where: { isActive: true },
          select: {
            id: true, name: true, category: true, price: true, duration: true,
            offersHomeService: true, homeServiceFee: true,
          },
          take: 5,
        },
      }
    });

    // If lat/lng provided, filter by radius (Haversine approximation)
    let filtered: any[] = salons;
    if (lat && lng) {
      const latNum = parseFloat(lat as string);
      const lngNum = parseFloat(lng as string);
      const radiusNum = parseFloat(radius as string);
      filtered = salons.filter((s: any) => {
        if (!s.latitude || !s.longitude) return false;
        const dLat = (s.latitude - latNum) * Math.PI / 180;
        const dLng = (s.longitude - lngNum) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(latNum*Math.PI/180) * Math.cos(s.latitude*Math.PI/180) * Math.sin(dLng/2)**2;
        const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        // Attach distance for client use
        (s as any).distance = Math.round(distance * 10) / 10;
        return distance <= radiusNum;
      });
    }

    // If homeService filter, also include salons with services that offer home service
    if (homeService === 'true') {
      filtered = filtered.filter((s: any) => 
        s.providerCategory === 'FREELANCER' || 
        s.services?.some((svc: any) => svc.offersHomeService)
      );
    }

    // Determine open/closed status based on current time
    const now = new Date();
    const currentDay = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const result = filtered.map((s: any) => ({
      ...s,
      isOpen: s.workingDays?.includes(currentDay) && s.openingTime && s.closingTime && currentTime >= s.openingTime && currentTime <= s.closingTime,
    }));

    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// ===========================================
// COMPLETION SETTINGS
// ===========================================

const completionSettingsSchema = z.object({
  autoCompletionHours: z.number().int().min(1).max(72).optional(),
  requiresCustomerConfirmation: z.boolean().optional(),
  completionReminderEnabled: z.boolean().optional(),
  qrCheckinEnabled: z.boolean().optional(),
});

/**
 * Get completion settings for a salon (salon owner only)
 */
export async function getCompletionSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id },
      select: {
        ownerId: true,
        autoCompletionHours: true,
        requiresCustomerConfirmation: true,
        completionReminderEnabled: true,
        qrCheckinEnabled: true,
      },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'You do not have access to this salon', 403);
      return;
    }

    successResponse(res, {
      autoCompletionHours: salon.autoCompletionHours,
      requiresCustomerConfirmation: salon.requiresCustomerConfirmation,
      completionReminderEnabled: salon.completionReminderEnabled,
      qrCheckinEnabled: salon.qrCheckinEnabled,
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Update completion settings for a salon (salon owner only)
 */
export async function updateCompletionSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const validatedData = completionSettingsSchema.parse(req.body);

    // Verify salon ownership
    const salon = await prisma.salon.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    if (salon.ownerId !== req.user.id && req.user.role !== 'ADMIN') {
      errorResponse(res, 'FORBIDDEN', 'You do not have access to this salon', 403);
      return;
    }

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: validatedData,
      select: {
        autoCompletionHours: true,
        requiresCustomerConfirmation: true,
        completionReminderEnabled: true,
        qrCheckinEnabled: true,
      },
    });

    successResponse(res, updatedSalon);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

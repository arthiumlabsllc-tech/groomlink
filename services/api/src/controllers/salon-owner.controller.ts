import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import prisma from '../config/database';
import redis from '../config/redis';
import logger from '../config/logger';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

// Staff Management Schemas
const addStaffSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  yearsOfExperience: z.number().optional(),
  avatar: z.string().url().optional(),
});

const updateStaffSchema = addStaffSchema.partial().extend({
  // Availability fields — these do NOT live on the Worker record; the
  // controller syncs them into weekly Availability rows. They must be
  // whitelisted here or zod's .parse() silently strips them, which made
  // working-hours edits in the partners app disappear.
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  workingHours: z
    .object({
      start: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/),
      end: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/),
    })
    .optional(),
  workingDays: z.array(z.string()).optional(),
});

// Service Management Schemas
const addServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string(),
  duration: z.number().min(5),
  price: z.number().min(0),
  discountPrice: z.number().min(0).optional().nullable(),
  promoLabel: z.string().max(50).optional().nullable(),
  image: z.string().url().optional(),
  offersHomeService: z.boolean().optional(),
  homeServiceFee: z.number().min(0).optional().nullable(),
});

const updateServiceSchema = addServiceSchema.partial();

// Availability Schema
const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  isAvailable: z.boolean().default(true),
  specificDate: z.string().datetime().optional(),
});

// Staff Service Price Schema
const staffServicePriceSchema = z.object({
  serviceId: z.string().uuid(),
  priceOverride: z.number().min(0).optional(),
});

// Review Reply Schema
const replyToReviewSchema = z.object({
  reply: z.string().min(1).max(1000),
});

// Verify salon ownership
async function verifySalonOwnership(salonId: string, ownerId: string) {
  const salon = await prisma.salon.findFirst({
    where: { id: salonId, ownerId },
  });
  return salon !== null;
}

// Staff Management
export async function getStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const staff = await prisma.worker.findMany({
      where: { salonId },
      include: {
        workerServices: {
          include: { service: true },
        },
        availabilities: true,
        _count: {
          select: { bookings: true, reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const NUMBER_TO_DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Derive display-friendly working hours from the weekly availability
    // rows so the partners app shows what the booking engine actually uses
    const staffWithHours = staff.map((member) => {
      const activeRows = (member.availabilities || []).filter(
        (row) => !row.isBreakSlot && !row.specificDate && row.isAvailable && !row.isClosed
      );
      const workingHours =
        activeRows.length > 0
          ? {
              start: activeRows.map((row) => row.startTime).sort()[0],
              end: activeRows.map((row) => row.endTime).sort().reverse()[0],
            }
          : null;
      const workingDays = [
        ...new Set(activeRows.map((row) => NUMBER_TO_DAY_NAME[row.dayOfWeek] || '')),
      ].filter(Boolean);
      return { ...member, workingHours, workingDays };
    });

    successResponse(res, staffWithHours);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function addStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;
    const data = addStaffSchema.parse(req.body);

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const staff = await prisma.worker.create({
      data: {
        ...data,
        salonId,
      },
    });

    successResponse(res, staff, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function updateStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, staffId } = req.params;
    const data = updateStaffSchema.parse(req.body);

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    // Availability fields live on weekly Availability rows, not on the
    // Worker record — separate them before the prisma update.
    const { workingHours, workingDays, isAvailable, isActive, ...workerFields } = data;
    const updateData: any = { ...workerFields };
    if (isActive !== undefined || isAvailable !== undefined) {
      updateData.isActive = isActive ?? isAvailable;
    }

    const staff = await prisma.worker.update({
      where: { id: staffId, salonId },
      data: updateData,
    });

    // Sync the worker's weekly working hours so the booking slot engine
    // picks them up immediately
    if (workingHours) {
      await syncWorkerWeeklyHours(staffId, workingHours, workingDays);
      await invalidateSalonAvailabilityCache(salonId);
    }

    successResponse(res, staff);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

const DAY_NAME_TO_NUMBER: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseWorkingDays(days?: string[]): number[] | null {
  if (!days || days.length === 0) return null;
  const nums = days
    .map((day) => DAY_NAME_TO_NUMBER[String(day).toLowerCase()])
    .filter((n): n is number => typeof n === 'number');
  return nums.length > 0 ? nums : null;
}

/**
 * Upsert a worker's weekly availability rows to match the working hours
 * configured in the partners app. Days that already have rows get their
 * times updated; days no longer worked are marked unavailable; missing
 * days are created.
 */
async function syncWorkerWeeklyHours(
  workerId: string,
  hours: { start: string; end: string },
  workingDays?: string[]
): Promise<void> {
  const activeDays = parseWorkingDays(workingDays);

  const existing = await prisma.availability.findMany({
    where: { workerId, specificDate: null, isBreakSlot: false },
  });

  const seenDays = new Set<number>();
  for (const row of existing) {
    seenDays.add(row.dayOfWeek);
    const stillWorked = !activeDays || activeDays.includes(row.dayOfWeek);
    if (stillWorked) {
      if (
        row.startTime !== hours.start ||
        row.endTime !== hours.end ||
        !row.isAvailable ||
        row.isClosed
      ) {
        await prisma.availability.update({
          where: { id: row.id },
          data: { startTime: hours.start, endTime: hours.end, isAvailable: true, isClosed: false },
        });
      }
    } else if (row.isAvailable) {
      await prisma.availability.update({
        where: { id: row.id },
        data: { isAvailable: false },
      });
    }
  }

  // Default to Mon–Sat when no explicit working days were provided
  const daysToCreate = activeDays ?? [1, 2, 3, 4, 5, 6];
  for (const day of daysToCreate) {
    if (seenDays.has(day)) continue;
    await prisma.availability.create({
      data: {
        workerId,
        dayOfWeek: day,
        startTime: hours.start,
        endTime: hours.end,
        isAvailable: true,
        isClosed: false,
      },
    });
  }

  logger.info(`Synced weekly working hours for worker ${workerId}`, { hours, days: daysToCreate });
}

/**
 * Best-effort flush of cached availability for a salon across all dates so
 * working-hours changes take effect immediately in the booking flow.
 */
async function invalidateSalonAvailabilityCache(salonId: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `availability:${salonId}:*`, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.error('Failed to invalidate availability cache after hours change', { err, salonId });
  }
}

export async function removeStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, staffId } = req.params;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    await prisma.worker.update({
      where: { id: staffId, salonId },
      data: { isActive: false },
    });

    successResponse(res, { message: 'Staff member removed' });
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

// Service Management
export async function getServices(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const services = await prisma.service.findMany({
      where: { salonId },
      include: {
        workerServices: {
          include: {
            worker: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
      orderBy: { category: 'asc' },
    });

    successResponse(res, services);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function addService(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;
    const data = addServiceSchema.parse(req.body);

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const service = await prisma.service.create({
      data: {
        ...data,
        salonId,
      },
    });

    successResponse(res, service, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function updateService(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, serviceId } = req.params;
    const data = updateServiceSchema.parse(req.body);

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const service = await prisma.service.update({
      where: { id: serviceId, salonId },
      data,
    });

    successResponse(res, service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function removeService(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, serviceId } = req.params;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    await prisma.service.update({
      where: { id: serviceId, salonId },
      data: { isActive: false },
    });

    successResponse(res, { message: 'Service removed' });
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

// Staff Service Pricing
export async function setStaffServicePrice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, staffId } = req.params;
    const data = staffServicePriceSchema.parse(req.body);

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const workerService = await prisma.workerService.create({
      data: {
        workerId: staffId,
        serviceId: data.serviceId,
        priceOverride: data.priceOverride,
      },
    });

    successResponse(res, workerService, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function removeStaffService(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, staffId, serviceId } = req.params;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    await prisma.workerService.delete({
      where: {
        workerId_serviceId: {
          workerId: staffId,
          serviceId,
        },
      },
    });

    successResponse(res, { message: 'Staff service removed' });
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

// Availability Management
export async function getStaffAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, staffId } = req.params;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const availabilities = await prisma.availability.findMany({
      where: { workerId: staffId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    successResponse(res, { availabilities });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function setStaffAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, staffId } = req.params;
    const data = availabilitySchema.parse(req.body);

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const availability = await prisma.availability.create({
      data: {
        workerId: staffId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isAvailable: data.isAvailable,
        specificDate: data.specificDate ? new Date(data.specificDate) : null,
      },
    });

    successResponse(res, availability, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function updateStaffAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, staffId, availabilityId } = req.params;
    const data = availabilitySchema.partial().parse(req.body);

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const availability = await prisma.availability.update({
      where: { id: availabilityId, workerId: staffId },
      data: {
        ...data,
        specificDate: data.specificDate ? new Date(data.specificDate) : undefined,
      },
    });

    successResponse(res, availability);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function deleteStaffAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, staffId, availabilityId } = req.params;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    await prisma.availability.delete({
      where: { id: availabilityId, workerId: staffId },
    });

    successResponse(res, { message: 'Availability removed' });
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

// Today's Appointments
export async function getTodayAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.booking.findMany({
      where: {
        salonId,
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        worker: {
          select: { id: true, fullName: true },
        },
        service: {
          select: { id: true, name: true, duration: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    successResponse(res, { appointments });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function updateBookingStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, bookingId } = req.params;
    const { status } = req.body;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      errorResponse(res, 'VALIDATION_ERROR', 'Invalid status', 400);
      return;
    }

    const updateData: any = { status };
    if (status === 'COMPLETED') updateData.completedAt = new Date();

    const booking = await prisma.booking.update({
      where: { id: bookingId, salonId },
      data: updateData,
    });

    successResponse(res, booking);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Dashboard Stats
export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      todayBookings,
      todayRevenue,
      pendingBookings,
      completedBookings,
      weeklyBookings,
      weeklyRevenue,
      newCustomers,
      averageRating,
    ] = await Promise.all([
      // Today's bookings count
      prisma.booking.count({
        where: {
          salonId,
          date: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
      }),
      // Today's revenue
      prisma.payment.aggregate({
        where: {
          booking: { salonId, date: { gte: today, lt: tomorrow } },
          status: 'SUCCESS',
        },
        _sum: { amount: true },
      }),
      // Pending bookings (all time)
      prisma.booking.count({
        where: { salonId, status: 'PENDING' },
      }),
      // Completed bookings (all time)
      prisma.booking.count({
        where: { salonId, status: 'COMPLETED' },
      }),
      // Weekly bookings count
      prisma.booking.count({
        where: {
          salonId,
          createdAt: { gte: weekAgo },
          status: { not: 'CANCELLED' },
        },
      }),
      // Weekly revenue
      prisma.payment.aggregate({
        where: {
          booking: { salonId },
          status: 'SUCCESS',
          createdAt: { gte: weekAgo },
        },
        _sum: { amount: true },
      }),
      // New customers in the last week
      prisma.booking.groupBy({
        by: ['customerId'],
        where: {
          salonId,
          createdAt: { gte: weekAgo },
        },
      }),
      // Average rating
      prisma.review.aggregate({
        where: { salonId },
        _avg: { rating: true },
      }),
    ]);

    successResponse(res, {
      todayBookings,
      todayRevenue: todayRevenue._sum.amount || 0,
      pendingBookings,
      completedBookings,
      weeklyBookings,
      weeklyRevenue: weeklyRevenue._sum.amount || 0,
      newCustomers: newCustomers.length,
      averageRating: averageRating._avg.rating || 0,
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Reviews Management
export async function getSalonReviews(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { salonId },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          booking: {
            select: { id: true, service: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { salonId } }),
    ]);

    successResponse(res, { reviews, pagination: { page, limit, total } });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function replyToReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId, reviewId } = req.params;
    const data = replyToReviewSchema.parse(req.body);

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    // Verify the review belongs to this salon
    const review = await prisma.review.findFirst({
      where: { id: reviewId, salonId },
    });

    if (!review) {
      errorResponse(res, 'NOT_FOUND', 'Review not found', 404);
      return;
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        salonReply: data.reply,
        salonRepliedAt: new Date(),
      },
    });

    successResponse(res, updatedReview);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Analytics & Earnings
export async function getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;
    const period = req.query.period as string || '30d'; // 7d, 30d, 90d, 1y

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    const days = parseInt(period) || 30;
    startDate.setDate(startDate.getDate() - days);

    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalCustomers,
      staffPerformance,
      dailyStats,
    ] = await Promise.all([
      prisma.booking.count({
        where: { salonId, createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.booking.count({
        where: { salonId, status: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.booking.count({
        where: { salonId, status: 'CANCELLED', createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.booking.groupBy({
        by: ['customerId'],
        where: { salonId, createdAt: { gte: startDate, lte: endDate } },
        _count: { customerId: true },
      }),
      prisma.worker.findMany({
        where: { salonId },
        select: {
          id: true,
          fullName: true,
          _count: {
            select: {
              bookings: {
                where: { status: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
              },
            },
          },
        },
      }),
      prisma.$queryRaw`
        SELECT DATE(date) as date, COUNT(*) as bookings, SUM(CAST(final_amount AS DECIMAL)) as revenue
        FROM bookings
        WHERE salon_id = ${salonId}
          AND date >= ${startDate}
          AND date <= ${endDate}
          AND status != 'CANCELLED'
        GROUP BY DATE(date)
        ORDER BY date ASC
      `,
    ]);

    successResponse(res, {
      period,
      totalBookings,
      completedBookings,
      cancelledBookings,
      uniqueCustomers: totalCustomers.length,
      completionRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
      staffPerformance,
      dailyStats,
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getEarnings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;
    const period = req.query.period as string || '30d';

    if (!await verifySalonOwnership(salonId, req.user.id)) {
      errorResponse(res, 'FORBIDDEN', 'You do not own this salon', 403);
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    const days = parseInt(period) || 30;
    startDate.setDate(startDate.getDate() - days);

    const [
      totalRevenue,
      paymentMethods,
      pendingPayments,
      refundedAmount,
      escrowHeldResult,
      releasedMonthResult,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          booking: { salonId },
          status: 'SUCCESS',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ['provider'],
        where: {
          booking: { salonId },
          status: 'SUCCESS',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: {
          booking: { salonId },
          status: 'PENDING',
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: {
          booking: { salonId },
          status: 'REFUNDED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      // Money currently held in escrow awaiting payout
      prisma.escrowAccount.aggregate({
        where: { salonId, status: 'held' },
        _sum: { providerAmount: true },
      }),
      // Escrow released (paid out) this calendar month
      prisma.escrowAccount.aggregate({
        where: {
          salonId,
          status: 'released',
          releasedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { providerAmount: true },
      }),
    ]);

    successResponse(res, {
      period,
      totalRevenue: totalRevenue._sum.amount || 0,
      paymentMethods,
      pendingPayments: {
        amount: pendingPayments._sum.amount || 0,
        count: pendingPayments._count,
      },
      refundedAmount: refundedAmount._sum.amount || 0,
      // Escrow-based fields consumed by the partners dashboard
      escrowHeld: Number(escrowHeldResult._sum.providerAmount || 0),
      releasedThisMonth: Number(releasedMonthResult._sum.providerAmount || 0),
      pendingPenalties: 0, // provider penalties are visibility-based, not monetary
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

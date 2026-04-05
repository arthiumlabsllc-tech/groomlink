import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { successResponse, errorResponse } from '../utils/response';
import { z } from 'zod';

const prisma = new PrismaClient();

const availabilityQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function getStaffProfile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        salon: {
          select: {
            id: true,
            businessName: true,
            address: true,
            city: true,
            rating: true,
          },
        },
        workerServices: {
          include: {
            service: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            bookings: true,
          },
        },
      },
    });

    if (!worker) {
      errorResponse(res, 'NOT_FOUND', 'Staff member not found', 404);
      return;
    }

    successResponse(res, { worker });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getStaffAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { startDate, endDate } = availabilityQuerySchema.parse(req.query);

    // Check if worker exists
    const worker = await prisma.worker.findUnique({
      where: { id },
    });

    if (!worker) {
      errorResponse(res, 'NOT_FOUND', 'Staff member not found', 404);
      return;
    }

    // Get availability schedule
    const availabilities = await prisma.availability.findMany({
      where: {
        workerId: id,
        ...(startDate && endDate && {
          specificDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // Get existing bookings for the date range
    const bookings = await prisma.booking.findMany({
      where: {
        workerId: id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'],
        },
        date: startDate && endDate ? {
          gte: new Date(startDate),
          lte: new Date(endDate),
        } : undefined,
      },
      select: {
        date: true,
        startTime: true,
        endTime: true,
      },
    });

    successResponse(res, {
      availabilities,
      bookedSlots: bookings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getStaffReviews(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Check if worker exists
    const worker = await prisma.worker.findUnique({
      where: { id },
    });

    if (!worker) {
      errorResponse(res, 'NOT_FOUND', 'Staff member not found', 404);
      return;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { workerId: id },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({
        where: { workerId: id },
      }),
    ]);

    successResponse(res, {
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

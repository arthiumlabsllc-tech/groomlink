import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import * as bookingService from '../services/booking.service';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

const createBookingSchema = z.object({
  salonId: z.string().uuid(),
  workerId: z.string().uuid().optional(),
  serviceId: z.string().uuid(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  customerNotes: z.string().optional(),
});

export async function createBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const validatedData = createBookingSchema.parse(req.body);
    const data = {
      ...validatedData,
      date: new Date(validatedData.date),
    };

    const booking = await bookingService.createBooking(req.user.id, data);
    successResponse(res, booking, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 400);
  }
}

export async function getMyBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const filters = {
      customerId: req.user.id,
      status: status as any,
    };

    const { bookings, total } = await bookingService.getBookings(filters, page, limit);
    paginatedResponse(res, bookings, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getSalonBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const filters = {
      salonId,
      status: status as any,
    };

    const { bookings, total } = await bookingService.getBookings(filters, page, limit);
    paginatedResponse(res, bookings, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getBookingById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const booking = await bookingService.getBookingById(id, req.user.id, req.user.role);

    if (!booking) {
      errorResponse(res, 'NOT_FOUND', 'Booking not found', 404);
      return;
    }

    successResponse(res, booking);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function confirmBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const booking = await bookingService.confirmBooking(id, req.user.id);
    successResponse(res, booking);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 400);
  }
}

export async function completeBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const booking = await bookingService.completeBooking(id, req.user.id);
    successResponse(res, booking);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 400);
  }
}

export async function cancelBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;
    const booking = await bookingService.cancelBooking(id, req.user.id, req.user.role, reason);
    successResponse(res, booking);
  } catch (error) {
    errorResponse(res, 'CANCEL_FAILED', (error as Error).message, 400);
  }
}

export async function getAvailableSlots(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { salonId } = req.params;
    const workerId = req.query.workerId as string | undefined;
    const dateStr = req.query.date as string;
    const duration = parseInt(req.query.duration as string) || undefined;

    if (!dateStr) {
      errorResponse(res, 'MISSING_DATE', 'Date is required', 400);
      return;
    }

    const date = new Date(dateStr);
    const slots = await bookingService.getAvailableSlots(salonId, workerId, date, duration);
    successResponse(res, slots);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

const rescheduleSchema = z.object({
  date: z.string().datetime(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
});

export async function rescheduleBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const validatedData = rescheduleSchema.parse(req.body);

    const booking = await bookingService.rescheduleBooking(id, req.user.id, {
      date: new Date(validatedData.date),
      startTime: validatedData.startTime,
    });
    successResponse(res, booking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'RESCHEDULE_FAILED', (error as Error).message, 400);
  }
}

const rateBookingSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function rateBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const validatedData = rateBookingSchema.parse(req.body);

    const review = await bookingService.rateBooking(id, req.user.id, validatedData);
    successResponse(res, review, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'RATING_FAILED', (error as Error).message, 400);
  }
}

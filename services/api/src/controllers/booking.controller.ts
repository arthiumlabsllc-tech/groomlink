import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import * as bookingService from '../services/booking.service';
import * as cancellationService from '../services/cancellation.service';
import * as noshowService from '../services/noshow.service';
import * as completionService from '../services/completion.service';
import * as checkinService from '../services/checkin.service';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';
import prisma from '../config/database';

// Helper function to add minutes to a time string
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

// Schema for guest in a group booking
const guestSchema = z.object({
  guestName: z.string().min(1, 'Guest name is required'),
  guestPhone: z.string().optional(),
  guestAgeGroup: z.string().optional(),
  serviceId: z.string().uuid('Service ID must be a valid UUID'),
  staffId: z.string().uuid().optional(),
  priceAmount: z.number().optional(),
  specialInstructions: z.string().optional(),
  isChild: z.boolean().optional(),
});

const createBookingSchema = z.object({
  salonId: z.string().uuid(),
  workerId: z.string().uuid().optional(),
  serviceId: z.string().uuid(),
  date: z.string().datetime(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  customerNotes: z.string().optional(),
  // Group booking fields
  isGroupBooking: z.boolean().optional(),
  totalPeople: z.number().int().min(1).optional(),
  guests: z.array(guestSchema).optional(),
  billingType: z.enum(['combined', 'separate']).optional(),
});

export async function createBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    // Check account restriction for no-show violations
    const restriction = await noshowService.checkAccountRestriction(req.user.id);
    if (restriction.restricted) {
      errorResponse(res, 'FORBIDDEN', `Your account is restricted from booking due to excessive no-shows. ${restriction.reason || ''} Restriction expires: ${restriction.restrictedUntil?.toLocaleDateString() || 'N/A'}`, 403);
      return;
    }

    const validatedData = createBookingSchema.parse(req.body);

    // Validate group booking requirements
    if (validatedData.isGroupBooking) {
      if (!validatedData.totalPeople || validatedData.totalPeople < 2) {
        errorResponse(res, 'VALIDATION_ERROR', 'Group bookings require at least 2 people', 400);
        return;
      }
      if (!validatedData.guests || validatedData.guests.length === 0) {
        errorResponse(res, 'VALIDATION_ERROR', 'Group bookings require at least one guest', 400);
        return;
      }
    }

    // If guests are provided, fetch all unique service IDs to get durations
    // Use the LONGEST service duration as the booking duration (guests served concurrently)
    let serviceDuration: number | undefined;
    if (validatedData.guests && validatedData.guests.length > 0) {
      const uniqueServiceIds = [...new Set(validatedData.guests.map(g => g.serviceId))];
      const services = await prisma.service.findMany({
        where: { id: { in: uniqueServiceIds } },
        select: { id: true, duration: true },
      });
      
      if (services.length !== uniqueServiceIds.length) {
        errorResponse(res, 'VALIDATION_ERROR', 'One or more service IDs are invalid', 400);
        return;
      }
      
      // Find the longest duration
      serviceDuration = Math.max(...services.map(s => s.duration));
    }

    const data = {
      ...validatedData,
      date: new Date(validatedData.date),
      // If we calculated a longer duration for group booking, we need to adjust the end time
      // But the service layer handles end time calculation, so we pass serviceDuration hint
      // For group bookings, we use the primary serviceId for the main booking
      // and guests array contains individual services
      ...(serviceDuration && { serviceDuration }),
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
    
    // Security: Strip checkinCode from bookings for salon owners
    // Salon owners should not see checkin codes to prevent fraud
    const sanitizedBookings = bookings.map(booking => {
      if ('checkinCode' in booking) {
        delete (booking as any).checkinCode;
      }
      return booking;
    });
    
    paginatedResponse(res, sanitizedBookings, page, limit, total);
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
    const result = await completionService.manualComplete(id, req.user.id);
    successResponse(res, result);
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
    
    // Determine cancelledBy from user role
    let cancelledBy: 'customer' | 'provider' | 'system';
    if (req.user.role === 'SALON_OWNER') {
      cancelledBy = 'provider';
    } else {
      cancelledBy = 'customer';
    }

    let result;
    if (cancelledBy === 'provider') {
      result = await cancellationService.handleProviderCancellation(id, req.user.id, reason);
    } else {
      result = await cancellationService.cancelBookingWithRefund(id, cancelledBy, reason);
    }

    successResponse(res, result);
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
  staffId: z.string().uuid().optional(),
});

export async function rescheduleBooking(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const validatedData = rescheduleSchema.parse(req.body);

    // Convert date to ISO string format for the cancellation service
    const newDate = new Date(validatedData.date).toISOString();
    
    const booking = await cancellationService.rescheduleBooking(
      id,
      newDate,
      validatedData.startTime,
      validatedData.staffId
    );
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

export async function checkCapacityHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { salonId, date, startTime, endTime, totalPeople, staffId } = req.body;
    
    if (!salonId || !date || !startTime || !totalPeople) {
      errorResponse(res, 'MISSING_PARAMS', 'salonId, date, startTime, and totalPeople are required', 400);
      return;
    }
    
    // Calculate endTime if not provided (use default 30 min)
    const calcEndTime = endTime || addMinutesToTime(startTime, 30);
    
    const result = await bookingService.checkCapacity(
      salonId,
      new Date(date),
      startTime,
      calcEndTime,
      totalPeople,
      staffId
    );
    
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 'CAPACITY_CHECK_FAILED', (error as Error).message, 500);
  }
}

export async function getGroupBookingHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { groupRef } = req.params;
    if (!groupRef) {
      errorResponse(res, 'MISSING_PARAMS', 'Group reference is required', 400);
      return;
    }
    const bookings = await bookingService.getGroupBooking(groupRef);
    if (!bookings || bookings.length === 0) {
      errorResponse(res, 'NOT_FOUND', 'Group booking not found', 404);
      return;
    }
    successResponse(res, bookings);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function checkInGuestHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { guestId } = req.params;
    if (!guestId) {
      errorResponse(res, 'MISSING_PARAMS', 'Guest ID is required', 400);
      return;
    }
    const guest = await bookingService.checkInGuest(guestId);
    successResponse(res, guest);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get refund preview for a booking before cancellation
 */
export async function refundPreviewHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const refundCalculation = await cancellationService.getRefundPreview(id);
    successResponse(res, refundCalculation);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Mark a booking as no-show (provider or admin only)
 */
export async function markNoShowHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    
    // Determine markedByRole from user role
    let markedByRole: 'PROVIDER' | 'ADMIN';
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      markedByRole = 'ADMIN';
    } else {
      markedByRole = 'PROVIDER';
    }

    const noShowRecord = await noshowService.recordNoShow({
      bookingId: id,
      markedById: req.user.id,
      markedByRole,
    });

    successResponse(res, noShowRecord);
  } catch (error) {
    errorResponse(res, 'NOSHOW_FAILED', (error as Error).message, 400);
  }
}

/**
 * Dispute a no-show record (customer only)
 */
export async function disputeNoShowHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      errorResponse(res, 'VALIDATION_ERROR', 'Reason is required', 400);
      return;
    }

    // Find the NoShowRecord for this booking
    const noShowRecord = await prisma.noShowRecord.findUnique({
      where: { bookingId: id },
    });

    if (!noShowRecord) {
      errorResponse(res, 'NOT_FOUND', 'No-show record not found for this booking', 404);
      return;
    }

    const updatedRecord = await noshowService.disputeNoShow({
      noShowRecordId: noShowRecord.id,
      userId: req.user.id,
      reason,
    });

    successResponse(res, updatedRecord);
  } catch (error) {
    errorResponse(res, 'DISPUTE_FAILED', (error as Error).message, 400);
  }
}

// ===========================================
// SERVICE COMPLETION HANDLERS
// ===========================================

/**
 * Customer confirms service completion
 */
export async function customerConfirmHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const result = await completionService.customerConfirmComplete(id, req.user.id);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 'CONFIRM_FAILED', (error as Error).message, 400);
  }
}

const qrCompleteSchema = z.object({
  bookingId: z.string().uuid('Booking ID must be a valid UUID'),
  qrToken: z.string().min(1, 'QR token is required'),
});

/**
 * QR code completion by salon owner
 */
export async function qrCompleteHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const validatedData = qrCompleteSchema.parse(req.body);
    const result = await completionService.qrComplete(validatedData.bookingId, req.user.id);
    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'QR_COMPLETE_FAILED', (error as Error).message, 400);
  }
}

/**
 * Get QR code for a booking (customer only)
 */
export async function getQRCodeHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;

    // Verify the booking belongs to the customer
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { customerId: true },
    });

    if (!booking) {
      errorResponse(res, 'NOT_FOUND', 'Booking not found', 404);
      return;
    }

    if (booking.customerId !== req.user.id) {
      errorResponse(res, 'FORBIDDEN', 'You can only get QR codes for your own bookings', 403);
      return;
    }

    const qrCode = await completionService.generateQRCode(id);
    const bookingForRef = await prisma.booking.findUnique({
      where: { id },
      select: { reference: true },
    });
    successResponse(res, { qrCode, bookingRef: bookingForRef?.reference || '' });
  } catch (error) {
    errorResponse(res, 'QRCODE_FAILED', (error as Error).message, 400);
  }
}

const raiseDisputeSchema = z.object({
  reason: z.string().min(10, 'Dispute reason must be at least 10 characters'),
});

/**
 * Raise a dispute for a booking (customer only)
 */
export async function raiseDisputeHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const validatedData = raiseDisputeSchema.parse(req.body);

    const result = await completionService.raiseDispute(id, req.user.id, validatedData.reason);
    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'DISPUTE_FAILED', (error as Error).message, 400);
  }
}

// ===========================================
// CHECK-IN & QUEUE HANDLERS
// ===========================================

const checkinByQrSchema = z.object({
  bookingId: z.string().uuid().optional(),
  checkinCode: z.string().optional(),
  qrData: z.string().optional(),
}).refine((data) => data.bookingId || data.checkinCode || data.qrData, {
  message: 'At least one of bookingId, checkinCode, or qrData is required',
});

/**
 * Check in a customer by QR code, check-in code, or booking ID
 * Salon owner only
 */
export async function checkinByQrHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const validatedData = checkinByQrSchema.parse(req.body);

    const result = await checkinService.scanAndCheckIn(validatedData, req.user.id);
    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CHECKIN_FAILED', (error as Error).message, 400);
  }
}

/**
 * Get queue for a salon
 * Salon owner or admin only
 */
export async function getSalonQueueHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;
    const dateStr = req.query.date as string | undefined;
    const date = dateStr ? new Date(dateStr) : undefined;

    const result = await checkinService.getQueueForSalon(salonId, date);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get customer's queue position for a booking
 * Customer only
 */
export async function getQueuePositionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;

    // Verify the booking belongs to the customer
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { customerId: true },
    });

    if (!booking) {
      errorResponse(res, 'NOT_FOUND', 'Booking not found', 404);
      return;
    }

    if (booking.customerId !== req.user.id) {
      errorResponse(res, 'FORBIDDEN', 'You can only view queue position for your own bookings', 403);
      return;
    }

    const result = await checkinService.getCustomerQueuePosition(id);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// ===========================================
// CUSTOMER AUTO CHECK-IN (GEOFENCE)
// ===========================================

const autoCheckInSchema = z.object({
  bookingId: z.string().uuid('Booking ID must be a valid UUID'),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
});

/**
 * Customer self check-in via geofence
 * Customer only - verifies location proximity to salon
 */
export async function customerAutoCheckInHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const validatedData = autoCheckInSchema.parse(req.body);

    const result = await checkinService.customerAutoCheckIn(
      validatedData.bookingId,
      req.user.id,
      validatedData.latitude,
      validatedData.longitude
    );

    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CHECKIN_FAILED', (error as Error).message, 400);
  }
}

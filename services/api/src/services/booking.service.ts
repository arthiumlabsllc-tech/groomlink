import prisma from '../config/database';
import logger from '../config/logger';
import redis from '../config/redis';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import * as smsService from './sms.service';
import * as emailService from './email.service';
import Redlock from 'redlock';
import { bookingConfig } from '../config/booking';
import { emitSlotUpdated, emitBookingConfirmed, emitBookingCancelled } from '../config/socket';

// Redlock instance for distributed locking
let redlock: Redlock;
function getRedlock(): Redlock {
  if (!redlock) {
    redlock = new Redlock([redis], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 200,
    });
  }
  return redlock;
}

export interface CreateBookingData {
  salonId: string;
  workerId?: string;
  serviceId: string;
  date: Date;
  startTime: string;
  customerNotes?: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  salonId?: string;
  customerId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export async function createBooking(customerId: string, data: CreateBookingData) {
  const { salonId, workerId, serviceId, date, startTime, customerNotes } = data;

  // Get service details for pricing
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  // Calculate end time
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const endDate = new Date(date);
  endDate.setHours(startHour, startMinute + service.duration);
  const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

  // Check worker availability if workerId is provided
  if (workerId) {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: { isActive: true, isOnLeave: true },
    });

    if (!worker) {
      throw new Error('Staff member not found');
    }

    if (!worker.isActive || worker.isOnLeave) {
      throw new Error('Staff is currently unavailable');
    }
  }

  // Check closing time validation
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { closingTime: true },
  });

  if (salon) {
    const closingMinutes = timeToMinutes(salon.closingTime);
    const endMinutes = timeToMinutes(endTime);
    if (endMinutes > closingMinutes) {
      throw new Error('Booking would extend past salon closing time');
    }
  }

  // Create lock key for this booking slot
  const dateStr = date.toISOString().split('T')[0];
  const lockKey = `booking-lock:${salonId}:${workerId || 'any'}:${dateStr}:${startTime}`;

  // Acquire distributed lock to prevent race conditions
  const lock = await getRedlock().acquire([lockKey], 5000);

  try {
    // Use transaction with serializable isolation for conflict check and insert
    const booking = await prisma.$transaction(async (tx) => {
      // Check for conflicts within transaction
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          salonId,
          workerId: workerId || undefined,
          date,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          OR: [
            {
              // New booking starts during existing booking
              startTime: { lte: startTime },
              endTime: { gt: startTime },
            },
            {
              // New booking ends during existing booking
              startTime: { lt: endTime },
              endTime: { gte: endTime },
            },
            {
              // New booking contains existing booking
              startTime: { gte: startTime },
              endTime: { lte: endTime },
            },
          ],
        },
      });

      if (conflictingBooking) {
        throw new Error('Time slot is not available');
      }

      // Create booking with hold expiry
      return tx.booking.create({
        data: {
          customerId,
          salonId,
          workerId: workerId || null,
          serviceId,
          date,
          startTime,
          endTime,
          totalAmount: service.price,
          finalAmount: service.discountPrice || service.price,
          customerNotes,
          status: BookingStatus.PENDING,
          holdExpiresAt: new Date(Date.now() + bookingConfig.holdDurationSeconds * 1000),
        },
        include: {
          salon: {
            select: {
              id: true,
              businessName: true,
              address: true,
              phoneNumber: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          service: true,
          worker: {
            select: {
              id: true,
              fullName: true,
              avatar: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      });
    });

    logger.info(`Booking created: ${booking.id} by customer: ${customerId}`);

    // Invalidate availability cache
    await invalidateAvailabilityCache(salonId, workerId || undefined, date);

    // Emit slot:updated event for real-time sync
    emitSlotUpdated(salonId, {
      workerId: workerId,
      date: date.toISOString().split('T')[0],
      action: 'booked',
    });

    // Send confirmation SMS to customer
    if (booking.customer.phoneNumber) {
      smsService.sendBookingConfirmation(
        booking.customer.phoneNumber,
        booking.id,
        booking.salon.businessName,
        date,
        startTime
      ).catch((err) => logger.error('Failed to send booking confirmation SMS', { err }));

      // Schedule 2-hour reminder
      smsService.scheduleBookingReminder(
        booking.customer.phoneNumber,
        booking.salon.businessName,
        date,
        startTime
      ).catch((err) => logger.error('Failed to schedule booking reminder SMS', { err }));
    }

    // Send booking confirmation emails (fire-and-forget)
    const customerFullName = `${booking.customer.firstName} ${booking.customer.lastName}`.trim();
    
    // Send to customer
    if (booking.customer.email) {
      emailService.sendBookingConfirmationEmail(
        booking.customer.email,
        {
          customerName: customerFullName,
          bookingReference: booking.id,
          salonName: booking.salon.businessName,
          salonAddress: booking.salon.address,
          salonPhone: booking.salon.phoneNumber || undefined,
          serviceName: booking.service.name,
          workerName: booking.worker?.fullName || undefined,
          date: date.toISOString(),
          startTime: booking.startTime,
          endTime: booking.endTime,
          totalAmount: Number(booking.totalAmount),
          finalAmount: Number(booking.finalAmount),
          customerNotes: customerNotes || undefined,
        }
      ).catch((err) => logger.error('Failed to send booking confirmation email to customer', { err }));
    }

    // Send to salon owner
    if (booking.salon.owner?.email) {
      emailService.sendNewBookingNotificationEmail(
        booking.salon.owner.email,
        {
          customerName: customerFullName,
          bookingReference: booking.id,
          serviceName: booking.service.name,
          workerName: booking.worker?.fullName || undefined,
          date: date.toISOString(),
          startTime: booking.startTime,
          endTime: booking.endTime,
          finalAmount: Number(booking.finalAmount),
          customerPhone: booking.customer.phoneNumber || undefined,
          customerNotes: customerNotes || undefined,
        }
      ).catch((err) => logger.error('Failed to send new booking notification email to salon owner', { err }));
    }

    return booking;
  } finally {
    // Always release the lock
    try {
      await lock.release();
    } catch (releaseError) {
      logger.error('Failed to release booking lock', { releaseError });
    }
  }
}

export async function getBookingById(id: string, userId: string, userRole: string) {
  const where: any = { id };

  // Customers can only see their own bookings
  // Salon owners can see bookings for their salons
  if (userRole === 'CUSTOMER') {
    where.customerId = userId;
  } else if (userRole === 'SALON_OWNER') {
    where.salon = { ownerId: userId };
  }

  const booking = await prisma.booking.findFirst({
    where,
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          address: true,
          phoneNumber: true,
          logo: true,
        },
      },
      service: true,
      worker: {
        select: {
          id: true,
          fullName: true,
          
          avatar: true,
        },
      },
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      },
      payment: true,
      review: true,
    },
  });

  return booking;
}

export async function getBookings(filters: BookingFilters, page: number = 1, limit: number = 20) {
  const where: any = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.salonId) {
    where.salonId = filters.salonId;
  }

  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  if (filters.fromDate || filters.toDate) {
    where.date = {};
    if (filters.fromDate) {
      where.date.gte = filters.fromDate;
    }
    if (filters.toDate) {
      where.date.lte = filters.toDate;
    }
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        salon: {
          select: {
            id: true,
            businessName: true,
            logo: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
          },
        },
        worker: {
          select: {
            id: true,
            fullName: true,
            
          },
        },
        payment: {
          select: {
            status: true,
            provider: true,
          },
        },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total };
}

export async function confirmBooking(id: string, salonOwnerId: string) {
  const booking = await prisma.booking.findFirst({
    where: {
      id,
      salon: { ownerId: salonOwnerId },
      status: BookingStatus.PENDING,
    },
  });

  if (!booking) {
    throw new Error('Booking not found or cannot be confirmed');
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  // Emit booking:confirmed event to customer
  emitBookingConfirmed(booking.customerId, { bookingId: id, status: 'CONFIRMED' });

  logger.info(`Booking confirmed: ${id}`);
  return updated;
}

export async function completeBooking(id: string, salonOwnerId: string) {
  const booking = await prisma.booking.findFirst({
    where: {
      id,
      salon: { ownerId: salonOwnerId },
      status: BookingStatus.CONFIRMED,
    },
  });

  if (!booking) {
    throw new Error('Booking not found or cannot be completed');
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.COMPLETED,
      completedAt: new Date(),
    },
  });

  logger.info(`Booking completed: ${id}`);
  return updated;
}

export async function cancelBooking(id: string, userId: string, userRole: string, reason?: string) {
  const where: any = { id };

  if (userRole === 'CUSTOMER') {
    where.customerId = userId;
    where.status = { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] };
  } else if (userRole === 'SALON_OWNER') {
    where.salon = { ownerId: userId };
    where.status = { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] };
  }

  const booking = await prisma.booking.findFirst({
    where,
    include: {
      salon: true,
      customer: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found or cannot be cancelled');
  }

  // Check cancellation policy (configurable hours before for customers)
  if (userRole === 'CUSTOMER') {
    const bookingDateTime = new Date(booking.date);
    const [hours, minutes] = booking.startTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking < bookingConfig.cancellationGraceHours) {
      throw new Error(`Bookings can only be cancelled at least ${bookingConfig.cancellationGraceHours} hours before the appointment time`);
    }
  }

  // If payment was made, mark for refund
  const payment = await prisma.payment.findFirst({
    where: { bookingId: id, status: PaymentStatus.SUCCESS },
  });
  
  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      salonNotes: reason || booking.salonNotes,
    },
  });

  logger.info(`Booking cancelled: ${id} by ${userRole}`);

  // Invalidate availability cache
  await invalidateAvailabilityCache(booking.salonId, booking.workerId || undefined, booking.date);

  // Emit slot:updated event for real-time sync
  emitSlotUpdated(booking.salonId, {
    workerId: booking.workerId || undefined,
    date: booking.date.toISOString().split('T')[0],
    action: 'cancelled',
  });

  // Emit booking:cancelled event to customer
  emitBookingCancelled(booking.customerId, {
    bookingId: id,
    reason,
    cancelledBy: userRole,
  });

  // Send cancellation SMS (only if customer has phone number)
  if (booking.customer.phoneNumber) {
    await smsService.sendCancellationSMS(
      booking.customer.phoneNumber,
      booking.id,
      booking.salon.businessName
    );
  }

  return updated;
}

// Constants for slot generation
const CACHE_TTL_SECONDS = 60; // Redis cache TTL

// Valid slot durations in minutes
const VALID_SLOT_DURATIONS = [15, 30, 45, 60, 90, 120];

/**
 * Generate cache key for availability
 */
function getAvailabilityCacheKey(salonId: string, workerId: string | undefined, date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `availability:${salonId}:${workerId || 'any'}:${dateStr}`;
}

/**
 * Invalidate availability cache for a salon/worker/date
 */
async function invalidateAvailabilityCache(
  salonId: string,
  workerId: string | undefined,
  date: Date
): Promise<void> {
  try {
    const cacheKey = getAvailabilityCacheKey(salonId, workerId, date);
    await redis.del(cacheKey);
    logger.debug(`Invalidated availability cache: ${cacheKey}`);
  } catch (error) {
    logger.error('Failed to invalidate availability cache', { error });
  }
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:mm)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && end1 > start2;
}

export async function getAvailableSlots(
  salonId: string,
  workerId: string | undefined,
  date: Date,
  serviceDuration: number = 30
): Promise<{ startTime: string; endTime: string; available: boolean }[]> {
  // Validate service duration
  if (!VALID_SLOT_DURATIONS.includes(serviceDuration)) {
    throw new Error(`Invalid service duration. Must be one of: ${VALID_SLOT_DURATIONS.join(', ')} minutes`);
  }

  // Check 30-day booking window
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const requestedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysDiff = Math.floor((requestedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > bookingConfig.maxBookingDaysAhead) {
    throw new Error(`Bookings can only be made up to ${bookingConfig.maxBookingDaysAhead} days in advance`);
  }

  // Check if date is in the past
  if (daysDiff < 0) {
    return [];
  }

  const dayOfWeek = date.getDay();

  // Check if worker is on leave (if workerId provided)
  if (workerId) {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: { isOnLeave: true },
    });
    if (worker && worker.isOnLeave) {
      return [];
    }
  }

  // Check if there's a specific date override that closes the day
  const dateOverride = await prisma.availability.findFirst({
    where: {
      workerId: workerId || undefined,
      specificDate: date,
      isClosed: true,
    },
  });
  if (dateOverride) {
    return [];
  }

  // Try to get from cache first
  const cacheKey = getAvailabilityCacheKey(salonId, workerId, date);
  try {
    const cachedSlots = await redis.get(cacheKey);
    if (cachedSlots) {
      logger.debug(`Cache hit for availability: ${cacheKey}`);
      return JSON.parse(cachedSlots);
    }
  } catch (error) {
    logger.error('Redis cache read error', { error });
  }

  // Get salon working hours
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      openingTime: true,
      closingTime: true,
      workingDays: true,
    },
  });

  if (!salon) {
    throw new Error('Salon not found');
  }

  // Check if salon is open on this day
  if (!salon.workingDays.includes(dayOfWeek.toString())) {
    return [];
  }

  // Get existing bookings for the date (with buffer time consideration)
  const existingBookings = await prisma.booking.findMany({
    where: {
      salonId,
      workerId: workerId || undefined,
      date,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  // Convert bookings to time ranges with buffer
  const bookedRanges = existingBookings.map((booking) => ({
    start: timeToMinutes(booking.startTime),
    end: timeToMinutes(booking.endTime) + bookingConfig.bufferMinutes,
  }));

  // Get worker break times if workerId is provided
  let breakRanges: { start: number; end: number }[] = [];
  if (workerId) {
    const availabilities = await prisma.availability.findMany({
      where: {
        workerId,
        dayOfWeek,
        isAvailable: true,
      },
      select: {
        isBreakSlot: true,
        breakStart: true,
        breakEnd: true,
      },
    });

    breakRanges = availabilities
      .filter((a) => a.isBreakSlot && a.breakStart && a.breakEnd)
      .map((a) => ({
        start: timeToMinutes(a.breakStart!),
        end: timeToMinutes(a.breakEnd!),
      }));
  }

  // Calculate minimum start time for today
  let minStartMinutes = 0;
  if (daysDiff === 0) {
    // Today - add minimum advance buffer
    minStartMinutes = timeToMinutes(`${now.getHours()}:${now.getMinutes()}`) + bookingConfig.bufferMinutes;
  }

  // Generate time slots based on service duration
  const slots: { startTime: string; endTime: string; available: boolean }[] = [];
  const openMinutes = timeToMinutes(salon.openingTime);
  const closeMinutes = timeToMinutes(salon.closingTime);

  let currentMinutes = openMinutes;

  while (currentMinutes + serviceDuration <= closeMinutes) {
    const slotStart = currentMinutes;
    const slotEnd = currentMinutes + serviceDuration;

    // Skip slots that start before minimum allowed time (for today)
    if (slotStart < minStartMinutes) {
      currentMinutes += serviceDuration;
      continue;
    }

    // Check if slot overlaps with any booked range (including buffer)
    const isBooked = bookedRanges.some((range) =>
      timeRangesOverlap(slotStart, slotEnd, range.start, range.end)
    );

    // Check if slot overlaps with any break time
    const isBreak = breakRanges.some((breakRange) =>
      timeRangesOverlap(slotStart, slotEnd, breakRange.start, breakRange.end)
    );

    slots.push({
      startTime: minutesToTime(slotStart),
      endTime: minutesToTime(slotEnd),
      available: !isBooked && !isBreak,
    });

    // Move to next slot
    currentMinutes += serviceDuration;
  }

  // Cache the results
  try {
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(slots));
    logger.debug(`Cached availability: ${cacheKey}`);
  } catch (error) {
    logger.error('Redis cache write error', { error });
  }

  return slots;
}

export async function rescheduleBooking(
  id: string,
  userId: string,
  data: { date: Date; startTime: string }
): Promise<{ booking: any; rescheduleFee?: number }> {
  const booking = await prisma.booking.findFirst({
    where: {
      id,
      customerId: userId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    },
    include: { service: true },
  });

  if (!booking) {
    throw new Error('Booking not found or cannot be rescheduled');
  }

  // Calculate new end time
  const [startHour, startMinute] = data.startTime.split(':').map(Number);
  const endDate = new Date(data.date);
  endDate.setHours(startHour, startMinute + booking.service.duration);
  const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

  // Check for conflicts
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      id: { not: id },
      salonId: booking.salonId,
      workerId: booking.workerId || undefined,
      date: data.date,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      OR: [
        { startTime: { lte: data.startTime }, endTime: { gt: data.startTime } },
        { startTime: { lt: endTime }, endTime: { gte: endTime } },
        { startTime: { gte: data.startTime }, endTime: { lte: endTime } },
      ],
    },
  });

  if (conflictingBooking) {
    throw new Error('Time slot is not available');
  }

  // Check if reschedule fee applies (within the configured window of original appointment)
  let rescheduleFee: number | undefined;
  const bookingDateTime = new Date(booking.date);
  const [origHour, origMin] = booking.startTime.split(':').map(Number);
  bookingDateTime.setHours(origHour, origMin, 0, 0);
  
  const now = new Date();
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilBooking < bookingConfig.rescheduleWindowHours) {
    rescheduleFee = bookingConfig.rescheduleFeeGhs;
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      date: data.date,
      startTime: data.startTime,
      endTime,
    },
  });

  logger.info(`Booking rescheduled: ${id}${rescheduleFee ? ` with fee: ${rescheduleFee} GHS` : ''}`);

  // Invalidate availability cache for both old and new dates
  await invalidateAvailabilityCache(booking.salonId, booking.workerId || undefined, booking.date);
  if (booking.date.getTime() !== data.date.getTime()) {
    await invalidateAvailabilityCache(booking.salonId, booking.workerId || undefined, data.date);
  }

  // Emit slot:updated events for both old and new dates
  const oldDateStr = booking.date.toISOString().split('T')[0];
  const newDateStr = data.date.toISOString().split('T')[0];

  emitSlotUpdated(booking.salonId, {
    workerId: booking.workerId || undefined,
    date: oldDateStr,
    action: 'reschedule-from',
  });

  if (oldDateStr !== newDateStr) {
    emitSlotUpdated(booking.salonId, {
      workerId: booking.workerId || undefined,
      date: newDateStr,
      action: 'reschedule-to',
    });
  }

  return { booking: updated, rescheduleFee };
}

export async function rateBooking(
  id: string,
  userId: string,
  data: { rating: number; comment?: string }
) {
  const booking = await prisma.booking.findFirst({
    where: {
      id,
      customerId: userId,
      status: BookingStatus.COMPLETED,
    },
  });

  if (!booking) {
    throw new Error('Booking not found or not completed');
  }

  // Check if already reviewed
  const existingReview = await prisma.review.findUnique({
    where: { bookingId: id },
  });

  if (existingReview) {
    throw new Error('Booking already reviewed');
  }

  const review = await prisma.review.create({
    data: {
      bookingId: id,
      customerId: userId,
      salonId: booking.salonId,
      workerId: booking.workerId,
      rating: data.rating,
      comment: data.comment,
    },
  });

  // Update salon and worker ratings
  await updateRatings(booking.salonId, booking.workerId);

  logger.info(`Review created for booking: ${id}`);
  return review;
}

async function updateRatings(salonId: string, workerId: string | null) {
  // Update salon rating
  const salonReviews = await prisma.review.aggregate({
    where: { salonId },
    _avg: { rating: true },
    _count: { id: true },
  });

  await prisma.salon.update({
    where: { id: salonId },
    data: {
      rating: salonReviews._avg.rating || 0,
      reviewCount: salonReviews._count.id,
    },
  });

  // Update worker rating if applicable
  if (workerId) {
    const workerReviews = await prisma.review.aggregate({
      where: { workerId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.worker.update({
      where: { id: workerId },
      data: {
        rating: workerReviews._avg.rating || 0,
        reviewCount: workerReviews._count.id,
      },
    });
  }
}

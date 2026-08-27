import prisma from '../config/database';
import logger from '../config/logger';
import redis from '../config/redis';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import * as smsService from './sms.service';
import * as notificationService from './notification.service';
import * as pushService from './pushNotification.service';
import Redlock from 'redlock';
import { bookingConfig } from '../config/booking';
import { emitSlotUpdated, emitBookingConfirmed, emitBookingCancelled } from '../config/socket';
import { generateCheckinCode } from './checkin.service';

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
  // Group booking support
  isGroupBooking?: boolean;
  totalPeople?: number;
  guests?: Array<{
    guestName: string;
    guestPhone?: string;
    guestAgeGroup?: string;
    serviceId: string;
    staffId?: string;
    priceAmount?: number;
    specialInstructions?: string;
    isChild?: boolean;
  }>;
  billingType?: string; // 'combined' or 'separate'
}

export interface BookingFilters {
  status?: BookingStatus;
  salonId?: string;
  customerId?: string;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Normalize booking response: map Prisma field names to frontend-expected names
 * and convert singular `service` to `services` array for frontend compatibility.
 *
 * Prisma fields → Frontend fields:
 *   date → scheduledDate
 *   startTime → scheduledTime
 *   endTime → scheduledEndTime
 *   customerNotes → notes
 *   service (object) → services (array)
 */
function normalizeBookingResponse(booking: any): any {
  if (!booking) return booking;
  const result = { ...booking };

  // Map Prisma date/time fields to frontend-expected names
  if (result.date !== undefined && result.scheduledDate === undefined) {
    result.scheduledDate = result.date instanceof Date
      ? result.date.toISOString().split('T')[0]
      : result.date;
  }
  if (result.startTime !== undefined && result.scheduledTime === undefined) {
    result.scheduledTime = result.startTime;
  }
  if (result.endTime !== undefined && result.scheduledEndTime === undefined) {
    result.scheduledEndTime = result.endTime;
  }
  // Map customerNotes → notes
  if (result.customerNotes !== undefined && result.notes === undefined) {
    result.notes = result.customerNotes;
  }

  // Add `services` array from singular `service` if not already present
  if (result.service && !result.services) {
    result.services = [result.service];
  }
  return result;
}

export async function createBooking(customerId: string, data: CreateBookingData) {
  const { 
    salonId, 
    workerId, 
    serviceId, 
    date, 
    startTime, 
    customerNotes,
    isGroupBooking,
    totalPeople,
    guests,
    billingType,
  } = data;

  const requestedPeople = totalPeople || 1;

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

  // Check closing time validation and get capacity settings
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { closingTime: true, maxConcurrentClients: true, operatingModel: true },
  });

  if (!salon) {
    throw new Error('Salon not found');
  }

  const closingMinutes = timeToMinutes(salon.closingTime);
  const endMinutes = timeToMinutes(endTime);
  if (endMinutes > closingMinutes) {
    throw new Error('Booking would extend past salon closing time');
  }

  // Create lock key for this booking slot (salon-wide for capacity checks)
  const dateStr = date.toISOString().split('T')[0];
  const lockKey = `booking-lock:${salonId}:${dateStr}:${startTime}`;

  // Acquire distributed lock to prevent race conditions
  const lock = await getRedlock().acquire([lockKey], 5000);

  try {
    // Use transaction with serializable isolation for conflict check and insert
    const booking = await prisma.$transaction(async (tx) => {
      // CAPACITY CHECK - count total booked people for overlapping time range
      const overlappingBookings = await tx.booking.findMany({
        where: {
          salonId,
          date,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          OR: [
            { startTime: { lte: startTime }, endTime: { gt: startTime } },
            { startTime: { lt: endTime }, endTime: { gte: endTime } },
            { startTime: { gte: startTime }, endTime: { lte: endTime } },
          ],
        },
        select: { totalPeople: true },
      });

      const currentBookedSpots = overlappingBookings.reduce((sum, b) => sum + (b.totalPeople || 1), 0);

      // Fetch salon capacity
      const salonData = await tx.salon.findUnique({
        where: { id: salonId },
        select: { maxConcurrentClients: true, operatingModel: true },
      });

      let walkinReserved = 0;
      if (salonData?.operatingModel === 'walkins_allowed') {
        walkinReserved = Math.ceil((salonData?.maxConcurrentClients || 1) * 0.2);
      }
      const bookableCapacity = (salonData?.maxConcurrentClients || 1) - walkinReserved;

      if (currentBookedSpots + requestedPeople > bookableCapacity) {
        throw new Error(`Not enough spots available. Only ${Math.max(0, bookableCapacity - currentBookedSpots)} spot(s) remaining for this time slot.`);
      }

      // PER-WORKER CONFLICT CHECK (keep as additional guard)
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
        throw new Error('This time slot has already been booked with this staff member. Please select a different time or staff.');
      }

      // Generate groupBookingRef for group bookings
      const groupBookingRef = isGroupBooking 
        ? `GRP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
        : undefined;

      // Create booking with hold expiry and group booking fields
      const newBooking = await tx.booking.create({
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
          // Group booking fields
          isGroupBooking: isGroupBooking || false,
          totalPeople: requestedPeople,
          groupBookingRef,
          primaryCustomerId: customerId,
          billingType: billingType || 'combined',
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

      // Create BookingGuest records if guests are provided
      if (guests && guests.length > 0) {
        // Fetch all guest service prices to calculate accurate total
        const guestServiceIds = [...new Set(guests.map(g => g.serviceId))];
        const guestServices = await tx.service.findMany({
          where: { id: { in: guestServiceIds } },
          select: { id: true, price: true, discountPrice: true },
        });
        const servicePriceMap = new Map(guestServices.map(s => [s.id, s]));

        await Promise.all(guests.map(guest => {
          const guestService = servicePriceMap.get(guest.serviceId);
          const priceAmount = guest.priceAmount || (guestService ? parseFloat(guestService.price.toString()) : 0);
          
          return tx.bookingGuest.create({
            data: {
              bookingId: newBooking.id,
              guestName: guest.guestName,
              guestPhone: guest.guestPhone || null,
              guestAgeGroup: guest.guestAgeGroup || 'adult',
              serviceId: guest.serviceId,
              staffId: guest.staffId || null,
              priceAmount,
              specialInstructions: guest.specialInstructions || null,
              isChild: guest.isChild || guest.guestAgeGroup === 'child' || false,
            }
          });
        }));

        // Recalculate total for group bookings with actual service prices
        const guestTotal = guests.reduce((sum, guest) => {
          const guestService = servicePriceMap.get(guest.serviceId);
          const price = guest.priceAmount || (guestService ? parseFloat(guestService.price.toString()) : 0);
          return sum + price;
        }, 0);
        
        const primaryPrice = parseFloat(service.price.toString());
        const primaryDiscount = service.discountPrice ? parseFloat(service.discountPrice.toString()) : primaryPrice;
        const realTotal = primaryPrice + guestTotal;
        const realFinal = primaryDiscount + guestTotal; // Guest prices don't have discounts

        await tx.booking.update({
          where: { id: newBooking.id },
          data: { totalAmount: realTotal, finalAmount: realFinal }
        });

        // Update the returned booking object with new amounts (cast to any to avoid Decimal type issues)
        (newBooking as any).totalAmount = realTotal;
        (newBooking as any).finalAmount = realFinal;
      }

      return newBooking;
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

    // NOTE: All notifications (email, SMS, check-in code, socket events) are now sent
    // AFTER payment success in payment.service.ts, NOT on booking creation.
    // This ensures customers only receive confirmations for paid bookings.

    return normalizeBookingResponse(booking);
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
          city: true,
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
      guests: {
        include: {
          service: { select: { id: true, name: true, price: true, duration: true } },
          staff: { select: { id: true, fullName: true, avatar: true } },
        },
      },
      escrow: true,
      cancellationRecords: {
        orderBy: { cancellationTime: 'desc' },
      },
      noShowRecords: true,
    },
  });

  // Security: Hide checkinCode from salon owners to prevent fraud
  // Only CUSTOMER (who owns the booking) and ADMIN should see the checkinCode
  if (booking && userRole === 'SALON_OWNER' && 'checkinCode' in booking) {
    delete (booking as any).checkinCode;
  }

  return normalizeBookingResponse(booking);
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
            city: true,
            logo: true,
            latitude: true,
            longitude: true,
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
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        payment: {
          select: {
            status: true,
            provider: true,
          },
        },
        guests: {
          include: {
            service: { select: { id: true, name: true, price: true, duration: true } },
            staff: { select: { id: true, fullName: true } },
          },
        },
        escrow: {
          select: {
            id: true,
            status: true,
            amountHeld: true,
            providerAmount: true,
            platformFee: true,
          },
        },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings: bookings.map(normalizeBookingResponse), total };
}

export async function confirmBooking(id: string, salonOwnerId: string) {
  const booking = await prisma.booking.findFirst({
    where: {
      id,
      salon: { ownerId: salonOwnerId },
      status: BookingStatus.PENDING,
    },
    select: {
      id: true,
      customerId: true,
      payment: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error('Booking not found or cannot be confirmed');
  }

  // Payment verification: Check if booking has an associated Payment record
  // If a Payment exists and is NOT SUCCESS, prevent confirmation
  // If NO Payment exists (free service / admin override), allow confirmation
  if (booking.payment && booking.payment.status !== PaymentStatus.SUCCESS) {
    throw new Error('Cannot confirm booking: payment has not been completed');
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  // Generate check-in code for confirmed booking
  await generateCheckinCode(id).catch((err) => {
    logger.error('Failed to generate check-in code on confirmation', { bookingId: id, err });
  });

  // Emit booking:confirmed event to customer
  emitBookingConfirmed(booking.customerId, { bookingId: id, status: 'CONFIRMED' });

  logger.info(`Booking confirmed: ${id}`);
  return normalizeBookingResponse(updated);
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
  return normalizeBookingResponse(updated);
}

/**
 * @deprecated Use cancellationService.cancelBookingWithRefund() instead.
 * This function uses a basic 3-hour grace period and does NOT apply the tiered refund policy.
 * Kept only for test compatibility; all production code paths use cancellation.service.ts.
 */
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
      service: { select: { name: true } },
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

  // Checked-in customers are already at the salon: cancellation is only
  // allowed while they are still waiting in the queue. Once the service
  // has started (CALLED / IN_SERVICE or beyond), self-service cancellation
  // is blocked — issues are handled via the dispute/support flow instead.
  if (userRole === 'CUSTOMER' && booking.checkedIn) {
    const queueEntry = booking.queueEntryId
      ? await prisma.salonQueue.findUnique({
          where: { id: booking.queueEntryId },
          select: { status: true },
        })
      : null;

    if (queueEntry && queueEntry.status !== 'WAITING') {
      throw new Error(
        'This booking can no longer be cancelled because your service has started. If there is a problem, please raise a dispute or contact support.'
      );
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

  // If the customer cancels while sitting in the salon queue, remove
  // them from it so the salon's queue view stays accurate
  if (booking.queueEntryId) {
    await prisma.salonQueue
      .update({
        where: { id: booking.queueEntryId },
        data: { status: 'LEFT' },
      })
      .catch((err) => logger.error('Failed to mark queue entry as LEFT on cancellation', { err, bookingId: id }));
  }

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
  if (booking.customer?.phoneNumber) {
    await smsService.sendCancellationSMS(
      booking.customer.phoneNumber,
      booking.id,
      booking.salon?.businessName || 'the salon'
    );
  }

  // Notify salon owner of cancellation (if cancelled by customer)
  if (userRole === 'CUSTOMER') {
    const salon = await prisma.salon.findUnique({
      where: { id: booking.salonId },
      select: { ownerId: true },
    });
    if (salon?.ownerId) {
      notificationService.notifySalonOwnerOfCancellation(
        salon.ownerId,
        booking.id,
        `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() || 'Customer',
        booking.service?.name || 'service',
        reason
      ).catch((err) => logger.error('Failed to send cancellation notification to salon owner', { err }));

      // Send push notification for cancellation
      pushService.pushBookingCancelled(
        booking.salonId,
        `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() || 'Customer',
        booking.service?.name || 'service',
        booking.id
      ).catch((err) => logger.error('Failed to send push for booking cancellation', { err }));
    }
  }

  return normalizeBookingResponse(updated);
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
 * Uses pattern matching to delete all related cache keys (general salon + specific worker caches)
 */
async function invalidateAvailabilityCache(
  salonId: string,
  workerId: string | undefined,
  date: Date
): Promise<void> {
  try {
    const dateStr = date.toISOString().split('T')[0];
    // Pattern to match all availability keys for this salon and date
    // This covers both general salon cache (worker='any') and specific worker caches
    const pattern = `availability:${salonId}:*:${dateStr}`;
    
    // Use SCAN to find all matching keys (more efficient than KEYS for large datasets)
    let cursor = '0';
    const keysToDelete: string[] = [];
    
    do {
      const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        keysToDelete.push(...keys);
      }
    } while (cursor !== '0');
    
    // Delete all found keys
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      logger.debug(`Invalidated availability cache keys: ${keysToDelete.join(', ')}`);
    } else {
      // Fallback: try to delete the specific key if no pattern matches found
      const specificKey = getAvailabilityCacheKey(salonId, workerId, date);
      await redis.del(specificKey);
      logger.debug(`Invalidated specific availability cache: ${specificKey}`);
    }
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

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingSpots: number;
  totalSpots: number;
  bookedSpots: number;
}

export async function getAvailableSlots(
  salonId: string,
  workerId: string | undefined,
  date: Date,
  serviceDuration: number = 30
): Promise<AvailableSlot[]> {
  // Validate service duration
  if (!VALID_SLOT_DURATIONS.includes(serviceDuration)) {
    throw new Error(`Invalid service duration. Must be one of: ${VALID_SLOT_DURATIONS.join(', ')} minutes`);
  }

  // Check 30-day booking window
  // Use UTC methods because date-only strings ("YYYY-MM-DD") are parsed as UTC midnight
  // and Ghana is at UTC+0, so UTC methods give correct local time
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const requestedUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const daysDiff = Math.round((requestedUTC - todayUTC) / (1000 * 60 * 60 * 24));

  if (daysDiff > bookingConfig.maxBookingDaysAhead) {
    throw new Error(`Bookings can only be made up to ${bookingConfig.maxBookingDaysAhead} days in advance`);
  }

  // Check if date is in the past
  if (daysDiff < 0) {
    return [];
  }

  const dayOfWeek = date.getUTCDay();

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

  // Get salon working hours and capacity settings
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      openingTime: true,
      closingTime: true,
      workingDays: true,
      maxConcurrentClients: true,
      operatingModel: true,
    },
  });

  if (!salon) {
    throw new Error('Salon not found');
  }

  // Check if salon is open on this day
  // workingDays can be stored as day names (e.g., 'MONDAY') or numbers (e.g., '1')
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const dayName = dayNames[dayOfWeek];
  const dayNumber = dayOfWeek.toString();
  
  const isWorkingDay = salon.workingDays.some(day => 
    day.toUpperCase() === dayName || day === dayNumber
  );
  
  if (!isWorkingDay) {
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
      totalPeople: true,
    },
  });

  // Convert bookings to time ranges with buffer and totalPeople for capacity tracking
  const bookedRanges = existingBookings.map((booking) => ({
    start: timeToMinutes(booking.startTime),
    end: timeToMinutes(booking.endTime) + bookingConfig.bufferMinutes,
    totalPeople: booking.totalPeople || 1,
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
    // Today - add minimum advance buffer (use UTC since Ghana = UTC+0)
    minStartMinutes = timeToMinutes(`${now.getUTCHours()}:${now.getUTCMinutes()}`) + bookingConfig.bufferMinutes;
  }

  // Generate time slots based on service duration
  const slots: { startTime: string; endTime: string; available: boolean; remainingSpots: number; totalSpots: number; bookedSpots: number }[] = [];
  const openMinutes = timeToMinutes(salon.openingTime);
  const closeMinutes = timeToMinutes(salon.closingTime);

  // Calculate walk-in reserved capacity
  const maxConcurrentClients = salon.maxConcurrentClients || 1;
  let walkinReserved = 0;
  if (salon.operatingModel === 'walkins_allowed') {
    walkinReserved = Math.ceil(maxConcurrentClients * 0.2);
  }
  const bookableCapacity = maxConcurrentClients - walkinReserved;

  let currentMinutes = openMinutes;

  while (currentMinutes + serviceDuration <= closeMinutes) {
    const slotStart = currentMinutes;
    const slotEnd = currentMinutes + serviceDuration;

    // Skip slots that start before minimum allowed time (for today)
    if (slotStart < minStartMinutes) {
      currentMinutes += serviceDuration;
      continue;
    }

    // Count overlapping bookings and sum totalPeople for capacity check
    const overlappingBookings = bookedRanges.filter((range) =>
      timeRangesOverlap(slotStart, slotEnd, range.start, range.end)
    );
    const bookedSpots = overlappingBookings.reduce((sum, b) => sum + b.totalPeople, 0);
    const remainingSpots = Math.max(0, bookableCapacity - bookedSpots);

    // Check if slot overlaps with any break time
    const isBreak = breakRanges.some((breakRange) =>
      timeRangesOverlap(slotStart, slotEnd, breakRange.start, breakRange.end)
    );

    const available = remainingSpots > 0 && !isBreak;

    slots.push({
      startTime: minutesToTime(slotStart),
      endTime: minutesToTime(slotEnd),
      available,
      remainingSpots,
      totalSpots: maxConcurrentClients,
      bookedSpots,
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

/**
 * @deprecated Use cancellationService.rescheduleBooking() instead.
 * This function uses a 24-hour window with a fee instead of the 12-hour blocking rule.
 * Kept only for test compatibility; all production code paths use cancellation.service.ts.
 */
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

  return { booking: normalizeBookingResponse(updated), rescheduleFee };
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

/**
 * Check capacity for a given time slot
 * @param excludeBookingId - Optional booking ID to exclude from capacity calculation (used for rescheduling)
 */
export async function checkCapacity(
  salonId: string,
  date: Date,
  startTime: string,
  endTime: string,
  totalPeople: number,
  staffId?: string,
  excludeBookingId?: string
): Promise<{ hasCapacity: boolean; remainingSpots: number; totalCapacity: number; staffCapacityOk: boolean }> {
  // Get salon capacity settings
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { maxConcurrentClients: true, operatingModel: true },
  });

  if (!salon) {
    throw new Error('Salon not found');
  }

  // Query overlapping bookings and sum totalPeople
  const overlappingBookings = await prisma.booking.findMany({
    where: {
      salonId,
      date,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      OR: [
        { startTime: { lte: startTime }, endTime: { gt: startTime } },
        { startTime: { lt: endTime }, endTime: { gte: endTime } },
        { startTime: { gte: startTime }, endTime: { lte: endTime } },
      ],
    },
    select: { totalPeople: true },
  });

  const currentBookedSpots = overlappingBookings.reduce((sum, b) => sum + (b.totalPeople || 1), 0);

  // Calculate walk-in reserved capacity
  let walkinReserved = 0;
  if (salon.operatingModel === 'walkins_allowed') {
    walkinReserved = Math.ceil((salon.maxConcurrentClients || 1) * 0.2);
  }
  const bookableCapacity = (salon.maxConcurrentClients || 1) - walkinReserved;
  const remainingSpots = Math.max(0, bookableCapacity - currentBookedSpots);
  const hasCapacity = remainingSpots >= totalPeople;

  // Check staff capacity if staffId is provided
  let staffCapacityOk = true;
  if (staffId) {
    const worker = await prisma.worker.findUnique({
      where: { id: staffId },
      select: { concurrentCapacity: true, isActive: true, isOnLeave: true },
    });

    if (!worker || !worker.isActive || worker.isOnLeave) {
      staffCapacityOk = false;
    } else {
      // Check if staff has capacity for this slot
      const staffBookings = await prisma.booking.findMany({
        where: {
          workerId: staffId,
          date,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          id: excludeBookingId ? { not: excludeBookingId } : undefined,
          OR: [
            { startTime: { lte: startTime }, endTime: { gt: startTime } },
            { startTime: { lt: endTime }, endTime: { gte: endTime } },
            { startTime: { gte: startTime }, endTime: { lte: endTime } },
          ],
        },
        select: { totalPeople: true },
      });

      const staffBookedSpots = staffBookings.reduce((sum, b) => sum + (b.totalPeople || 1), 0);
      const staffCapacity = worker.concurrentCapacity || 1;
      staffCapacityOk = staffBookedSpots + totalPeople <= staffCapacity;
    }
  }

  return {
    hasCapacity,
    remainingSpots,
    totalCapacity: salon.maxConcurrentClients || 1,
    staffCapacityOk,
  };
}

/**
 * Get all bookings in a group by groupBookingRef
 */
export async function getGroupBooking(groupBookingRef: string) {
  return prisma.booking.findMany({
    where: { groupBookingRef },
    include: {
      guests: {
        include: {
          service: { select: { id: true, name: true, price: true, duration: true } },
          staff: { select: { id: true, fullName: true } },
        },
      },
      service: true,
      salon: { select: { id: true, businessName: true } },
      customer: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Check in a guest for a group booking
 */
export async function checkInGuest(guestId: string) {
  // Verify the guest exists and is not already checked in or cancelled
  const guest = await prisma.bookingGuest.findUnique({
    where: { id: guestId },
  });

  if (!guest) {
    throw new Error('Guest not found');
  }

  if (guest.status === 'CHECKED_IN') {
    throw new Error('Guest is already checked in');
  }

  if (guest.status === 'CANCELLED') {
    throw new Error('Cannot check in a cancelled guest');
  }

  if (guest.status === 'NO_SHOW') {
    throw new Error('Cannot check in a guest marked as no-show');
  }

  return prisma.bookingGuest.update({
    where: { id: guestId },
    data: { status: 'CHECKED_IN', checkedIn: true, checkedInAt: new Date() },
  });
}

/**
 * Cancel a guest from a group booking
 * Only the booking owner (customer) can cancel a guest
 */
export async function cancelGuest(
  guestId: string,
  cancelledByUserId: string,
  reason?: string
) {
  // Verify the guest exists
  const guest = await prisma.bookingGuest.findUnique({
    where: { id: guestId },
    include: {
      booking: {
        select: { id: true, customerId: true, status: true },
      },
    },
  });

  if (!guest) {
    throw new Error('Guest not found');
  }

  // Verify the user is the booking owner
  if (guest.booking.customerId !== cancelledByUserId) {
    throw new Error('Only the booking owner can cancel a guest');
  }

  // Verify the booking is still active
  if (guest.booking.status === 'CANCELLED' || guest.booking.status === 'COMPLETED') {
    throw new Error('Cannot cancel a guest from a cancelled or completed booking');
  }

  // Verify the guest is not already checked in, cancelled, or no-show
  if (guest.status === 'CHECKED_IN') {
    throw new Error('Cannot cancel a guest who is already checked in');
  }

  if (guest.status === 'CANCELLED') {
    throw new Error('Guest is already cancelled');
  }

  if (guest.status === 'NO_SHOW') {
    throw new Error('Cannot cancel a guest marked as no-show');
  }

  const updatedGuest = await prisma.bookingGuest.update({
    where: { id: guestId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy: cancelledByUserId,
      cancelReason: reason || null,
    },
  });

  // Update the booking's totalPeople count if applicable
  const remainingGuests = await prisma.bookingGuest.count({
    where: {
      bookingId: guest.bookingId,
      status: { notIn: ['CANCELLED'] },
    },
  });

  // If all guests are cancelled, update totalPeople to reflect only the main customer
  await prisma.booking.update({
    where: { id: guest.bookingId },
    data: { totalPeople: remainingGuests + 1 }, // +1 for the main booker
  });

  logger.info(`Guest ${guestId} cancelled by user ${cancelledByUserId}`);

  return updatedGuest;
}

/**
 * Mark a guest as no-show
 * Only salon owners can mark a guest as no-show
 */
export async function markGuestNoShow(
  guestId: string,
  markedByUserId: string
) {
  // Verify the guest exists
  const guest = await prisma.bookingGuest.findUnique({
    where: { id: guestId },
    include: {
      booking: {
        select: { id: true, salon: { select: { ownerId: true } }, status: true },
      },
    },
  });

  if (!guest) {
    throw new Error('Guest not found');
  }

  // Verify the user is the salon owner
  if (guest.booking.salon.ownerId !== markedByUserId) {
    throw new Error('Only the salon owner can mark a guest as no-show');
  }

  // Verify the guest is still pending
  if (guest.status !== 'PENDING') {
    throw new Error(`Cannot mark a guest with status '${guest.status}' as no-show. Only PENDING guests can be marked.`);
  }

  const updatedGuest = await prisma.bookingGuest.update({
    where: { id: guestId },
    data: {
      status: 'NO_SHOW',
    },
  });

  // Update the booking's totalPeople count
  const remainingGuests = await prisma.bookingGuest.count({
    where: {
      bookingId: guest.bookingId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
  });

  await prisma.booking.update({
    where: { id: guest.bookingId },
    data: { totalPeople: remainingGuests + 1 }, // +1 for the main booker
  });

  logger.info(`Guest ${guestId} marked as no-show by salon owner ${markedByUserId}`);

  return updatedGuest;
}

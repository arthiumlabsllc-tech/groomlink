import prisma from '../config/database';
import logger from '../config/logger';
import { BookingStatus, QueueStatus } from '@prisma/client';
import { joinQueue, QueueEntry } from './queue.service';
import { emitBookingCheckin } from '../config/socket';
import * as notificationService from './notification.service';
import * as pushService from './pushNotification.service';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Generate a unique 6-character alphanumeric check-in code
 * Format: GL-XXXX (prefix + 4 random uppercase chars)
 */
export async function generateCheckinCode(bookingId: string): Promise<string> {
  // Generate 4 random uppercase alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const checkinCode = `GL-${randomPart}`;

  // Store on booking record
  await prisma.booking.update({
    where: { id: bookingId },
    data: { checkinCode },
  });

  logger.info(`Generated check-in code ${checkinCode} for booking ${bookingId}`);

  return checkinCode;
}

interface ScanAndCheckInData {
  bookingId?: string;
  checkinCode?: string;
  qrData?: string;
}

interface ScanAndCheckInResult {
  booking: {
    id: string;
    reference: string;
    status: BookingStatus;
    checkedIn: boolean;
    checkedInAt: Date | null;
    checkinCode: string | null;
    queuePosition: number | null;
    queueEntryId: string | null;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
    };
    service: {
      id: string;
      name: string;
      duration: number;
    };
  };
  queuePosition: number;
  queueEntry: QueueEntry;
  message: string;
}

/**
 * Scan and check in a customer
 * Accepts bookingId (from QR), checkinCode (manual entry), or raw qrData (JSON string)
 */
export async function scanAndCheckIn(
  data: ScanAndCheckInData,
  salonOwnerId: string
): Promise<ScanAndCheckInResult> {
  let bookingId: string | undefined;
  let checkinCode: string | undefined;

  // Parse qrData if provided
  if (data.qrData) {
    try {
      const parsed = JSON.parse(data.qrData);
      bookingId = parsed.bookingId;
    } catch (error) {
      throw new Error('Invalid QR data format');
    }
  }

  // Use explicitly provided values if qrData didn't contain them
  bookingId = bookingId || data.bookingId;
  checkinCode = checkinCode || data.checkinCode;

  if (!bookingId && !checkinCode) {
    throw new Error('Either bookingId, checkinCode, or qrData is required');
  }

  // Look up booking
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        ...(bookingId ? [{ id: bookingId }] : []),
        ...(checkinCode ? [{ checkinCode }] : []),
      ],
    },
    include: {
      salon: {
        select: {
          id: true,
          ownerId: true,
          businessName: true,
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
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Validate salon ownership
  if (booking.salon.ownerId !== salonOwnerId) {
    throw new Error('Unauthorized: This booking does not belong to your salon');
  }

  // Validate booking status
  if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.IN_PROGRESS) {
    throw new Error(`Cannot check in booking with status: ${booking.status}. Only CONFIRMED or IN_PROGRESS bookings can be checked in.`);
  }

  // Check if already checked in
  if (booking.checkedIn) {
    throw new Error('Customer is already checked in for this booking');
  }

  // Update booking with check-in info
  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      checkedIn: true,
      checkedInAt: new Date(),
      checkedInBy: salonOwnerId,
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
        },
      },
    },
  });

  // Auto-join queue
  const queueEntry = await joinQueue({
    salonId: booking.salonId,
    customerId: booking.customerId,
    serviceId: booking.serviceId,
    workerId: booking.workerId || undefined,
    notes: `Checked in via ${data.qrData ? 'QR scan' : checkinCode ? 'manual code' : 'booking ID'}`,
  });

  // Update booking with queue info
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      queueEntryId: queueEntry.id,
      queuePosition: queueEntry.position,
    },
  });

  logger.info(`Customer ${booking.customerId} checked in for booking ${booking.id}, joined queue at position ${queueEntry.position}`);

  // Emit socket event to salon for audible notification
  emitBookingCheckin(booking.salonId, {
    bookingId: updatedBooking.id,
    customerName: `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`,
    serviceName: updatedBooking.service.name,
    queuePosition: queueEntry.position,
  });

  // Notify salon owner of check-in
  notificationService.notifySalonOwnerOfCheckin(
    salonOwnerId,
    booking.id,
    `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`,
    updatedBooking.service.name,
    queueEntry.position
  ).catch((err) => logger.error('Failed to send check-in notification to salon owner', { err }));

  // Send push notification (works when app is backgrounded)
  pushService.pushCustomerCheckin(
    booking.salonId,
    `${updatedBooking.customer.firstName} ${updatedBooking.customer.lastName}`,
    updatedBooking.service.name,
    booking.id,
    queueEntry.position
  ).catch((err) => logger.error('Failed to send push for check-in', { err }));

  return {
    booking: {
      id: updatedBooking.id,
      reference: updatedBooking.reference,
      status: updatedBooking.status,
      checkedIn: updatedBooking.checkedIn,
      checkedInAt: updatedBooking.checkedInAt,
      checkinCode: updatedBooking.checkinCode,
      queuePosition: queueEntry.position,
      queueEntryId: queueEntry.id,
      customer: updatedBooking.customer,
      service: updatedBooking.service,
    },
    queuePosition: queueEntry.position,
    queueEntry,
    message: `Successfully checked in. Queue position: ${queueEntry.position}`,
  };
}

interface QueueStats {
  totalQueued: number;
  checkedInCount: number;
  notCheckedInCount: number;
  rescheduledCount: number;
}

interface QueueForSalonResult {
  queue: Array<{
    id: string;
    reference: string;
    status: BookingStatus;
    startTime: string;
    checkedIn: boolean;
    checkedInAt: Date | null;
    queuePosition: number | null;
    queueEntryId: string | null;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string | null;
    };
    service: {
      id: string;
      name: string;
      duration: number;
    };
    worker: {
      id: string;
      fullName: string;
    } | null;
  }>;
  stats: QueueStats;
}

/**
 * Get queue for a salon on a specific date (defaults to today)
 * Returns CONFIRMED and IN_PROGRESS bookings ordered by startTime
 */
export async function getQueueForSalon(
  salonId: string,
  date?: Date
): Promise<QueueForSalonResult> {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Get bookings for the salon on the target date
  const bookings = await prisma.booking.findMany({
    where: {
      salonId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      },
    },
    orderBy: [
      { startTime: 'asc' },
      { createdAt: 'asc' },
    ],
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
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
    },
  });

  // Calculate stats
  const checkedInCount = bookings.filter(b => b.checkedIn).length;
  const notCheckedInCount = bookings.filter(b => !b.checkedIn).length;

  // Count rescheduled bookings (those that have a cancellation record for today)
  // Note: isReschedule field doesn't exist in schema, counting all cancellations as proxy
  const rescheduledCount = await prisma.booking.count({
    where: {
      salonId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      },
      cancellationRecords: {
        some: {},
      },
    },
  });

  // Get active queue entries for total queued count
  const totalQueued = await prisma.salonQueue.count({
    where: {
      salonId,
      status: {
        in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE],
      },
    },
  });

  return {
    queue: bookings.map(b => ({
      id: b.id,
      reference: b.reference,
      status: b.status,
      startTime: b.startTime,
      checkedIn: b.checkedIn,
      checkedInAt: b.checkedInAt,
      queuePosition: b.queuePosition,
      queueEntryId: b.queueEntryId,
      customer: b.customer,
      service: b.service,
      worker: b.worker,
    })),
    stats: {
      totalQueued,
      checkedInCount,
      notCheckedInCount,
      rescheduledCount,
    },
  };
}

interface CustomerQueuePositionResult {
  bookingId: string;
  reference: string;
  checkedIn: boolean;
  checkedInAt: Date | null;
  queuePosition: number | null;
  queueEntryId: string | null;
  estimatedWaitMinutes: number | null;
  serviceDuration: number;
  peopleAhead: number;
}

/**
 * Get customer's queue position and estimated wait time
 */
export async function getCustomerQueuePosition(
  bookingId: string
): Promise<CustomerQueuePositionResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: {
        select: {
          duration: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // If not checked in, return basic info
  if (!booking.checkedIn) {
    return {
      bookingId: booking.id,
      reference: booking.reference,
      checkedIn: false,
      checkedInAt: null,
      queuePosition: null,
      queueEntryId: null,
      estimatedWaitMinutes: null,
      serviceDuration: booking.service?.duration ?? 30,
      peopleAhead: 0,
    };
  }

  // Calculate estimated wait based on queue position
  let estimatedWaitMinutes: number | null = null;
  let peopleAhead = 0;

  if (booking.queueEntryId && booking.queuePosition) {
    // Get the queue entry for accurate position
    const queueEntry = await prisma.salonQueue.findUnique({
      where: { id: booking.queueEntryId },
    });

    if (queueEntry && queueEntry.status !== QueueStatus.COMPLETED && queueEntry.status !== QueueStatus.LEFT) {
      // Get all bookings ahead in queue
      const entriesAhead = await prisma.salonQueue.findMany({
        where: {
          salonId: booking.salonId,
          status: {
            in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE],
          },
          position: {
            lt: booking.queuePosition,
          },
        },
        include: {
          service: {
            select: {
              duration: true,
            },
          },
        },
      });

      // Sum service durations for all bookings ahead
      estimatedWaitMinutes = entriesAhead.reduce((acc, entry) => {
        return acc + (entry.service?.duration ?? 30);
      }, 0);

      peopleAhead = entriesAhead.length;
    }
  }

  return {
    bookingId: booking.id,
    reference: booking.reference,
    checkedIn: booking.checkedIn,
    checkedInAt: booking.checkedInAt,
    queuePosition: booking.queuePosition,
    queueEntryId: booking.queueEntryId,
    estimatedWaitMinutes,
    serviceDuration: booking.service?.duration ?? 30,
    peopleAhead,
  };
}

/**
 * Assign queue positions to all confirmed bookings for a salon on a specific date
 * Orders by startTime and assigns sequential positions
 */
export async function assignQueuePositions(salonId: string, date: Date): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all confirmed bookings for the salon on the target date
  const bookings = await prisma.booking.findMany({
    where: {
      salonId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: BookingStatus.CONFIRMED,
    },
    orderBy: [
      { startTime: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  // Assign sequential positions
  const updates = bookings.map((booking, index) =>
    prisma.booking.update({
      where: { id: booking.id },
      data: {
        queuePosition: index + 1,
      },
    })
  );

  await Promise.all(updates);

  logger.info(`Assigned queue positions for ${bookings.length} bookings at salon ${salonId}`);
}

/**
 * Customer self check-in via geofence
 * Verifies customer is within GEOFENCE_RADIUS meters of the salon
 */
const GEOFENCE_RADIUS_METERS = 100;

interface AutoCheckInResult {
  booking: {
    id: string;
    reference: string;
    status: BookingStatus;
    checkedIn: boolean;
    checkedInAt: Date | null;
    queuePosition: number | null;
    salon: {
      id: string;
      businessName: string;
      address: string;
    };
    service: {
      id: string;
      name: string;
      duration: number;
    };
  };
  queuePosition: number;
  message: string;
}

export async function customerAutoCheckIn(
  bookingId: string,
  customerId: string,
  customerLat: number,
  customerLon: number
): Promise<AutoCheckInResult> {
  // Get the booking with salon location
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          address: true,
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
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  // Verify the booking belongs to this customer
  if (booking.customerId !== customerId) {
    throw new Error('Unauthorized: This booking does not belong to you');
  }

  // Validate booking status
  if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.IN_PROGRESS) {
    throw new Error(`Cannot check in booking with status: ${booking.status}. Only CONFIRMED or IN_PROGRESS bookings can be checked in.`);
  }

  // Check if already checked in
  if (booking.checkedIn) {
    throw new Error('You are already checked in for this booking');
  }

  // Verify salon has coordinates
  if (booking.salon.latitude === null || booking.salon.longitude === null) {
    throw new Error('Salon location is not available. Please check in with the salon staff.');
  }

  // Calculate distance to salon
  const distanceToSalon = getDistanceInMeters(
    customerLat,
    customerLon,
    booking.salon.latitude,
    booking.salon.longitude
  );

  // Verify customer is within geofence radius
  if (distanceToSalon > GEOFENCE_RADIUS_METERS) {
    throw new Error(`You are not close enough to the salon. Please move closer (within ${GEOFENCE_RADIUS_METERS}m). Current distance: ${Math.round(distanceToSalon)}m`);
  }

  // Update booking with check-in info
  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      checkedIn: true,
      checkedInAt: new Date(),
      checkedInBy: customerId, // Customer checked themselves in
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          address: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
          duration: true,
        },
      },
    },
  });

  // Auto-join queue
  const queueEntry = await joinQueue({
    salonId: booking.salonId,
    customerId: booking.customerId,
    serviceId: booking.serviceId,
    workerId: booking.workerId || undefined,
    notes: 'Checked in via geofence auto check-in',
  });

  // Update booking with queue info
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      queueEntryId: queueEntry.id,
      queuePosition: queueEntry.position,
    },
  });

  logger.info(`Customer ${customerId} auto checked in for booking ${booking.id} via geofence, joined queue at position ${queueEntry.position}`);

  return {
    booking: {
      id: updatedBooking.id,
      reference: updatedBooking.reference,
      status: updatedBooking.status,
      checkedIn: updatedBooking.checkedIn,
      checkedInAt: updatedBooking.checkedInAt,
      queuePosition: queueEntry.position,
      salon: updatedBooking.salon,
      service: updatedBooking.service,
    },
    queuePosition: queueEntry.position,
    message: `Successfully checked in at ${booking.salon.businessName}. Your queue position is ${queueEntry.position}.`,
  };
}

import prisma from '../config/database';
import logger from '../config/logger';
import { emitToUser } from '../config/socket';

export interface JoinWaitlistData {
  customerId: string;
  salonId: string;
  staffId?: string;
  date: Date;
  timeSlot: string;
}

/**
 * Join the waitlist for a specific salon/date/time slot
 */
export async function joinWaitlist(data: JoinWaitlistData) {
  const { customerId, salonId, staffId, date, timeSlot } = data;

  // Check for duplicate: same customer, salon, date, timeSlot, and still WAITING
  const existing = await prisma.waitlist.findFirst({
    where: {
      customerId,
      salonId,
      date,
      timeSlot,
      status: 'WAITING',
    },
  });

  if (existing) {
    throw new Error('You are already on the waitlist for this slot');
  }

  const entry = await prisma.waitlist.create({
    data: {
      customerId,
      salonId,
      staffId: staffId || null,
      date,
      timeSlot,
      status: 'WAITING',
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          address: true,
          city: true,
          logo: true,
        },
      },
    },
  });

  logger.info(`Customer ${customerId} joined waitlist for salon ${salonId}`, {
    waitlistId: entry.id,
    date,
    timeSlot,
  });

  return entry;
}

/**
 * Leave the waitlist (customer removes their own entry)
 */
export async function leaveWaitlist(id: string, customerId: string) {
  const entry = await prisma.waitlist.findFirst({
    where: {
      id,
      customerId,
      status: 'WAITING',
    },
  });

  if (!entry) {
    throw new Error('Waitlist entry not found or cannot be removed');
  }

  const deleted = await prisma.waitlist.delete({
    where: { id },
  });

  logger.info(`Customer ${customerId} left waitlist entry ${id}`);

  return deleted;
}

/**
 * Get the authenticated customer's active waitlist entries with salon info
 */
export async function getMyWaitlist(customerId: string) {
  const entries = await prisma.waitlist.findMany({
    where: {
      customerId,
      status: { in: ['WAITING', 'NOTIFIED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          address: true,
          city: true,
          logo: true,
        },
      },
    },
  });

  return entries;
}

/**
 * Called when a booking is cancelled. Finds matching WAITING entries,
 * updates their status to NOTIFIED, and emits a WebSocket event to each customer.
 */
export async function notifyWaitlistOnCancellation(
  salonId: string,
  staffId: string | null | undefined,
  date: Date,
  timeSlot: string
) {
  // Find matching WAITING entries for the same salon, date, and time slot
  // If staffId is provided, match entries that either specify the same staff or have no staff preference
  const matchingEntries = await prisma.waitlist.findMany({
    where: {
      salonId,
      date,
      timeSlot,
      status: 'WAITING',
      ...(staffId
        ? {
            OR: [
              { staffId },
              { staffId: null },
            ],
          }
        : { staffId: null }),
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          address: true,
          city: true,
        },
      },
    },
  });

  if (matchingEntries.length === 0) {
    logger.info('No waitlist entries to notify for cancelled slot', {
      salonId,
      staffId,
      date,
      timeSlot,
    });
    return [];
  }

  // Update each entry to NOTIFIED and emit WebSocket event
  const notified = [];
  for (const entry of matchingEntries) {
    const updated = await prisma.waitlist.update({
      where: { id: entry.id },
      data: { status: 'NOTIFIED' },
    });

    // Emit WebSocket event to the specific customer
    emitToUser(entry.customerId, 'waitlist:slot_available', {
      waitlistId: entry.id,
      salonId,
      salonName: entry.salon.businessName,
      staffId,
      date,
      timeSlot,
      message: `A slot has opened up at ${entry.salon.businessName} for your waitlisted time!`,
    });

    notified.push(updated);
  }

  logger.info(`Notified ${notified.length} waitlist entries for cancelled slot`, {
    salonId,
    staffId,
    date,
    timeSlot,
  });

  return notified;
}

/**
 * Mark entries with past dates as EXPIRED (for cron job)
 */
export async function expireOldEntries() {
  const now = new Date();

  const result = await prisma.waitlist.updateMany({
    where: {
      date: { lt: now },
      status: 'WAITING',
    },
    data: {
      status: 'EXPIRED',
    },
  });

  if (result.count > 0) {
    logger.info(`Expired ${result.count} old waitlist entries`);
  }

  return result;
}

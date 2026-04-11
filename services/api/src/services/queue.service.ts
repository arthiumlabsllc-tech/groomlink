import prisma from '../config/database';
import redis from '../config/redis';
import logger from '../config/logger';
import { getIO, emitToUser, emitToSalon } from '../config/socket';
import { QueueStatus } from '@prisma/client';
import { bookingConfig } from '../config/booking';

export interface JoinQueueData {
  salonId: string;
  customerId: string;
  serviceId?: string;
  workerId?: string;
  notes?: string;
}

export interface QueueEntry {
  id: string;
  salonId: string;
  customerId: string;
  serviceId: string | null;
  workerId: string | null;
  position: number;
  status: QueueStatus;
  joinedAt: Date;
  calledAt: Date | null;
  completedAt: Date | null;
  estimatedWait: number | null;
  notes: string | null;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string | null;
  };
  service?: {
    id: string;
    name: string;
    duration: number;
  } | null;
  worker?: {
    id: string;
    fullName: string;
  } | null;
}

export interface QueueStatusResponse {
  entries: QueueEntry[];
  totalActive: number;
  averageWaitTime: number | null;
}

const REDIS_QUEUE_PREFIX = 'queue:';
const ACTIVE_STATUSES: QueueStatus[] = [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE];

/**
 * Join a salon's queue
 */
export async function joinQueue(data: JoinQueueData): Promise<QueueEntry> {
  const { salonId, customerId, serviceId, workerId, notes } = data;

  // Check if customer is already in an active queue for this salon
  const existingEntry = await prisma.salonQueue.findFirst({
    where: {
      salonId,
      customerId,
      status: { in: ACTIVE_STATUSES },
    },
  });

  if (existingEntry) {
    throw new Error('You are already in this salon\'s queue');
  }

  // Get next position
  const activeCount = await prisma.salonQueue.count({
    where: {
      salonId,
      status: { in: ACTIVE_STATUSES },
    },
  });
  const position = activeCount + 1;

  // Calculate estimated wait time
  const estimatedWait = await calculateEstimatedWait(salonId, position);

  // Create queue entry
  const queueEntry = await prisma.salonQueue.create({
    data: {
      salonId,
      customerId,
      serviceId,
      workerId,
      position,
      status: QueueStatus.WAITING,
      estimatedWait,
      notes,
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
      worker: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  // Add to Redis sorted set
  const redisKey = `${REDIS_QUEUE_PREFIX}${salonId}`;
  await redis.zadd(redisKey, position, queueEntry.id);

  // Broadcast via Socket.io
  const io = getIO();
  io.to(`salon:${salonId}`).emit('queue:joined', { entry: queueEntry });
  io.to(`salon:${salonId}`).emit('queue:updated', { salonId });
  io.to(`user:${customerId}`).emit('queue:joined', { entry: queueEntry });

  logger.info(`Customer ${customerId} joined queue for salon ${salonId} at position ${position}`);

  return queueEntry;
}

/**
 * Leave the queue
 */
export async function leaveQueue(queueId: string, customerId: string): Promise<QueueEntry> {
  const queueEntry = await prisma.salonQueue.findFirst({
    where: {
      id: queueId,
      customerId,
      status: { in: ACTIVE_STATUSES },
    },
    include: { salon: true },
  });

  if (!queueEntry) {
    throw new Error('Queue entry not found or cannot be left');
  }

  const updatedEntry = await prisma.salonQueue.update({
    where: { id: queueId },
    data: {
      status: QueueStatus.LEFT,
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
      worker: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  // Recalculate positions for remaining entries
  await recalculatePositions(queueEntry.salonId);

  // Remove from Redis sorted set
  const redisKey = `${REDIS_QUEUE_PREFIX}${queueEntry.salonId}`;
  await redis.zrem(redisKey, queueId);

  // Broadcast via Socket.io
  const io = getIO();
  io.to(`salon:${queueEntry.salonId}`).emit('queue:left', { entry: updatedEntry });
  io.to(`salon:${queueEntry.salonId}`).emit('queue:updated', { salonId: queueEntry.salonId });
  io.to(`user:${customerId}`).emit('queue:left', { entry: updatedEntry });

  logger.info(`Customer ${customerId} left queue ${queueId}`);

  return updatedEntry;
}

/**
 * Get queue status for a salon
 */
export async function getQueueStatus(salonId: string): Promise<QueueStatusResponse> {
  const entries = await prisma.salonQueue.findMany({
    where: {
      salonId,
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: { position: 'asc' },
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

  const totalActive = entries.length;

  // Calculate average wait time from completed entries today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completedToday = await prisma.salonQueue.findMany({
    where: {
      salonId,
      status: QueueStatus.COMPLETED,
      completedAt: { gte: today },
      joinedAt: { gte: today },
      calledAt: { not: null },
    },
    select: {
      joinedAt: true,
      calledAt: true,
    },
  });

  let averageWaitTime: number | null = null;
  if (completedToday.length > 0) {
    const totalWait = completedToday.reduce((acc, entry) => {
      if (entry.calledAt && entry.joinedAt) {
        return acc + (entry.calledAt.getTime() - entry.joinedAt.getTime());
      }
      return acc;
    }, 0);
    averageWaitTime = Math.round(totalWait / completedToday.length / 60000); // Convert to minutes
  }

  return {
    entries: entries as QueueEntry[],
    totalActive,
    averageWaitTime,
  };
}

/**
 * Call next customer in queue
 */
export async function callNext(salonId: string, salonOwnerId: string): Promise<QueueEntry> {
  // Verify salon ownership
  const salon = await prisma.salon.findFirst({
    where: {
      id: salonId,
      ownerId: salonOwnerId,
    },
  });

  if (!salon) {
    throw new Error('Salon not found or you do not have permission');
  }

  // Find next waiting entry
  const nextEntry = await prisma.salonQueue.findFirst({
    where: {
      salonId,
      status: QueueStatus.WAITING,
    },
    orderBy: { position: 'asc' },
  });

  if (!nextEntry) {
    throw new Error('No customers waiting in queue');
  }

  const updatedEntry = await prisma.salonQueue.update({
    where: { id: nextEntry.id },
    data: {
      status: QueueStatus.CALLED,
      calledAt: new Date(),
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
      worker: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  // Broadcast via Socket.io
  const io = getIO();
  io.to(`user:${nextEntry.customerId}`).emit('queue:called', { entry: updatedEntry });
  io.to(`salon:${salonId}`).emit('queue:updated', { salonId });

  logger.info(`Called next customer ${nextEntry.customerId} from queue for salon ${salonId}`);

  return updatedEntry;
}

/**
 * Start service for a queue entry
 */
export async function startService(queueId: string, salonOwnerId: string): Promise<QueueEntry> {
  const queueEntry = await prisma.salonQueue.findFirst({
    where: {
      id: queueId,
      status: QueueStatus.CALLED,
    },
    include: { salon: true },
  });

  if (!queueEntry) {
    throw new Error('Queue entry not found or not in CALLED status');
  }

  // Verify salon ownership
  if (queueEntry.salon.ownerId !== salonOwnerId) {
    throw new Error('You do not have permission to start this service');
  }

  const updatedEntry = await prisma.salonQueue.update({
    where: { id: queueId },
    data: {
      status: QueueStatus.IN_SERVICE,
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
      worker: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  // Broadcast via Socket.io
  const io = getIO();
  io.to(`salon:${queueEntry.salonId}`).emit('queue:updated', { salonId: queueEntry.salonId });
  io.to(`user:${queueEntry.customerId}`).emit('queue:in-service', { entry: updatedEntry });

  logger.info(`Started service for queue entry ${queueId}`);

  return updatedEntry;
}

/**
 * Complete service for a queue entry
 */
export async function completeService(queueId: string, salonOwnerId: string): Promise<QueueEntry> {
  const queueEntry = await prisma.salonQueue.findFirst({
    where: {
      id: queueId,
      status: QueueStatus.IN_SERVICE,
    },
    include: { salon: true },
  });

  if (!queueEntry) {
    throw new Error('Queue entry not found or not in IN_SERVICE status');
  }

  // Verify salon ownership
  if (queueEntry.salon.ownerId !== salonOwnerId) {
    throw new Error('You do not have permission to complete this service');
  }

  const updatedEntry = await prisma.salonQueue.update({
    where: { id: queueId },
    data: {
      status: QueueStatus.COMPLETED,
      completedAt: new Date(),
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
      worker: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  // Recalculate positions and ETAs for remaining entries
  await recalculatePositions(queueEntry.salonId);

  // Remove from Redis sorted set
  const redisKey = `${REDIS_QUEUE_PREFIX}${queueEntry.salonId}`;
  await redis.zrem(redisKey, queueId);

  // Broadcast via Socket.io
  const io = getIO();
  io.to(`salon:${queueEntry.salonId}`).emit('queue:completed', { entry: updatedEntry });
  io.to(`salon:${queueEntry.salonId}`).emit('queue:updated', { salonId: queueEntry.salonId });
  io.to(`user:${queueEntry.customerId}`).emit('queue:completed', { entry: updatedEntry });

  logger.info(`Completed service for queue entry ${queueId}`);

  return updatedEntry;
}

/**
 * Skip a customer in queue
 */
export async function skipCustomer(queueId: string, salonOwnerId: string): Promise<QueueEntry> {
  const queueEntry = await prisma.salonQueue.findFirst({
    where: {
      id: queueId,
      status: { in: [QueueStatus.WAITING, QueueStatus.CALLED] },
    },
    include: { salon: true },
  });

  if (!queueEntry) {
    throw new Error('Queue entry not found or cannot be skipped');
  }

  // Verify salon ownership
  if (queueEntry.salon.ownerId !== salonOwnerId) {
    throw new Error('You do not have permission to skip this customer');
  }

  const updatedEntry = await prisma.salonQueue.update({
    where: { id: queueId },
    data: {
      status: QueueStatus.SKIPPED,
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
      worker: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  // Recalculate positions for remaining entries
  await recalculatePositions(queueEntry.salonId);

  // Remove from Redis sorted set
  const redisKey = `${REDIS_QUEUE_PREFIX}${queueEntry.salonId}`;
  await redis.zrem(redisKey, queueId);

  // Broadcast via Socket.io
  const io = getIO();
  io.to(`salon:${queueEntry.salonId}`).emit('queue:updated', { salonId: queueEntry.salonId });
  io.to(`user:${queueEntry.customerId}`).emit('queue:skipped', { entry: updatedEntry });

  logger.info(`Skipped customer in queue entry ${queueId}`);

  return updatedEntry;
}

/**
 * Get customer's position in queue
 */
export async function getMyPosition(salonId: string, customerId: string): Promise<QueueEntry | null> {
  const entry = await prisma.salonQueue.findFirst({
    where: {
      salonId,
      customerId,
      status: { in: ACTIVE_STATUSES },
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
      worker: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: { position: 'asc' },
  });

  return entry as QueueEntry | null;
}

/**
 * Calculate estimated wait time based on services ahead in queue
 */
async function calculateEstimatedWait(salonId: string, position: number): Promise<number> {
  // Get all entries ahead of this position
  const entriesAhead = await prisma.salonQueue.findMany({
    where: {
      salonId,
      status: { in: ACTIVE_STATUSES },
      position: { lt: position },
    },
    include: {
      service: {
        select: { duration: true },
      },
    },
  });

  // Sum up service durations (default from config if no service)
  const totalMinutes = entriesAhead.reduce((acc, entry) => {
    return acc + (entry.service?.duration || bookingConfig.bufferMinutes);
  }, 0);

  return totalMinutes;
}

/**
 * Recalculate positions for all active entries in a salon's queue
 */
async function recalculatePositions(salonId: string): Promise<void> {
  const activeEntries = await prisma.salonQueue.findMany({
    where: {
      salonId,
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: [
      { status: 'asc' }, // IN_SERVICE first, then CALLED, then WAITING
      { joinedAt: 'asc' },
    ],
  });

  // Update positions and ETAs
  const redisKey = `${REDIS_QUEUE_PREFIX}${salonId}`;
  const updates = [];
  const positionUpdates: { customerId: string; position: number; estimatedWait: number }[] = [];

  for (let i = 0; i < activeEntries.length; i++) {
    const entry = activeEntries[i];
    const newPosition = i + 1;
    const estimatedWait = await calculateEstimatedWait(salonId, newPosition);

    updates.push(
      prisma.salonQueue.update({
        where: { id: entry.id },
        data: { position: newPosition, estimatedWait },
      })
    );

    // Track position updates for broadcast
    positionUpdates.push({
      customerId: entry.customerId,
      position: newPosition,
      estimatedWait,
    });

    // Update Redis sorted set
    await redis.zadd(redisKey, newPosition, entry.id);
  }

  await Promise.all(updates);

  // Broadcast position updates to all affected customers
  const io = getIO();
  for (const update of positionUpdates) {
    io.to(`user:${update.customerId}`).emit('queue:position-update', {
      position: update.position,
      estimatedWait: update.estimatedWait,
      salonId,
    });
  }
}

/**
 * Get queue entry by ID
 */
export async function getQueueEntryById(queueId: string): Promise<QueueEntry | null> {
  const entry = await prisma.salonQueue.findUnique({
    where: { id: queueId },
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

  return entry as QueueEntry | null;
}

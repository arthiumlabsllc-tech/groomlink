import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from './logger';
import * as bookingService from '../services/booking.service';
import * as cancellationService from '../services/cancellation.service';
import * as queueService from '../services/queue.service';

let io: SocketIOServer;

// Track online presence: userId -> count of connected sockets
const onlineUsers = new Map<string, number>();

function addOnlineUser(userId: string) {
  onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
}

function removeOnlineUser(userId: string) {
  const count = onlineUsers.get(userId) || 0;
  if (count <= 1) {
    onlineUsers.delete(userId);
  } else {
    onlineUsers.set(userId, count - 1);
  }
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

/**
 * Socket.IO CORS origin check.
 * Allows our production domains (incl. subdomains), Vercel preview
 * deployments, and localhost. Extra origins can be whitelisted via the
 * CORS_ORIGIN env var (comma-separated). Mobile apps send no Origin header.
 */
function isAllowedSocketOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (process.env.CORS_ORIGIN) {
    const explicit = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
    if (explicit.includes(origin)) return true;
  }
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' ||
      hostname.endsWith('groomlinkgh.com') ||
      hostname.endsWith('.vercel.app')
    );
  } catch {
    return false;
  }
}

export function initializeSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedSocketOrigin(origin)),
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      (socket.data as any).userId = userId;
      addOnlineUser(userId);
      logger.info(`Socket ${socket.id} joined user room: ${userId}`);
    });

    // Join the support agent broadcast room. Clients should only emit this
    // when their authenticated user has SUPPORT_AGENT/ADMIN role; the
    // server-side support API enforces authorization on actual mutations.
    socket.on('join:support', () => {
      socket.join('support');
      logger.info(`Socket ${socket.id} joined support room`);
    });

    // Join a specific live-chat ticket room (subscribed to its message stream)
    socket.on('join:ticket', (ticketId: string) => {
      if (typeof ticketId === 'string' && ticketId.length > 0) {
        socket.join(`ticket:${ticketId}`);
        logger.info(`Socket ${socket.id} joined ticket room: ${ticketId}`);
      }
    });

    socket.on('leave:ticket', (ticketId: string) => {
      if (typeof ticketId === 'string' && ticketId.length > 0) {
        socket.leave(`ticket:${ticketId}`);
      }
    });

    // Join the admin security broadcast room. Clients should only emit this
    // when their authenticated user is ADMIN/SUPER_ADMIN; the server-side
    // admin API is still the final authority (this room only receives events,
    // it cannot be used to modify data).
    socket.on('join:admin', () => {
      socket.join('role:admin');
      logger.info(`Socket ${socket.id} joined role:admin room`);
    });

    // Join salon room for salon owners
    socket.on('join:salon', (salonId: string) => {
      socket.join(`salon:${salonId}`);
      logger.info(`Socket ${socket.id} joined salon room: ${salonId}`);
    });

    // Handle booking requests
    socket.on('book:request', async (data: {
      salonId: string;
      workerId?: string;
      serviceId: string;
      date: string;
      startTime: string;
      customerId: string;
    }) => {
      try {
        const booking = await bookingService.createBooking(data.customerId, {
          salonId: data.salonId,
          workerId: data.workerId,
          serviceId: data.serviceId,
          date: new Date(data.date),
          startTime: data.startTime,
        });

        // Emit confirmation to customer
        socket.emit('book:confirmed', {
          success: true,
          booking,
        });

        // Notify salon room
        io.to(`salon:${data.salonId}`).emit('booking:new', {
          booking,
        });

        logger.info(`Booking created via socket: ${booking.id}`);
      } catch (error) {
        socket.emit('book:confirmed', {
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Check availability in real-time
    socket.on('check:availability', async (data: {
      salonId: string;
      workerId?: string;
      date: string;
    }) => {
      try {
        const slots = await bookingService.getAvailableSlots(
          data.salonId,
          data.workerId,
          new Date(data.date)
        );

        socket.emit('availability:result', {
          salonId: data.salonId,
          workerId: data.workerId,
          date: data.date,
          slots,
        });
      } catch (error) {
        socket.emit('availability:result', {
          error: (error as Error).message,
        });
      }
    });

    // Cancel booking — uses tiered cancellation service
    socket.on('cancel:booking', async (data: {
      bookingId: string;
      userId: string;
      userRole: string;
      reason?: string;
    }) => {
      try {
        let result;
        if (data.userRole === 'SALON_OWNER') {
          result = await cancellationService.handleProviderCancellation(
            data.bookingId,
            data.userId,
            data.reason
          );
        } else {
          const cancelledBy: 'customer' | 'system' = 'customer';
          result = await cancellationService.cancelBookingWithRefund(
            data.bookingId,
            cancelledBy,
            data.reason
          );
        }

        socket.emit('cancel:confirmed', {
          success: true,
          cancellation: result,
        });

        // Notify relevant rooms
        io.to(`user:${data.userId}`).emit('booking:cancelled', {
          bookingId: data.bookingId,
          reason: data.reason,
        });
      } catch (error) {
        socket.emit('cancel:confirmed', {
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Join queue via Socket
    socket.on('join:queue', async (data: {
      salonId: string;
      customerId: string;
      serviceId?: string;
      workerId?: string;
      notes?: string;
    }) => {
      try {
        const entry = await queueService.joinQueue({
          salonId: data.salonId,
          customerId: data.customerId,
          serviceId: data.serviceId,
          workerId: data.workerId,
          notes: data.notes,
        });

        socket.emit('queue:joined', {
          success: true,
          entry,
        });

        logger.info(`Queue join via socket: ${entry.id}`);
      } catch (error) {
        socket.emit('queue:joined', {
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Leave queue via Socket
    socket.on('leave:queue', async (data: {
      queueId: string;
      customerId: string;
    }) => {
      try {
        const entry = await queueService.leaveQueue(data.queueId, data.customerId);

        socket.emit('queue:left', {
          success: true,
          entry,
        });

        logger.info(`Queue leave via socket: ${entry.id}`);
      } catch (error) {
        socket.emit('queue:left', {
          success: false,
          error: (error as Error).message,
        });
      }
    });

    // Typing indicator relay for live chat
    socket.on('typing:start', (data: { ticketId: string; userName?: string }) => {
      if (data?.ticketId) {
        const userId = (socket.data as any)?.userId;
        // Relay to the ticket room (other participants see it)
        socket.to(`ticket:${data.ticketId}`).emit('chat:typing', {
          ticketId: data.ticketId,
          userId: userId || socket.id,
          isTyping: true,
          userName: data.userName,
        });
      }
    });

    socket.on('typing:stop', (data: { ticketId: string }) => {
      if (data?.ticketId) {
        const userId = (socket.data as any)?.userId;
        socket.to(`ticket:${data.ticketId}`).emit('chat:typing', {
          ticketId: data.ticketId,
          userId: userId || socket.id,
          isTyping: false,
        });
      }
    });

    socket.on('disconnect', () => {
      const uid = (socket.data as any)?.userId as string | undefined;
      if (uid) removeOnlineUser(uid);
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

// Helper functions for emitting events
export function emitToUser(userId: string, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToSalon(salonId: string, event: string, data: any) {
  if (io) {
    io.to(`salon:${salonId}`).emit(event, data);
  }
}

export function emitSlotUpdated(
  salonId: string,
  data: { workerId?: string; date: string; action: string }
): void {
  if (io) {
    io.to(`salon:${salonId}`).emit('slot:updated', {
      salonId,
      workerId: data.workerId,
      date: data.date,
      action: data.action,
    });
  }
}

export function emitBookingConfirmed(userId: string, bookingData: any): void {
  if (io) {
    io.to(`user:${userId}`).emit('booking:confirmed', bookingData);
  }
}

export function emitBookingRejected(userId: string, bookingData: any): void {
  if (io) {
    io.to(`user:${userId}`).emit('booking:rejected', bookingData);
  }
}

export function emitBookingCancelled(userId: string, bookingData: any): void {
  if (io) {
    io.to(`user:${userId}`).emit('booking:cancelled', bookingData);
  }
}

export function emitBookingReminder(userId: string, bookingData: any): void {
  if (io) {
    io.to(`user:${userId}`).emit('booking:reminder', {
      booking: bookingData,
      message: 'Your appointment is coming up soon',
    });
  }
}

export function emitStaffUnavailable(
  salonId: string,
  workerData: { workerId: string; workerName: string; reason?: string }
): void {
  if (io) {
    io.to(`salon:${salonId}`).emit('staff:unavailable', workerData);
  }
}

export function emitSalonClosed(
  salonId: string,
  data: { date: string; reason?: string }
): void {
  if (io) {
    io.to(`salon:${salonId}`).emit('salon:closed', data);
  }
}

export function emitScheduleChanged(
  salonId: string,
  data: { workerId?: string; date: string; changes: any }
): void {
  if (io) {
    io.to(`salon:${salonId}`).emit('schedule:changed', data);
  }
}

export function emitReminder(userId: string, booking: any) {
  if (io) {
    io.to(`user:${userId}`).emit('reminder:upcoming', {
      booking,
      message: 'Your appointment is in 2 hours',
    });
  }
}

// Emit to salon when a customer checks in
export function emitBookingCheckin(salonId: string, data: { bookingId: string; customerName: string; serviceName: string; queuePosition: number }) {
  if (io) {
    io.to(`salon:${salonId}`).emit('booking:checkin', data);
  }
}

// Emit to salon when a service is completed
export function emitBookingCompleted(salonId: string, data: { bookingId: string; customerName: string; serviceName: string; totalAmount: string }) {
  if (io) {
    io.to(`salon:${salonId}`).emit('booking:completed', data);
  }
}

// Emit to salon when a new booking is created
export function emitNewBooking(salonId: string, booking: any) {
  if (io) {
    io.to(`salon:${salonId}`).emit('booking:new', { booking });
  }
}

// Emit global booking count update for the live counter on the home screen
export function emitBookingCountUpdate(count: number) {
  if (io) {
    io.emit('booking:count_update', { count });
  }
}

// ============================================================
// Live Chat helpers
// ============================================================

// Broadcast to all connected support agents (joined via 'join:support')
export function emitToSupport(event: string, data: any) {
  if (io) {
    io.to('support').emit(event, data);
  }
}

// Broadcast to everyone subscribed to a specific ticket thread
export function emitToTicket(ticketId: string, event: string, data: any) {
  if (io) {
    io.to(`ticket:${ticketId}`).emit(event, data);
  }
}

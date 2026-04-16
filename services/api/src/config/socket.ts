import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from './logger';
import * as bookingService from '../services/booking.service';
import * as queueService from '../services/queue.service';

let io: SocketIOServer;

export function initializeSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:8081'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      logger.info(`Socket ${socket.id} joined user room: ${userId}`);
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

    // Cancel booking
    socket.on('cancel:booking', async (data: {
      bookingId: string;
      userId: string;
      userRole: string;
      reason?: string;
    }) => {
      try {
        const booking = await bookingService.cancelBooking(
          data.bookingId,
          data.userId,
          data.userRole,
          data.reason
        );

        socket.emit('cancel:confirmed', {
          success: true,
          booking,
        });

        // Notify relevant rooms
        io.to(`user:${booking.customerId}`).emit('booking:cancelled', { booking });
        io.to(`salon:${booking.salonId}`).emit('booking:cancelled', { booking });
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

    socket.on('disconnect', () => {
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

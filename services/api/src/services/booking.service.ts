import prisma from '../config/database';
import logger from '../config/logger';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import * as smsService from './sms.service';

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

  // Check for conflicts
  const conflictingBooking = await prisma.booking.findFirst({
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

  // Create booking
  const booking = await prisma.booking.create({
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
    },
    include: {
      salon: {
        select: {
          id: true,
          businessName: true,
          address: true,
          phoneNumber: true,
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
    },
  });

  logger.info(`Booking created: ${booking.id} by customer: ${customerId}`);

  // Send confirmation SMS to customer
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { phoneNumber: true },
  });

  if (customer && customer.phoneNumber) {
    await smsService.sendBookingConfirmation(
      customer.phoneNumber,
      booking.id,
      booking.salon.businessName,
      date,
      startTime
    );

    // Schedule 2-hour reminder
    await smsService.scheduleBookingReminder(
      customer.phoneNumber,
      booking.salon.businessName,
      date,
      startTime
    );
  }

  return booking;
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

  // Check cancellation policy (3 hours before for customers)
  if (userRole === 'CUSTOMER') {
    const bookingDateTime = new Date(booking.date);
    const [hours, minutes] = booking.startTime.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking < 3) {
      throw new Error('Bookings can only be cancelled at least 3 hours before the appointment time');
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

export async function getAvailableSlots(salonId: string, workerId: string | undefined, date: Date) {
  const dayOfWeek = date.getDay();

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

  // Get existing bookings for the date
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

  // Generate time slots (30-minute intervals)
  const slots: { startTime: string; endTime: string; available: boolean }[] = [];
  const [openHour, openMinute] = salon.openingTime.split(':').map(Number);
  const [closeHour, closeMinute] = salon.closingTime.split(':').map(Number);

  let currentHour = openHour;
  let currentMinute = openMinute;

  while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
    const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    // Add 30 minutes for end time
    let endHour = currentHour;
    let endMinute = currentMinute + 30;
    if (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    // Check if slot is available
    const isBooked = existingBookings.some(
      (booking) =>
        (startTime >= booking.startTime && startTime < booking.endTime) ||
        (endTime > booking.startTime && endTime <= booking.endTime)
    );

    slots.push({
      startTime,
      endTime,
      available: !isBooked,
    });

    // Move to next slot
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentHour += 1;
      currentMinute -= 60;
    }
  }

  return slots;
}

export async function rescheduleBooking(
  id: string,
  userId: string,
  data: { date: Date; startTime: string }
) {
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

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      date: data.date,
      startTime: data.startTime,
      endTime,
    },
  });

  logger.info(`Booking rescheduled: ${id}`);
  return updated;
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

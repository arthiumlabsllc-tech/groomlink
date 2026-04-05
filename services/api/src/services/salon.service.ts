import prisma from '../config/database';
import logger from '../config/logger';
import { SalonType, SalonStatus, Prisma } from '@prisma/client';

export interface CreateSalonData {
  name: string;
  description?: string;
  type: SalonType;
  phoneNumber: string;
  email?: string;
  website?: string;
  address: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  openingTime: string;
  closingTime: string;
  workingDays: string[];
  hasParking?: boolean;
  hasWifi?: boolean;
  hasAC?: boolean;
  acceptsWalkIns?: boolean;
  logo?: string;
  images?: string[];
}

export interface UpdateSalonData extends Partial<CreateSalonData> {
  status?: SalonStatus;
}

export interface SalonFilters {
  type?: SalonType;
  city?: string;
  status?: SalonStatus;
  minRating?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  search?: string;
}

export async function createSalon(ownerId: string, data: CreateSalonData) {
  const salon = await prisma.salon.create({
    data: {
      ...data,
      ownerId,
      status: SalonStatus.PENDING, // Requires admin approval
    },
  });

  logger.info(`Salon created: ${salon.id} by owner: ${ownerId}`);
  return salon;
}

export async function getSalonById(id: string) {
  const salon = await prisma.salon.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      },
      workers: {
        where: { isActive: undefined }, // All workers
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          specialties: true,
          rating: true,
          reviewCount: true,
        },
      },
      services: {
        where: { isActive: true },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
  });

  return salon;
}

export async function getSalons(filters: SalonFilters, page: number = 1, limit: number = 20) {
  const where: Prisma.SalonWhereInput = {
    status: SalonStatus.APPROVED, // Only show approved salons
  };

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.city) {
    where.city = {
      contains: filters.city,
      mode: 'insensitive',
    };
  }

  if (filters.minRating) {
    where.rating = {
      gte: filters.minRating,
    };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { address: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Geolocation filter
  if (filters.latitude && filters.longitude && filters.radius) {
    // Using raw query for PostGIS distance calculation
    // For now, using a simple bounding box approach
    const latDelta = filters.radius / 111; // 1 degree lat ≈ 111km
    const lonDelta = filters.radius / (111 * Math.cos(filters.latitude * Math.PI / 180));

    where.latitude = {
      gte: filters.latitude - latDelta,
      lte: filters.latitude + latDelta,
    };
    where.longitude = {
      gte: filters.longitude - lonDelta,
      lte: filters.longitude + lonDelta,
    };
  }

  const [salons, total] = await Promise.all([
    prisma.salon.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        services: {
          where: { isActive: true },
          take: 3,
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    }),
    prisma.salon.count({ where }),
  ]);

  return { salons, total };
}

export async function updateSalon(id: string, ownerId: string, data: UpdateSalonData) {
  const salon = await prisma.salon.findFirst({
    where: { id, ownerId },
  });

  if (!salon) {
    throw new Error('Salon not found or you do not have permission');
  }

  const updated = await prisma.salon.update({
    where: { id },
    data,
  });

  logger.info(`Salon updated: ${id}`);
  return updated;
}

export async function updateSalonStatus(id: string, status: SalonStatus, reason?: string) {
  const salon = await prisma.salon.update({
    where: { id },
    data: { status },
  });

  logger.info(`Salon ${id} status updated to ${status}${reason ? `: ${reason}` : ''}`);
  return salon;
}

export async function getPendingSalons(page: number = 1, limit: number = 20) {
  const [salons, total] = await Promise.all([
    prisma.salon.findMany({
      where: { status: SalonStatus.PENDING },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        documents: true,
      },
    }),
    prisma.salon.count({ where: { status: SalonStatus.PENDING } }),
  ]);

  return { salons, total };
}

export async function getSalonStats(salonId: string) {
  const [
    totalBookings,
    completedBookings,
    totalRevenue,
    reviewStats,
  ] = await Promise.all([
    prisma.booking.count({ where: { salonId } }),
    prisma.booking.count({ where: { salonId, status: 'COMPLETED' } }),
    prisma.payment.aggregate({
      where: {
        booking: { salonId },
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    }),
    prisma.review.aggregate({
      where: { salonId },
      _avg: { rating: true },
      _count: { id: true },
    }),
  ]);

  return {
    totalBookings,
    completedBookings,
    totalRevenue: totalRevenue._sum.amount || 0,
    averageRating: reviewStats._avg.rating || 0,
    totalReviews: reviewStats._count.id,
  };
}

export async function deleteSalon(id: string, ownerId: string) {
  const salon = await prisma.salon.findFirst({
    where: { id, ownerId },
  });

  if (!salon) {
    throw new Error('Salon not found or you do not have permission');
  }

  await prisma.salon.delete({ where: { id } });
  logger.info(`Salon deleted: ${id}`);
}

export async function getNearbySalons(lat: number, lng: number, radius: number, page: number = 1, limit: number = 20) {
  // Calculate bounding box for approximate distance
  const latDelta = radius / 111; // 1 degree lat ≈ 111km
  const lonDelta = radius / (111 * Math.cos(lat * Math.PI / 180));

  const where: Prisma.SalonWhereInput = {
    status: SalonStatus.APPROVED,
    latitude: {
      gte: lat - latDelta,
      lte: lat + latDelta,
    },
    longitude: {
      gte: lng - lonDelta,
      lte: lng + lonDelta,
    },
  };

  const [salons, total] = await Promise.all([
    prisma.salon.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        services: {
          where: { isActive: true },
          take: 3,
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    }),
    prisma.salon.count({ where }),
  ]);

  // Calculate actual distance and filter by radius
  const salonsWithDistance = salons.map((salon: any) => {
    const distance = calculateDistance(lat, lng, salon.latitude, salon.longitude);
    return { ...salon, distance };
  }).filter((salon: any) => salon.distance <= radius)
    .sort((a: any, b: any) => a.distance - b.distance);

  return { salons: salonsWithDistance, total };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getSalonStaff(salonId: string) {
  const staff = await prisma.worker.findMany({
    where: { salonId, isActive: true },
    include: {
      workerServices: {
        include: {
          service: true,
        },
      },
      availabilities: true,
      _count: {
        select: {
          reviews: true,
          bookings: true,
        },
      },
    },
    orderBy: [
      { rating: 'desc' },
      { fullName: 'asc' },
    ],
  });

  return staff;
}

export async function getSalonServices(salonId: string) {
  const services = await prisma.service.findMany({
    where: { salonId, isActive: true },
    include: {
      workerServices: {
        include: {
          worker: {
            select: {
              id: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' },
    ],
  });

  return services;
}

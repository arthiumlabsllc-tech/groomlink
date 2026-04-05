import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import prisma, { getPoolMetrics } from '../config/database';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';
import { SalonStatus, PaymentStatus } from '@prisma/client';

const couponSchema = z.object({
  code: z.string().min(3),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  usageLimit: z.number().min(1).optional(),
});

const updateCouponSchema = couponSchema.partial();

// Salon Approval
export async function getPendingSalons(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [salons, total] = await Promise.all([
      prisma.salon.findMany({
        where: { status: SalonStatus.PENDING },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
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

    paginatedResponse(res, salons, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function approveSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const salon = await prisma.salon.update({
      where: { id },
      data: { status: SalonStatus.APPROVED },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
      },
    });

    // Create notification for salon owner
    await prisma.notification.create({
      data: {
        userId: salon.ownerId,
        type: 'SYSTEM',
        title: 'Salon Approved',
        message: `Your salon "${salon.businessName}" has been approved and is now live!`,
        data: { salonId: salon.id },
      },
    });

    successResponse(res, salon);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function rejectSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const salon = await prisma.salon.update({
      where: { id },
      data: { status: SalonStatus.REJECTED },
    });

    // Create notification for salon owner
    await prisma.notification.create({
      data: {
        userId: salon.ownerId,
        type: 'SYSTEM',
        title: 'Salon Registration Rejected',
        message: `Your salon "${salon.businessName}" registration was rejected.${reason ? ` Reason: ${reason}` : ''}`,
        data: { salonId: salon.id, reason },
      },
    });

    successResponse(res, salon);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Coupon Management
export async function getCoupons(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isActive = req.query.active === 'true';

    const where: any = {};
    if (isActive) {
      where.isActive = true;
      where.validUntil = { gte: new Date() };
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coupon.count({ where }),
    ]);

    paginatedResponse(res, coupons, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function createCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = couponSchema.parse(req.body);

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        usageLimit: data.usageLimit,
      },
    });

    successResponse(res, coupon, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function updateCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateCouponSchema.parse(req.body);

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
    });

    successResponse(res, coupon);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function deleteCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    await prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });

    successResponse(res, { message: 'Coupon deactivated' });
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

// Transactions & Disputes
export async function getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              salon: { select: { id: true, businessName: true } },
              customer: { select: { id: true, firstName: true, lastName: true } },
              service: { select: { id: true, name: true } },
            },
          },
          user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    paginatedResponse(res, transactions, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getTransactionDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const transaction = await prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            salon: true,
            customer: true,
            worker: true,
            service: true,
            review: true,
          },
        },
        user: true,
      },
    });

    if (!transaction) {
      errorResponse(res, 'NOT_FOUND', 'Transaction not found', 404);
      return;
    }

    successResponse(res, transaction);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function refundTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await prisma.payment.update({
      where: { id, status: PaymentStatus.SUCCESS },
      data: { status: PaymentStatus.REFUNDED },
      include: {
        booking: true,
      },
    });

    // Update booking status
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    // Notify customer
    await prisma.notification.create({
      data: {
        userId: payment.userId,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Refunded',
        message: `Your payment of GHS ${payment.amount} has been refunded.${reason ? ` Reason: ${reason}` : ''}`,
        data: { paymentId: payment.id, bookingId: payment.bookingId },
      },
    });

    successResponse(res, payment);
  } catch (error) {
    errorResponse(res, 'REFUND_FAILED', (error as Error).message, 500);
  }
}

// System Health & Metrics
export async function getSystemHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const [
      totalUsers,
      totalSalons,
      totalBookings,
      totalPayments,
      recentBookings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.salon.count(),
      prisma.booking.count(),
      prisma.payment.count(),
      prisma.booking.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Get database pool metrics
    const poolMetrics = getPoolMetrics();

    successResponse(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats: {
        totalUsers,
        totalSalons,
        totalBookings,
        totalPayments,
        bookingsLast24h: recentBookings,
      },
      database: {
        poolSize: poolMetrics.poolSize,
        totalQueries: poolMetrics.totalQueries,
        slowQueries: poolMetrics.slowQueries,
        slowQueryPercentage: poolMetrics.slowQueryPercentage.toFixed(2) + '%',
      },
    });
  } catch (error) {
    errorResponse(res, 'HEALTH_CHECK_FAILED', (error as Error).message, 500);
  }
}

export async function getSystemMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      dailyBookings,
      dailyRevenue,
      userGrowth,
      salonGrowth,
    ] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM bookings
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, SUM(CAST(amount AS DECIMAL)) as total
        FROM payments
        WHERE created_at >= ${startDate} AND status = 'SUCCESS'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM salons
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ]);

    successResponse(res, {
      period: `${days}d`,
      dailyBookings,
      dailyRevenue,
      userGrowth,
      salonGrowth,
    });
  } catch (error) {
    errorResponse(res, 'METRICS_FAILED', (error as Error).message, 500);
  }
}

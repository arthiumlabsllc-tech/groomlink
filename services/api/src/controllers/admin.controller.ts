import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import prisma, { getPoolMetrics } from '../config/database';
import redis from '../config/redis';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';
import { SalonStatus, PaymentStatus, UserRole, UserStatus, Prisma } from '@prisma/client';
import { sendWelcomeEmail } from '../services/email.service';
import { activityService } from '../services/activity.service';
import * as noshowService from '../services/noshow.service';
import * as completionService from '../services/completion.service';
import logger from '../config/logger';
import axios from 'axios';
import { verifyPaymentWithPaystack } from '../services/payment.service';
import * as escrowService from '../services/escrow.service';
import * as notificationService from '../services/notification.service';

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
    const startTime = process.uptime();
    const memUsage = process.memoryUsage();

    // DB check
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch { dbStatus = 'disconnected'; }

    // Redis check (if redis client available)
    let redisStatus: 'connected' | 'disconnected' = 'connected';
    let redisLatency = 0;
    let redisMemoryUsage = 'N/A';
    try {
      const redisStart = Date.now();
      const { default: redis } = await import('../config/redis');
      await redis.ping();
      redisLatency = Date.now() - redisStart;

      // Get Redis memory info
      const info = await redis.info('memory');
      const match = info.match(/used_memory_human:(.+)/);
      if (match) {
        redisMemoryUsage = match[1].trim();
      }
    } catch { redisStatus = 'disconnected'; }

    // Counts
    const [userCount, salonCount, bookingCount, activeSessionCount] = await Promise.all([
      prisma.user.count(),
      prisma.salon.count(),
      prisma.booking.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 24*60*60*1000) } } }),
    ]);

    // Dashboard stats - salon status counts and bookings in last 24h
    const [approvedSalons, pendingSalons, rejectedSalons, bookingsLast24h] = await Promise.all([
      prisma.salon.count({ where: { status: 'APPROVED' } }),
      prisma.salon.count({ where: { status: 'PENDING' } }),
      prisma.salon.count({ where: { status: 'REJECTED' } }),
      prisma.booking.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
    ]);

    // Suspicious activity - failed login attempts in last 24h
    const recentFailedLogins = await prisma.userActivity.count({
      where: {
        action: { contains: 'LOGIN_FAILED', mode: 'insensitive' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    // Also count suspicious activities
    const recentSuspicious = await prisma.userActivity.count({
      where: { suspicious: true, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    });

    // Get database pool metrics
    const poolMetrics = getPoolMetrics();

    // Get connected socket clients count if available
    let activeSocketConnections = 0;
    try {
      const { getIO } = await import('../config/socket');
      const io = getIO();
      activeSocketConnections = io.engine.clientsCount || 0;
    } catch {
      // Socket.io not initialized or error
      activeSocketConnections = 0;
    }

    successResponse(res, {
      // New format for system monitoring section
      api: {
        status: 'healthy',
        uptime: startTime,
        version: process.version,
      },
      database: {
        status: dbStatus,
        responseTimeMs: dbLatency,
        poolSize: poolMetrics.poolSize,
        totalQueries: poolMetrics.totalQueries,
        slowQueries: poolMetrics.slowQueries,
        slowQueryPercentage: poolMetrics.slowQueryPercentage.toFixed(2) + '%',
      },
      redis: {
        status: redisStatus,
        responseTimeMs: redisLatency,
        memoryUsage: redisMemoryUsage,
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
      },
      activeSessions: {
        count: activeSessionCount,
        socketConnections: activeSocketConnections,
      },
      suspiciousActivity: {
        recentFailedLogins: recentFailedLogins + recentSuspicious,
      },
      // Legacy format for backward compatibility
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      uptime: startTime,
      memoryLegacy: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
      databaseLegacy: {
        status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
        latencyMs: dbLatency,
        poolSize: poolMetrics.poolSize,
        totalQueries: poolMetrics.totalQueries,
        slowQueries: poolMetrics.slowQueries,
        slowQueryPercentage: poolMetrics.slowQueryPercentage.toFixed(2) + '%',
      },
      redisLegacy: { status: redisStatus === 'connected' ? 'healthy' : 'unhealthy', latencyMs: redisLatency },
      counts: {
        users: userCount,
        salons: salonCount,
        bookings: bookingCount,
        activeSessions24h: activeSessionCount
      },
      stats: {
        totalUsers: userCount,
        totalBookings: bookingCount,
        bookingsLast24h,
        pendingSalons,
        approvedSalons,
        rejectedSalons,
      },
      suspiciousActivitiesLastHour: recentSuspicious,
      timestamp: new Date().toISOString(),
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
      dailyBookingsRaw,
      dailyRevenueRaw,
      userGrowthRaw,
      salonGrowthRaw,
    ] = await Promise.all([
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM bookings
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ date: Date; total: unknown }>>`
        SELECT DATE(created_at) as date, SUM(CAST(amount AS DECIMAL)) as total
        FROM payments
        WHERE created_at >= ${startDate} AND status = 'SUCCESS'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM salons
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ]);

    // Convert bigint to number for JSON serialization
    const dailyBookings = dailyBookingsRaw.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: Number(row.count),
    }));
    const dailyRevenue = dailyRevenueRaw.map(row => ({
      date: row.date.toISOString().split('T')[0],
      total: Number(row.total),
    }));
    const userGrowth = userGrowthRaw.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: Number(row.count),
    }));
    const salonGrowth = salonGrowthRaw.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: Number(row.count),
    }));

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

// Admin Management
const createAdminSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  pages: z.array(z.string()).optional().default(['dashboard']),
});

export async function createAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = createAdminSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      errorResponse(res, 'EMAIL_EXISTS', 'User already exists with this email', 400);
      return;
    }

    // Create user with ADMIN role
    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isVerified: true,
      }
    });

    // Create admin permission
    const permission = await prisma.adminPermission.create({
      data: {
        userId: user.id,
        pages: data.pages,
        createdBy: req.user!.id,
      }
    });

    // Send welcome email
    await sendWelcomeEmail(data.email, data.firstName);

    successResponse(res, {
      ...user,
      permissions: permission,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function getAdmins(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const where: any = {
      role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] }
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [admins, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          adminPermission: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    paginatedResponse(res, admins, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function updateAdminPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { pages } = req.body;

    if (!Array.isArray(pages)) {
      errorResponse(res, 'VALIDATION_ERROR', 'Pages must be an array', 400);
      return;
    }

    // Check if user exists and is an admin
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      errorResponse(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      errorResponse(res, 'FORBIDDEN', 'Cannot modify SUPER_ADMIN permissions', 403);
      return;
    }

    // Upsert admin permission
    const permission = await prisma.adminPermission.upsert({
      where: { userId: id },
      create: {
        userId: id,
        pages,
        createdBy: req.user!.id,
      },
      update: {
        pages,
      }
    });

    successResponse(res, permission);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function deleteAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      errorResponse(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      errorResponse(res, 'FORBIDDEN', 'Cannot delete SUPER_ADMIN', 403);
      return;
    }

    // Delete admin permission if exists
    await prisma.adminPermission.deleteMany({
      where: { userId: id }
    });

    // Set user status to INACTIVE (demote)
    await prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE, role: UserRole.CUSTOMER }
    });

    successResponse(res, { message: 'Admin access revoked successfully' });
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

// Site Settings
const siteSettingsSchema = z.object({
  siteName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

// Payment Settings Schema
const paymentSettingsSchema = z.object({
  paymentGateway: z.string().default('paystack'),
  paystackPublicKey: z.string().max(500).optional().nullable(),
  paystackSecretKey: z.string().max(500).optional().nullable(),
  isPaymentTestMode: z.boolean().optional(),
  transactionFeePercent: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num as number) ? null : num;
    },
    z.union([
      z.number().min(0).max(100),
      z.null(),
    ])
  ).optional(),
}).transform((data) => ({
  ...data,
  // Convert empty strings to null
  paystackPublicKey: data.paystackPublicKey === '' ? null : data.paystackPublicKey,
  paystackSecretKey: data.paystackSecretKey === '' ? null : data.paystackSecretKey,
}));

export async function getSiteSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' }
    });

    // Create default settings if not found
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: 'default' }
      });
    }

    successResponse(res, settings);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function updateSiteSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = siteSettingsSchema.parse(req.body);

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...data,
        updatedBy: req.user!.id,
      },
      update: {
        ...data,
        updatedBy: req.user!.id,
      }
    });

    successResponse(res, settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Payment Settings
export async function getPaymentSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' }
    });

    // Create default settings if not found
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: 'default' }
      });
    }

    // Mask the secret key - show only last 4 characters
    const maskedSecretKey = settings.paystackSecretKey
      ? `****${settings.paystackSecretKey.slice(-4)}`
      : null;

    successResponse(res, {
      paymentGateway: settings.paymentGateway,
      paystackPublicKey: settings.paystackPublicKey,
      paystackSecretKey: maskedSecretKey,
      isPaymentTestMode: settings.isPaymentTestMode,
      transactionFeePercent: settings.transactionFeePercent,
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function updatePaymentSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = paymentSettingsSchema.parse(req.body);

    // Get existing settings
    let existingSettings = await prisma.siteSettings.findUnique({
      where: { id: 'default' }
    });

    if (!existingSettings) {
      existingSettings = await prisma.siteSettings.create({
        data: { id: 'default' }
      });
    }

    // If secret key contains '****', keep the existing key (user didn't change it)
    const updateData: any = {
      paymentGateway: data.paymentGateway,
      updatedBy: req.user!.id,
    };

    if (data.paystackPublicKey !== undefined) {
      updateData.paystackPublicKey = data.paystackPublicKey || null;
    }

    if (data.paystackSecretKey !== undefined && data.paystackSecretKey !== null && !data.paystackSecretKey.includes('****')) {
      updateData.paystackSecretKey = data.paystackSecretKey || null;
    }
    // If secret key contains '****', don't update it

    if (data.isPaymentTestMode !== undefined) {
      updateData.isPaymentTestMode = data.isPaymentTestMode;
    }

    if (data.transactionFeePercent !== undefined) {
      updateData.transactionFeePercent = data.transactionFeePercent;
    }

    const settings = await prisma.siteSettings.update({
      where: { id: 'default' },
      data: updateData,
    });

    // Return with masked secret key
    const maskedSecretKey = settings.paystackSecretKey
      ? `****${settings.paystackSecretKey.slice(-4)}`
      : null;

    successResponse(res, {
      paymentGateway: settings.paymentGateway,
      paystackPublicKey: settings.paystackPublicKey,
      paystackSecretKey: maskedSecretKey,
      isPaymentTestMode: settings.isPaymentTestMode,
      transactionFeePercent: settings.transactionFeePercent,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function toggleMaintenanceMode(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { enabled, message } = req.body;

    if (typeof enabled !== 'boolean') {
      errorResponse(res, 'VALIDATION_ERROR', 'Enabled must be a boolean', 400);
      return;
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        maintenanceMode: enabled,
        maintenanceMsg: message || null,
        updatedBy: req.user!.id,
      },
      update: {
        maintenanceMode: enabled,
        maintenanceMsg: message || null,
        updatedBy: req.user!.id,
      }
    });

    successResponse(res, settings);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// User Activity & Security
export async function getUserActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await activityService.getUserActivities(id, page, limit);
    paginatedResponse(res, result.activities, page, limit, result.total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function getSuspiciousUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await activityService.getSuspiciousActivities(page, limit);
    paginatedResponse(res, result.activities, page, limit, result.total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function banUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      errorResponse(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      errorResponse(res, 'FORBIDDEN', 'Cannot ban SUPER_ADMIN', 403);
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED }
    });

    // Track admin activity
    await activityService.trackActivity(req.user!.id, 'USER_BANNED', req as any, { targetUserId: id, reason });

    successResponse(res, { message: 'User banned successfully' });
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function unbanUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      errorResponse(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE }
    });

    // Track admin activity
    await activityService.trackActivity(req.user!.id, 'USER_UNBANNED', req as any, { targetUserId: id });

    successResponse(res, { message: 'User unbanned successfully' });
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Salon Management (Admin)
const adminCreateSalonSchema = z.object({
  businessName: z.string().min(2),
  type: z.enum(['BARBERSHOP', 'HAIR_SALON', 'PEDICURE_SALON', 'NAIL_SALON', 'SPA', 'BEAUTY_SALON']),
  phoneNumber: z.string(),
  address: z.string(),
  city: z.string(),
  region: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  workingDays: z.array(z.string()),
  description: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  ownerId: z.string().optional(),
});

export async function adminCreateSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = adminCreateSalonSchema.parse(req.body);

    let ownerId = data.ownerId;

    // If ownerId provided, verify it exists
    if (ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: ownerId } });
      if (!owner) {
        errorResponse(res, 'NOT_FOUND', 'Owner not found', 404);
        return;
      }
    }

    const salon = await prisma.salon.create({
      data: {
        businessName: data.businessName,
        type: data.type as any,
        phoneNumber: data.phoneNumber,
        address: data.address,
        city: data.city,
        region: data.region,
        latitude: data.latitude,
        longitude: data.longitude,
        openingTime: data.openingTime,
        closingTime: data.closingTime,
        workingDays: data.workingDays,
        description: data.description,
        email: data.email,
        website: data.website,
        status: SalonStatus.APPROVED,
        ownerId: ownerId || req.user!.id,
      }
    });

    successResponse(res, salon, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function adminGetSalonDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const salon = await prisma.salon.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true }
        },
        workers: true,
        services: true,
        bookings: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true } },
            service: { select: { id: true, name: true } },
            payment: true,
          }
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true } }
          }
        },
        documents: true,
      }
    });

    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    // Calculate revenue
    const revenue = await prisma.payment.aggregate({
      where: {
        booking: { salonId: id },
        status: PaymentStatus.SUCCESS
      },
      _sum: { amount: true }
    });

    successResponse(res, {
      ...salon,
      revenue: revenue._sum.amount || 0
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function adminGetAllSalons(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [salons, total] = await Promise.all([
      prisma.salon.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }),
      prisma.salon.count({ where })
    ]);

    paginatedResponse(res, salons, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Customer Management (Admin)
const adminCreateCustomerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
});

export async function adminCreateCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = adminCreateCustomerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      errorResponse(res, 'EMAIL_EXISTS', 'User already exists with this email', 400);
      return;
    }

    // Check if phone number already exists
    if (data.phoneNumber) {
      const existingPhone = await prisma.user.findUnique({
        where: { phoneNumber: data.phoneNumber }
      });
      if (existingPhone) {
        errorResponse(res, 'PHONE_EXISTS', 'User already exists with this phone number', 400);
        return;
      }
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber || null,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        isVerified: true,
      }
    });

    successResponse(res, user, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

export async function adminGetUserDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        bookings: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            salon: { select: { id: true, businessName: true } },
            service: { select: { id: true, name: true } },
            payment: true,
          }
        },
        payments: {
          take: 20,
          orderBy: { createdAt: 'desc' }
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            salon: { select: { id: true, businessName: true } }
          }
        },
        favorites: {
          include: {
            salon: { select: { id: true, businessName: true } }
          }
        },
        activities: {
          take: 20,
          orderBy: { createdAt: 'desc' }
        },
        salons: {
          where: { status: { not: undefined } }
        }
      }
    });

    if (!user) {
      errorResponse(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    // Calculate stats
    const totalBookings = await prisma.booking.count({ where: { customerId: id } });
    const totalSpent = await prisma.payment.aggregate({
      where: { userId: id, status: PaymentStatus.SUCCESS },
      _sum: { amount: true }
    });

    successResponse(res, {
      ...user,
      stats: {
        totalBookings,
        totalSpent: totalSpent._sum.amount || 0,
        lastActive: user.lastLoginAt
      }
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Recent Activities for Dashboard
export async function getRecentActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    // Fetch activities from UserActivity table
    const userActivities = await prisma.userActivity.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // If we have enough activities, return them
    if (userActivities.length >= limit) {
      const activities = userActivities.map((a: Prisma.UserActivityGetPayload<{include: {user: {select: {id: true, firstName: true, lastName: true, email: true}}}}>) => ({
        id: a.id,
        type: a.action,
        description: a.action,
        user: a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown',
        email: a.user?.email,
        createdAt: a.createdAt
      }));
      successResponse(res, activities);
      return;
    }

    // Otherwise, aggregate recent bookings, payments, and salon registrations
    const [recentBookings, recentPayments, recentSalons] = await Promise.all([
      prisma.booking.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }),
      prisma.payment.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      }),
      prisma.salon.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      })
    ]);

    // Combine and format all activities
    const allActivities: Array<{
      id: string;
      type: string;
      description: string;
      user: string;
      email?: string | null;
      createdAt: Date;
    }> = [
      ...userActivities.map((a: Prisma.UserActivityGetPayload<{include: {user: {select: {id: true, firstName: true, lastName: true, email: true}}}}>) => ({
        id: a.id,
        type: a.action,
        description: a.action,
        user: a.user ? `${a.user.firstName} ${a.user.lastName}` : 'Unknown',
        email: a.user?.email,
        createdAt: a.createdAt
      })),
      ...recentBookings.map(b => ({
        id: b.id,
        type: 'BOOKING_CREATED',
        description: `New booking created`,
        user: `${b.customer.firstName} ${b.customer.lastName}`,
        email: b.customer.email,
        createdAt: b.createdAt
      })),
      ...recentPayments.map(p => ({
        id: p.id,
        type: 'PAYMENT_RECEIVED',
        description: `Payment of GHS ${p.amount}`,
        user: `${p.user.firstName} ${p.user.lastName}`,
        email: p.user.email,
        createdAt: p.createdAt
      })),
      ...recentSalons.map(s => ({
        id: s.id,
        type: 'SALON_REGISTERED',
        description: `Salon "${s.businessName}" registered`,
        user: s.owner ? `${s.owner.firstName} ${s.owner.lastName}` : 'Unknown',
        email: s.owner?.email,
        createdAt: s.createdAt
      }))
    ];

    // Sort by createdAt descending and limit
    allActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const limitedActivities = allActivities.slice(0, limit);

    successResponse(res, limitedActivities);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Salon Suspend
export async function suspendSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: { status: SalonStatus.SUSPENDED },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true }
        }
      }
    });

    // Create notification for salon owner
    await prisma.notification.create({
      data: {
        userId: salon.ownerId,
        type: 'SYSTEM',
        title: 'Salon Suspended',
        message: `Your salon "${salon.businessName}" has been suspended. Please contact support for more information.`,
        data: { salonId: salon.id }
      }
    });

    // Track admin activity
    await activityService.trackActivity(req.user!.id, 'SALON_SUSPENDED', req as any, { salonId: id, salonName: salon.businessName });

    successResponse(res, updatedSalon);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Salon Reactivate
export async function reactivateSalon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      errorResponse(res, 'NOT_FOUND', 'Salon not found', 404);
      return;
    }

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: { status: SalonStatus.APPROVED },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true }
        }
      }
    });

    // Create notification for salon owner
    await prisma.notification.create({
      data: {
        userId: salon.ownerId,
        type: 'SYSTEM',
        title: 'Salon Reactivated',
        message: `Your salon "${salon.businessName}" has been reactivated and is now live!`,
        data: { salonId: salon.id }
      }
    });

    // Track admin activity
    await activityService.trackActivity(req.user!.id, 'SALON_REACTIVATED', req as any, { salonId: id, salonName: salon.businessName });

    successResponse(res, updatedSalon);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// Public Site Settings (No Auth)
export async function getPublicSiteSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' }
    });

    // Create default settings if not found
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: 'default' }
      });
    }

    // Return only public-safe fields
    const publicSettings = {
      siteName: settings.siteName,
      logoUrl: settings.logoUrl,
      email: settings.email,
      phoneNumber: settings.phoneNumber,
      address: settings.address,
      maintenanceMode: settings.maintenanceMode
    };

    successResponse(res, publicSettings);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Booking Statistics
export async function getBookingStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const period = (req.query.period as string) || '30d';
    
    // Parse period to days
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get booking counts by status within the period
    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      confirmedBookings,
      inProgressBookings,
      noShowBookings,
    ] = await Promise.all([
      prisma.booking.count({
        where: { createdAt: { gte: startDate } }
      }),
      prisma.booking.count({
        where: { createdAt: { gte: startDate }, status: 'COMPLETED' }
      }),
      prisma.booking.count({
        where: { createdAt: { gte: startDate }, status: 'CANCELLED' }
      }),
      prisma.booking.count({
        where: { createdAt: { gte: startDate }, status: 'PENDING' }
      }),
      prisma.booking.count({
        where: { createdAt: { gte: startDate }, status: 'CONFIRMED' }
      }),
      prisma.booking.count({
        where: { createdAt: { gte: startDate }, status: 'IN_PROGRESS' }
      }),
      prisma.booking.count({
        where: { createdAt: { gte: startDate }, status: 'NO_SHOW' }
      }),
    ]);

    // Get daily breakdown for charts
    const dailyBreakdown = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM bookings
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Format daily breakdown
    const daily = dailyBreakdown.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      count: Number(row.count),
    }));

    // Fill in missing dates with zero counts
    const filledDaily: Array<{ date: string; count: number }> = [];
    const dateMap = new Map(daily.map(d => [d.date, d.count]));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      filledDaily.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0,
      });
    }

    successResponse(res, {
      period,
      total: totalBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      pending: pendingBookings,
      confirmed: confirmedBookings,
      inProgress: inProgressBookings,
      noShow: noShowBookings,
      dailyBreakdown: filledDaily,
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Revenue Statistics
export async function getRevenueStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const period = (req.query.period as string) || '30d';
    
    // Parse period to days
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get revenue stats within the period
    const revenueStats = await prisma.payment.aggregate({
      where: {
        createdAt: { gte: startDate },
        status: PaymentStatus.SUCCESS,
      },
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    });

    // Get daily breakdown for charts
    const dailyBreakdown = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, SUM(CAST(amount AS DECIMAL)) as total
      FROM payments
      WHERE created_at >= ${startDate} AND status = 'SUCCESS'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as Array<{ date: Date; total: unknown }>;

    // Format daily breakdown
    const daily = dailyBreakdown.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      amount: Number(row.total),
    }));

    // Fill in missing dates with zero amounts
    const filledDaily: Array<{ date: string; amount: number }> = [];
    const dateMap = new Map(daily.map(d => [d.date, d.amount]));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      filledDaily.push({
        date: dateStr,
        amount: dateMap.get(dateStr) || 0,
      });
    }

    successResponse(res, {
      period,
      totalRevenue: Number(revenueStats._sum.amount || 0),
      transactionCount: revenueStats._count,
      averageTransaction: Number(revenueStats._avg.amount || 0),
      dailyBreakdown: filledDaily,
    });
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// ===========================================
// PAYSTACK BALANCE
// ===========================================

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Get Paystack account balance
 * GET /admin/paystack-balance
 */
export async function getPaystackBalanceHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Get Paystack keys from SiteSettings or environment
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' }
    });
    
    const secretKey = settings?.paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
    const keySource = settings?.paystackSecretKey ? 'database' : 'environment';
    
    logger.info('Paystack balance request', {
      keySource,
      hasSecretKey: !!secretKey,
      dbKeyExists: !!settings?.paystackSecretKey,
      envKeyExists: !!process.env.PAYSTACK_SECRET_KEY,
    });
    
    if (!secretKey) {
      errorResponse(res, 'NOT_CONFIGURED', 'Paystack secret key not configured. Please set up Paystack keys in Settings.', 400);
      return;
    }

    // Call Paystack API to get balance
    const response = await axios.get(`${PAYSTACK_BASE_URL}/balance`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Paystack returns balance in pesewas (smallest currency unit)
    // Convert to GHS (divide by 100)
    const balanceData = response.data.data;
    const formattedBalance = balanceData.map((item: { currency: string; balance: number }) => ({
      currency: item.currency,
      balance: item.balance / 100, // Convert from pesewas to GHS
      rawBalance: item.balance,
    }));

    logger.info('Paystack balance fetched successfully', {
      currencies: formattedBalance.map((b: { currency: string }) => b.currency),
      ghsBalance: formattedBalance.find((b: { currency: string }) => b.currency === 'GHS')?.balance,
    });

    successResponse(res, {
      balances: formattedBalance,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch Paystack balance', { 
      error: (error as Error).message,
      responseData: (error as any).response?.data,
      statusCode: (error as any).response?.status,
    });
    errorResponse(res, 'FETCH_FAILED', 'Failed to fetch Paystack balance', 500);
  }
}

// ===========================================
// COMPREHENSIVE REVENUE STATS
// ===========================================

/**
 * Get comprehensive revenue statistics including escrow data
 * GET /admin/revenue/comprehensive
 */
export async function getComprehensiveRevenueStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Get total revenue from successful payments
    const totalRevenueResult = await prisma.payment.aggregate({
      where: { status: PaymentStatus.SUCCESS },
      _sum: { amount: true },
      _count: true,
    });

    // Get platform fees earned (sum of platformFee from EscrowAccount)
    const platformFeesResult = await prisma.escrowAccount.aggregate({
      _sum: { platformFee: true },
    });

    // Get pending payouts (sum of providerAmount where status = 'held')
    const pendingPayoutsResult = await prisma.escrowAccount.aggregate({
      where: { status: 'held' },
      _sum: { providerAmount: true },
    });

    // Get completed payouts (sum of providerAmount where status = 'released')
    const completedPayoutsResult = await prisma.escrowAccount.aggregate({
      where: { status: 'released' },
      _sum: { providerAmount: true },
    });

    // Get refunded amount
    const refundedResult = await prisma.payment.aggregate({
      where: { status: PaymentStatus.REFUNDED },
      _sum: { amount: true },
      _count: true,
    });

    // Get recent revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRevenueResult = await prisma.payment.aggregate({
      where: {
        status: PaymentStatus.SUCCESS,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Log raw results for debugging
    logger.info('Comprehensive revenue stats fetched', {
      rawTotalRevenue: totalRevenueResult._sum.amount,
      rawPlatformFees: platformFeesResult._sum.platformFee,
      rawPendingPayouts: pendingPayoutsResult._sum.providerAmount,
      rawCompletedPayouts: completedPayoutsResult._sum.providerAmount,
      totalTransactions: totalRevenueResult._count,
      pendingEscrowCount: await prisma.escrowAccount.count({ where: { status: 'held' } }),
      releasedEscrowCount: await prisma.escrowAccount.count({ where: { status: 'released' } }),
      successfulPaymentCount: await prisma.payment.count({ where: { status: PaymentStatus.SUCCESS } }),
    });

    successResponse(res, {
      totalRevenue: Number(totalRevenueResult._sum.amount || 0),
      totalTransactions: totalRevenueResult._count,
      platformFeesEarned: Number(platformFeesResult._sum.platformFee || 0),
      pendingPayouts: Number(pendingPayoutsResult._sum.providerAmount || 0),
      completedPayouts: Number(completedPayoutsResult._sum.providerAmount || 0),
      refundedAmount: Number(refundedResult._sum.amount || 0),
      refundedCount: refundedResult._count,
      recentRevenue30d: Number(recentRevenueResult._sum.amount || 0),
      recentTransactions30d: recentRevenueResult._count,
    });
  } catch (error) {
    logger.error('Failed to fetch comprehensive revenue stats', { error: (error as Error).message });
    errorResponse(res, 'FETCH_FAILED', 'Failed to fetch revenue statistics', 500);
  }
}

// ===========================================
// ESCROW MANAGEMENT
// ===========================================

/**
 * Get escrow dashboard with pagination and status filter
 */
export async function getEscrowDashboardHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [escrows, total] = await Promise.all([
      prisma.escrowAccount.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              reference: true,
              date: true,
              startTime: true,
              status: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          salon: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      }),
      prisma.escrowAccount.count({ where }),
    ]);

    paginatedResponse(res, escrows, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// ===========================================
// PLATFORM POLICIES
// ===========================================

/**
 * Get all platform policies
 */
export async function getPoliciesHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const policies = await prisma.platformPolicy.findMany({
      orderBy: { policyName: 'asc' },
    });

    successResponse(res, policies);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

const updatePolicySchema = z.object({
  policyValue: z.string().min(1, 'Policy value is required'),
});

/**
 * Update a platform policy
 */
export async function updatePolicyHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = updatePolicySchema.parse(req.body);

    // Get the current policy to find the policy name for cache invalidation
    const currentPolicy = await prisma.platformPolicy.findUnique({
      where: { id },
    });

    if (!currentPolicy) {
      errorResponse(res, 'NOT_FOUND', 'Policy not found', 404);
      return;
    }

    // Update the policy
    const updatedPolicy = await prisma.platformPolicy.update({
      where: { id },
      data: { policyValue: validatedData.policyValue },
    });

    // Invalidate Redis cache for this policy
    const cacheKey = `policy:${currentPolicy.policyName}`;
    await redis.del(cacheKey);

    logger.info(`Platform policy updated and cache invalidated`, {
      policyId: id,
      policyName: currentPolicy.policyName,
      updatedBy: req.user?.id,
    });

    successResponse(res, updatedPolicy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// ===========================================
// CANCELLATION RECORDS
// ===========================================

/**
 * Get cancellation records with pagination
 */
export async function getCancellationsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const cancelledBy = req.query.cancelledBy as string;

    const where: any = {};
    if (cancelledBy) {
      where.cancelledBy = cancelledBy;
    }

    const [cancellations, total] = await Promise.all([
      prisma.cancellationRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { cancellationTime: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              reference: true,
              date: true,
              startTime: true,
              salon: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.cancellationRecord.count({ where }),
    ]);

    paginatedResponse(res, cancellations, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// ===========================================
// NO-SHOW RECORDS
// ===========================================

/**
 * Get no-show records with pagination
 */
export async function getNoShowsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const disputed = req.query.disputed as string;

    const where: any = {};
    if (disputed === 'true') {
      where.disputed = true;
    } else if (disputed === 'false') {
      where.disputed = false;
    }

    const [noShows, total] = await Promise.all([
      prisma.noShowRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { markedAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              reference: true,
              date: true,
              startTime: true,
              salon: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.noShowRecord.count({ where }),
    ]);

    paginatedResponse(res, noShows, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

const resolveDisputeSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required'),
  upheld: z.boolean(),
});

/**
 * Resolve a no-show dispute
 */
export async function resolveDisputeHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = resolveDisputeSchema.parse(req.body);

    const updatedRecord = await noshowService.resolveDispute({
      noShowRecordId: id,
      resolution: validatedData.resolution,
      upheld: validatedData.upheld,
    });

    logger.info(`No-show dispute resolved by admin`, {
      noShowRecordId: id,
      upheld: validatedData.upheld,
      resolvedBy: req.user?.id,
    });

    successResponse(res, updatedRecord);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'RESOLVE_FAILED', (error as Error).message, 500);
  }
}

// ===========================================
// COMPLETION DISPUTE RESOLUTION
// ===========================================

const resolveCompletionDisputeSchema = z.object({
  resolution: z.string().min(1, 'Resolution is required'),
  releaseToProvider: z.boolean(),
  refundToCustomer: z.boolean(),
});

/**
 * Resolve a completion dispute (admin only)
 * PUT /admin/disputes/:id/resolve
 */
export async function resolveCompletionDisputeHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const validatedData = resolveCompletionDisputeSchema.parse(req.body);

    const result = await completionService.resolveDispute(
      id,
      validatedData.resolution,
      validatedData.releaseToProvider,
      validatedData.refundToCustomer
    );

    logger.info(`Completion dispute resolved by admin`, {
      bookingId: id,
      resolution: validatedData.resolution,
      releaseToProvider: validatedData.releaseToProvider,
      refundToCustomer: validatedData.refundToCustomer,
      resolvedBy: req.user?.id,
    });

    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'RESOLVE_FAILED', (error as Error).message, 500);
  }
}

// ===========================================
// PAYMENT SYNC WITH PAYSTACK
// ===========================================

/**
 * Sync a single payment status with Paystack
 * POST /admin/payments/:paymentId/sync
 */
export async function syncPaymentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { paymentId } = req.params;

    // Get the payment with booking info
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
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
            service: {
              select: {
                id: true,
                name: true,
              },
            },
            worker: {
              select: {
                fullName: true,
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
        },
      },
    });

    if (!payment) {
      errorResponse(res, 'NOT_FOUND', 'Payment not found', 404);
      return;
    }

    // Only sync payments that are in PROCESSING or PENDING status
    if (payment.status !== PaymentStatus.PROCESSING && payment.status !== PaymentStatus.PENDING) {
      successResponse(res, {
        message: 'Payment status does not require sync',
        paymentId: payment.id,
        currentStatus: payment.status,
        synced: false,
      });
      return;
    }

    if (!payment.providerRef) {
      errorResponse(res, 'INVALID_STATE', 'Payment has no provider reference', 400);
      return;
    }

    // Call Paystack to verify the payment
    const verification = await verifyPaymentWithPaystack(payment.providerRef);

    if (verification.error) {
      errorResponse(res, 'SYNC_FAILED', verification.error, 500);
      return;
    }

    let updated = false;
    let newStatus = payment.status;

    // If Paystack says it's successful, update the payment and booking
    if (verification.success && verification.status === 'success') {
      const completedAt = new Date();

      // Update payment to SUCCESS
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          completedAt,
          providerData: verification.data,
        },
      });

      // Calculate cancellation deadline based on policy
      let cancellationDeadline: Date | undefined;
      try {
        const freeCancellationHoursStr = await escrowService.getPolicyValue('free_cancellation_hours');
        const freeCancellationHours = parseInt(freeCancellationHoursStr, 10) || 48;
        const bookingDateTime = new Date(`${payment.booking.date.toISOString().split('T')[0]}T${payment.booking.startTime}`);
        cancellationDeadline = new Date(bookingDateTime.getTime() - (freeCancellationHours * 60 * 60 * 1000));
      } catch (policyError) {
        logger.warn('Failed to get free_cancellation_hours policy, using default 48h', { policyError });
        const bookingDateTime = new Date(`${payment.booking.date.toISOString().split('T')[0]}T${payment.booking.startTime}`);
        cancellationDeadline = new Date(bookingDateTime.getTime() - (48 * 60 * 60 * 1000));
      }

      // Update booking to CONFIRMED
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: 'CONFIRMED',
          cancellationDeadline,
          refundEligible: true,
          refundPercentage: 100,
        },
      });

      // Create escrow account
      try {
        await escrowService.createEscrow({
          bookingId: payment.booking.id,
          customerId: payment.booking.customer.id,
          providerId: payment.booking.salon.owner?.id || payment.booking.salon.id,
          salonId: payment.booking.salon.id,
          amount: Number(payment.amount),
          paymentTransactionId: payment.providerRef || undefined,
        });
        logger.info(`Escrow created for booking: ${payment.booking.id} via admin sync`);
      } catch (escrowError) {
        logger.error('Failed to create escrow after admin sync payment success:', {
          paymentId,
          bookingId: payment.bookingId,
          error: escrowError,
        });
      }

      // Send notification to customer
      notificationService.notifyPaymentReceived(
        payment.booking.customer.id,
        payment.booking.id,
        Number(payment.amount),
        payment.booking.service.name
      ).catch((err) => logger.error('Failed to send payment notification to customer', { err }));

      // Notify salon owner
      if (payment.booking.salon.owner?.id) {
        notificationService.notifyPaymentReceived(
          payment.booking.salon.owner.id,
          payment.booking.id,
          Number(payment.amount),
          payment.booking.service.name
        ).catch((err) => logger.error('Failed to send payment notification to salon owner', { err }));
      }

      updated = true;
      newStatus = PaymentStatus.SUCCESS;

      logger.info(`Payment synced to SUCCESS via admin: ${paymentId}`, {
        paystackRef: payment.providerRef,
        adminUserId: req.user?.id,
      });
    } else if (verification.status === 'failed' || verification.status === 'abandoned') {
      // If Paystack says it failed, update to FAILED
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          providerData: verification.data,
        },
      });

      updated = true;
      newStatus = PaymentStatus.FAILED;

      logger.info(`Payment synced to FAILED via admin: ${paymentId}`, {
        paystackRef: payment.providerRef,
        paystackStatus: verification.status,
        adminUserId: req.user?.id,
      });
    } else {
      // Still pending or processing on Paystack side
      logger.info(`Payment still pending on Paystack: ${paymentId}`, {
        paystackRef: payment.providerRef,
        paystackStatus: verification.status,
      });
    }

    successResponse(res, {
      message: updated ? `Payment synced successfully` : 'Payment status unchanged',
      paymentId: payment.id,
      previousStatus: payment.status,
      newStatus,
      paystackStatus: verification.status,
      paystackAmount: verification.amount,
      paystackCurrency: verification.currency,
      synced: updated,
    });
  } catch (error) {
    logger.error('Payment sync error:', { paymentId: req.params.paymentId, error });
    errorResponse(res, 'SYNC_FAILED', (error as Error).message, 500);
  }
}

/**
 * Bulk sync all PROCESSING payments with Paystack
 * POST /admin/payments/sync-all
 */
export async function syncAllProcessingPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // Get all payments in PROCESSING status
    const processingPayments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.PROCESSING,
        providerRef: { not: null }, // Only get payments with a provider reference
      },
      include: {
        booking: {
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
            service: {
              select: {
                id: true,
                name: true,
              },
            },
            worker: {
              select: {
                fullName: true,
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
        },
      },
    });

    logger.info(`Starting bulk sync of ${processingPayments.length} processing payments`, {
      adminUserId: req.user?.id,
    });

    const results = {
      total: processingPayments.length,
      updatedToSuccess: 0,
      updatedToFailed: 0,
      unchanged: 0,
      errors: 0,
      details: [] as Array<{
        paymentId: string;
        reference: string;
        previousStatus: string;
        newStatus: string;
        paystackStatus: string;
        error?: string;
      }>,
    };

    // Process each payment
    for (const payment of processingPayments) {
      try {
        if (!payment.providerRef) {
          results.errors++;
          results.details.push({
            paymentId: payment.id,
            reference: '',
            previousStatus: payment.status,
            newStatus: payment.status,
            paystackStatus: 'error',
            error: 'No provider reference',
          });
          continue;
        }

        // Call Paystack to verify
        const verification = await verifyPaymentWithPaystack(payment.providerRef);

        if (verification.error) {
          results.errors++;
          results.details.push({
            paymentId: payment.id,
            reference: payment.providerRef,
            previousStatus: payment.status,
            newStatus: payment.status,
            paystackStatus: 'error',
            error: verification.error,
          });
          continue;
        }

        // If Paystack says it's successful, update the payment and booking
        if (verification.success && verification.status === 'success') {
          const completedAt = new Date();

          // Update payment to SUCCESS
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              completedAt,
              providerData: verification.data,
            },
          });

          // Calculate cancellation deadline based on policy
          let cancellationDeadline: Date | undefined;
          try {
            const freeCancellationHoursStr = await escrowService.getPolicyValue('free_cancellation_hours');
            const freeCancellationHours = parseInt(freeCancellationHoursStr, 10) || 48;
            const bookingDateTime = new Date(`${payment.booking.date.toISOString().split('T')[0]}T${payment.booking.startTime}`);
            cancellationDeadline = new Date(bookingDateTime.getTime() - (freeCancellationHours * 60 * 60 * 1000));
          } catch (policyError) {
            logger.warn('Failed to get free_cancellation_hours policy, using default 48h', { policyError });
            const bookingDateTime = new Date(`${payment.booking.date.toISOString().split('T')[0]}T${payment.booking.startTime}`);
            cancellationDeadline = new Date(bookingDateTime.getTime() - (48 * 60 * 60 * 1000));
          }

          // Update booking to CONFIRMED
          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: 'CONFIRMED',
              cancellationDeadline,
              refundEligible: true,
              refundPercentage: 100,
            },
          });

          // Create escrow account
          try {
            await escrowService.createEscrow({
              bookingId: payment.booking.id,
              customerId: payment.booking.customer.id,
              providerId: payment.booking.salon.owner?.id || payment.booking.salon.id,
              salonId: payment.booking.salon.id,
              amount: Number(payment.amount),
              paymentTransactionId: payment.providerRef || undefined,
            });
            logger.info(`Escrow created for booking: ${payment.booking.id} via bulk sync`);
          } catch (escrowError) {
            logger.error('Failed to create escrow after bulk sync payment success:', {
              paymentId: payment.id,
              bookingId: payment.bookingId,
              error: escrowError,
            });
          }

          // Send notifications
          notificationService.notifyPaymentReceived(
            payment.booking.customer.id,
            payment.booking.id,
            Number(payment.amount),
            payment.booking.service.name
          ).catch((err) => logger.error('Failed to send payment notification to customer', { err }));

          if (payment.booking.salon.owner?.id) {
            notificationService.notifyPaymentReceived(
              payment.booking.salon.owner.id,
              payment.booking.id,
              Number(payment.amount),
              payment.booking.service.name
            ).catch((err) => logger.error('Failed to send payment notification to salon owner', { err }));
          }

          results.updatedToSuccess++;
          results.details.push({
            paymentId: payment.id,
            reference: payment.providerRef,
            previousStatus: payment.status,
            newStatus: PaymentStatus.SUCCESS,
            paystackStatus: verification.status,
          });
        } else if (verification.status === 'failed' || verification.status === 'abandoned') {
          // If Paystack says it failed, update to FAILED
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              providerData: verification.data,
            },
          });

          results.updatedToFailed++;
          results.details.push({
            paymentId: payment.id,
            reference: payment.providerRef,
            previousStatus: payment.status,
            newStatus: PaymentStatus.FAILED,
            paystackStatus: verification.status,
          });
        } else {
          // Still pending or processing on Paystack side
          results.unchanged++;
          results.details.push({
            paymentId: payment.id,
            reference: payment.providerRef,
            previousStatus: payment.status,
            newStatus: payment.status,
            paystackStatus: verification.status,
          });
        }
      } catch (paymentError) {
        logger.error('Error syncing individual payment in bulk sync:', {
          paymentId: payment.id,
          error: paymentError,
        });
        results.errors++;
        results.details.push({
          paymentId: payment.id,
          reference: payment.providerRef || '',
          previousStatus: payment.status,
          newStatus: payment.status,
          paystackStatus: 'error',
          error: (paymentError as Error).message,
        });
      }
    }

    logger.info(`Bulk sync completed`, {
      total: results.total,
      updatedToSuccess: results.updatedToSuccess,
      updatedToFailed: results.updatedToFailed,
      unchanged: results.unchanged,
      errors: results.errors,
      adminUserId: req.user?.id,
    });

    successResponse(res, {
      message: `Bulk sync completed. ${results.updatedToSuccess} updated to SUCCESS, ${results.updatedToFailed} updated to FAILED, ${results.unchanged} unchanged, ${results.errors} errors.`,
      ...results,
    });
  } catch (error) {
    logger.error('Bulk payment sync error:', { error });
    errorResponse(res, 'SYNC_FAILED', (error as Error).message, 500);
  }
}

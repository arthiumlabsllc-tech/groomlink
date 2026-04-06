import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import prisma from '../config/database';
import logger from '../config/logger';

class ImpersonationController {
  /**
   * Start impersonating a user (support staff only)
   * POST /api/impersonation/start
   */
  async startImpersonation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { targetUserId, reason } = req.body;
      const staffId = req.user?.id;
      const staffRole = req.user?.role;

      // Verify staff has permission
      const allowedRoles = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'];
      if (!staffId || !allowedRoles.includes(staffRole as string)) {
        errorResponse(res, 'FORBIDDEN', 'Only support staff can impersonate users', 403);
        return;
      }

      // Get target user
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          phoneNumber: true,
          role: true,
          status: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!targetUser) {
        errorResponse(res, 'NOT_FOUND', 'Target user not found', 404);
        return;
      }

      // Cannot impersonate other staff/admins (unless super admin)
      const protectedRoles = ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'];
      if (protectedRoles.includes(targetUser.role) && staffRole !== 'SUPER_ADMIN') {
        errorResponse(res, 'FORBIDDEN', 'Cannot impersonate staff or admin users', 403);
        return;
      }

      // Create impersonation log
      const log = await prisma.impersonationLog.create({
        data: {
          staffId,
          targetUserId,
          reason,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      // Generate tokens with impersonation marker
      const tokenPayload = {
        userId: targetUser.id,
        phoneNumber: targetUser.phoneNumber,
        role: targetUser.role,
        impersonatedBy: staffId,
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = await generateRefreshToken(tokenPayload);

      logger.info(`Impersonation started: Staff ${staffId} -> User ${targetUserId}`);

      successResponse(res, {
        message: 'Impersonation started',
        tokens: {
          accessToken,
          refreshToken,
        },
        user: {
          id: targetUser.id,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          phoneNumber: targetUser.phoneNumber,
          role: targetUser.role,
          impersonatedBy: staffId,
        },
        impersonationLogId: log.id,
      });
    } catch (error) {
      logger.error('Start impersonation error:', error);
      errorResponse(res, 'IMPERSONATION_ERROR', 'Failed to start impersonation', 500);
    }
  }

  /**
   * End impersonation session
   * POST /api/impersonation/end
   */
  async endImpersonation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { logId } = req.body;

      if (!logId) {
        errorResponse(res, 'MISSING_PARAM', 'Impersonation log ID is required', 400);
        return;
      }

      // Update the impersonation log
      const log = await prisma.impersonationLog.update({
        where: { id: logId },
        data: { endedAt: new Date() },
      });

      logger.info(`Impersonation ended: Log ${logId}`);

      successResponse(res, { message: 'Impersonation ended successfully' });
    } catch (error) {
      logger.error('End impersonation error:', error);
      errorResponse(res, 'IMPERSONATION_ERROR', 'Failed to end impersonation', 500);
    }
  }

  /**
   * Get impersonation history (admin/support only)
   * GET /api/impersonation/logs
   */
  async getImpersonationLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const staffId = req.query.staffId as string;
      const targetUserId = req.query.targetUserId as string;

      const where: any = {};
      if (staffId) where.staffId = staffId;
      if (targetUserId) where.targetUserId = targetUserId;

      const [logs, total] = await Promise.all([
        prisma.impersonationLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { startedAt: 'desc' },
          include: {
            staff: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
            targetUser: {
              select: { id: true, firstName: true, lastName: true, role: true, phoneNumber: true },
            },
          },
        }),
        prisma.impersonationLog.count({ where }),
      ]);

      paginatedResponse(res, logs, page, limit, total);
    } catch (error) {
      logger.error('Get impersonation logs error:', error);
      errorResponse(res, 'QUERY_ERROR', 'Failed to get impersonation logs', 500);
    }
  }

  /**
   * Search for users to impersonate (support staff)
   * GET /api/impersonation/search
   */
  async searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { query, role, page = 1, limit = 20 } = req.query;

      const where: any = {
        role: { in: ['CUSTOMER', 'SALON_OWNER'] }, // Only allow searching for customers and salon owners
      };

      if (query) {
        where.OR = [
          { firstName: { contains: query as string, mode: 'insensitive' } },
          { lastName: { contains: query as string, mode: 'insensitive' } },
          { phoneNumber: { contains: query as string } },
          { email: { contains: query as string, mode: 'insensitive' } },
        ];
      }

      if (role && ['CUSTOMER', 'SALON_OWNER'].includes(role as string)) {
        where.role = role;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            salons: {
              select: { id: true, businessName: true, status: true },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      paginatedResponse(res, users, Number(page), Number(limit), total);
    } catch (error) {
      logger.error('Search users for impersonation error:', error);
      errorResponse(res, 'QUERY_ERROR', 'Failed to search users', 500);
    }
  }

  /**
   * Get dashboard access URLs for a user (support staff)
   * GET /api/impersonation/dashboards/:userId
   */
  async getDashboardAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          salons: {
            select: { id: true, businessName: true },
          },
        },
      });

      if (!user) {
        errorResponse(res, 'NOT_FOUND', 'User not found', 404);
        return;
      }

      // Determine which dashboards the user can access
      const dashboards: { name: string; url: string; role: string }[] = [];

      if (user.role === 'CUSTOMER') {
        dashboards.push({
          name: 'Customer App',
          url: 'https://groomlinkgh.com',
          role: 'CUSTOMER',
        });
      }

      if (user.role === 'SALON_OWNER' && user.salons.length > 0) {
        dashboards.push({
          name: 'Partners Dashboard',
          url: 'https://partners.groomlinkgh.com',
          role: 'SALON_OWNER',
        });
      }

      successResponse(res, {
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          phoneNumber: user.phoneNumber,
          role: user.role,
          salons: user.salons,
        },
        dashboards,
      });
    } catch (error) {
      logger.error('Get dashboard access error:', error);
      errorResponse(res, 'QUERY_ERROR', 'Failed to get dashboard access', 500);
    }
  }
}

export const impersonationController = new ImpersonationController();
export default impersonationController;

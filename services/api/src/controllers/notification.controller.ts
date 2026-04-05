import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';
import { NotificationType } from '@prisma/client';

const sendNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
});

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unread === 'true';

    const where: any = { userId: req.user.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user.id, isRead: false },
      }),
    ]);

    // Use successResponse directly to include unreadCount
    const totalPages = Math.ceil(total / limit);
    const pagination = { page, limit, total, totalPages };
    successResponse(res, { notifications, unreadCount, pagination }, 200);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;

    const notification = await prisma.notification.updateMany({
      where: {
        id,
        userId: req.user.id,
      },
      data: { isRead: true },
    });

    if (notification.count === 0) {
      errorResponse(res, 'NOT_FOUND', 'Notification not found', 404);
      return;
    }

    successResponse(res, { message: 'Notification marked as read' });
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function sendNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const data = sendNotificationSchema.parse(req.body);

    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      },
    });

    successResponse(res, notification, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

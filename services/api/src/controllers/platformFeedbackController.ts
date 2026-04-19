import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { AuthenticatedRequest } from '../types';

/**
 * Submit platform feedback
 * POST /api/platform/feedback
 */
export const submitFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rating, comment, email } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    // Validate comment length
    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Comment must be less than 1000 characters',
      });
    }

    // Determine user type from JWT
    const userType = req.user?.role === 'SALON_OWNER' ? 'SALON_OWNER' : 'CUSTOMER';
    const userId = req.user?.id || null;

    // Get device info from headers
    const deviceId = req.headers['x-device-id'] as string || null;
    const appVersion = req.headers['x-app-version'] as string || null;

    // Create feedback
    const feedback = await prisma.platformFeedback.create({
      data: {
        rating: parseInt(rating),
        comment: comment?.trim() || null,
        userType,
        userId,
        email: email?.trim() || null,
        deviceId,
        appVersion,
        status: 'NEW',
      },
    });

    logger.info('Platform feedback submitted', {
      feedbackId: feedback.id,
      rating: feedback.rating,
      userType: feedback.userType,
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: { id: feedback.id },
    });
  } catch (error: any) {
    logger.error('Error submitting feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    });
  }
};

/**
 * Get all feedback (Admin only)
 * GET /api/platform/feedback
 */
export const getAllFeedback = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, userType, rating } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (userType) where.userType = userType;
    if (rating) where.rating = parseInt(rating as string);

    const [feedback, total] = await Promise.all([
      prisma.platformFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        select: {
          id: true,
          rating: true,
          comment: true,
          userType: true,
          userId: true,
          email: true,
          appVersion: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.platformFeedback.count({ where }),
    ]);

    return res.json({
      success: true,
      data: feedback,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback',
    });
  }
};

/**
 * Get feedback statistics (Admin only)
 * GET /api/platform/feedback/stats
 */
export const getFeedbackStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [total, avgRating, byUserType, byRating, byStatus] = await Promise.all([
      prisma.platformFeedback.count(),
      prisma.platformFeedback.aggregate({
        _avg: { rating: true },
      }),
      prisma.platformFeedback.groupBy({
        by: ['userType'],
        _count: true,
        _avg: { rating: true },
      }),
      prisma.platformFeedback.groupBy({
        by: ['rating'],
        _count: true,
      }),
      prisma.platformFeedback.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        averageRating: avgRating._avg.rating || 0,
        byUserType,
        byRating,
        byStatus,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching feedback stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback statistics',
    });
  }
};

/**
 * Update feedback status (Admin only)
 * PATCH /api/platform/feedback/:id
 */
export const updateFeedbackStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['NEW', 'READ', 'ACTIONED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be NEW, READ, or ACTIONED',
      });
    }

    const feedback = await prisma.platformFeedback.update({
      where: { id },
      data: { status },
    });

    return res.json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    logger.error('Error updating feedback status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update feedback',
    });
  }
};

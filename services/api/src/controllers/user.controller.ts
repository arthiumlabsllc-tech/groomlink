import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import prisma from '../config/database';
import logger from '../config/logger';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';
import { revokeAllUserRefreshTokens } from '../utils/jwt';
import { sendWelcomeEmail } from '../services/email.service';

// Transaction client type for Prisma transactions
type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
});

const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
});

export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
        isVerified: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        region: true,
        createdAt: true,
      },
    });

    if (!user) {
      errorResponse(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    successResponse(res, user);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
        isVerified: true,
      },
    });

    successResponse(res, user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function uploadAvatar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!req.file) {
      errorResponse(res, 'NO_FILE', 'No file uploaded', 400);
      return;
    }

    // Generate the avatar URL path
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update user's avatar in database
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        avatar: true,
      },
    });

    logger.info(`Avatar uploaded for user: ${req.user.id}`);
    successResponse(res, { avatarUrl: user.avatar });
  } catch (error) {
    logger.error('Avatar upload failed', { error, userId: req.user?.id });
    errorResponse(res, 'UPLOAD_FAILED', (error as Error).message, 500);
  }
}

export async function updateLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const data = updateLocationSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        latitude: true,
        longitude: true,
        address: true,
        city: true,
        region: true,
      },
    });

    successResponse(res, user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function getFavorites(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: req.user.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          salon: {
            select: {
              id: true,
              businessName: true,
              type: true,
              address: true,
              city: true,
              logo: true,
              rating: true,
              reviewCount: true,
            },
          },
        },
      }),
      prisma.favorite.count({ where: { userId: req.user.id } }),
    ]);

    paginatedResponse(res, favorites, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function addFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.body;

    if (!salonId) {
      errorResponse(res, 'MISSING_PARAMS', 'Salon ID is required', 400);
      return;
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: req.user.id,
        salonId,
      },
      include: {
        salon: {
          select: {
            id: true,
            businessName: true,
            type: true,
            logo: true,
            rating: true,
          },
        },
      },
    });

    successResponse(res, favorite, 201);
  } catch (error) {
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 400);
  }
}

export async function removeFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { id } = req.params;

    await prisma.favorite.deleteMany({
      where: {
        id,
        userId: req.user.id,
      },
    });

    successResponse(res, { message: 'Favorite removed' });
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

export async function addFavoriteStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { staffId } = req.body;

    if (!staffId) {
      errorResponse(res, 'MISSING_PARAMS', 'Staff ID is required', 400);
      return;
    }

    const favoriteStaff = await prisma.favoriteStaff.create({
      data: {
        userId: req.user.id,
        workerId: staffId,
      },
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            specialties: true,
            rating: true,
            salon: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    successResponse(res, favoriteStaff, 201);
  } catch (error) {
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 400);
  }
}

export async function removeFavoriteStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { staffId } = req.params;

    await prisma.favoriteStaff.deleteMany({
      where: {
        userId: req.user.id,
        workerId: staffId,
      },
    });

    successResponse(res, { message: 'Favorite staff removed' });
  } catch (error) {
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

export async function getUserBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    const where: any = { customerId: req.user.id };
    if (status) where.status = status;

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
              address: true,
              logo: true,
            },
          },
          worker: {
            select: {
              id: true,
              fullName: true,
              avatar: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              duration: true,
              price: true,
            },
          },
          review: {
            select: {
              id: true,
              rating: true,
              comment: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    paginatedResponse(res, bookings, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

// Admin endpoints
export async function getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;
    const status = req.query.status as string;

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              bookings: true,
              salons: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    paginatedResponse(res, users, page, limit, total);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

export async function updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    successResponse(res, user);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

// GDPR/Ghana DPA - Delete user account and all associated data
export async function deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const userId = req.user.id;

    // Start a transaction to delete all user data
    await prisma.$transaction(async (tx: TransactionClient) => {
      // Delete user's reviews
      await tx.review.deleteMany({
        where: { customerId: userId },
      });

      // Delete user's favorites
      await tx.favorite.deleteMany({
        where: { userId },
      });

      // Delete user's favorite staff
      await tx.favoriteStaff.deleteMany({
        where: { userId },
      });

      // Delete user's notifications
      await tx.notification.deleteMany({
        where: { userId },
      });

      // Anonymize user's bookings (keep for business records but remove PII)
      await tx.booking.updateMany({
        where: { customerId: userId },
        data: {
          customerNotes: '[DELETED]',
        },
      });

      // Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    // Revoke all refresh tokens
    await revokeAllUserRefreshTokens(userId);

    logger.info(`User account deleted: ${userId}`);
    successResponse(res, { message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Account deletion failed', { error, userId: req.user?.id });
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

// GDPR/Ghana DPA - Export user data
export async function exportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const userId = req.user.id;

    // Fetch all user data
    const [user, bookings, favorites, favoriteStaff, notifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          role: true,
          status: true,
          isVerified: true,
          latitude: true,
          longitude: true,
          address: true,
          city: true,
          region: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
      prisma.booking.findMany({
        where: { customerId: userId },
        include: {
          salon: { select: { businessName: true } },
          worker: { select: { fullName: true } },
          service: { select: { name: true } },
          review: true,
        },
      }),
      prisma.favorite.findMany({
        where: { userId },
        include: {
          salon: { select: { businessName: true } },
        },
      }),
      prisma.favoriteStaff.findMany({
        where: { userId },
        include: {
          worker: { select: { fullName: true } },
        },
      }),
      prisma.notification.findMany({
        where: { userId },
        select: {
          type: true,
          title: true,
          message: true,
          isRead: true,
          createdAt: true,
        },
      }),
    ]);

    const exportData = {
      user,
      bookings,
      favorites,
      favoriteStaff,
      notifications,
      exportedAt: new Date().toISOString(),
    };

    logger.info(`User data exported: ${userId}`);
    successResponse(res, exportData);
  } catch (error) {
    logger.error('Data export failed', { error, userId: req.user?.id });
    errorResponse(res, 'EXPORT_FAILED', (error as Error).message, 500);
  }
}

// Admin - Delete user account
export async function adminDeleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      errorResponse(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    // Start a transaction to delete all user data
    await prisma.$transaction(async (tx: TransactionClient) => {
      // Delete user's reviews
      await tx.review.deleteMany({
        where: { customerId: id },
      });

      // Delete user's favorites
      await tx.favorite.deleteMany({
        where: { userId: id },
      });

      // Delete user's favorite staff
      await tx.favoriteStaff.deleteMany({
        where: { userId: id },
      });

      // Delete user's notifications
      await tx.notification.deleteMany({
        where: { userId: id },
      });

      // Anonymize user's bookings
      await tx.booking.updateMany({
        where: { customerId: id },
        data: {
          customerNotes: '[DELETED BY ADMIN]',
        },
      });

      // Delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    // Revoke all refresh tokens
    await revokeAllUserRefreshTokens(id);

    logger.info(`User account deleted by admin: ${id}`);
    successResponse(res, { message: 'User account deleted successfully' });
  } catch (error) {
    logger.error('Admin account deletion failed', { error, userId: req.params.id });
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

// Schema for creating support staff
const createSupportStaffSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional().nullable(),
  email: z.string().email('Invalid email address'),
});

// Create support staff account
export async function createSupportStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data = createSupportStaffSchema.parse(req.body);

    // Check if phone number already exists (only if provided)
    if (data.phoneNumber) {
      const existingUser = await prisma.user.findUnique({
        where: { phoneNumber: data.phoneNumber ?? undefined },
      });

      if (existingUser) {
        errorResponse(res, 'PHONE_EXISTS', 'A user with this phone number already exists', 400);
        return;
      }
    }

    // Check if email exists (if provided)
    if (data.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: data.email },
      });

      if (existingEmail) {
        errorResponse(res, 'EMAIL_EXISTS', 'A user with this email already exists', 400);
        return;
      }
    }

    // Create support staff user
    const user = await prisma.user.create({
      data: {
        phoneNumber: data.phoneNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: 'SUPPORT' as any, // Cast to bypass TypeScript
        status: 'ACTIVE' as any,
        isVerified: true, // Auto-verify support staff
      },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        isVerified: true,
        createdAt: true,
      },
    });

    logger.info(`Support staff created by admin: ${user.id}`);

    // Send welcome email (fire-and-forget, don't block response)
    if (user.email) {
      sendWelcomeEmail(user.email, user.firstName).catch((emailError) => {
        logger.error('Failed to send welcome email to support staff', {
          error: emailError,
          userId: user.id,
          email: user.email,
        });
      });
    }

    successResponse(res, user, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    logger.error('Failed to create support staff', { error });
    errorResponse(res, 'CREATE_FAILED', (error as Error).message, 500);
  }
}

// Get all support staff
export async function getSupportStaff(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'SUPPORT' as any },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where: { role: 'SUPPORT' as any } }),
    ]);

    paginatedResponse(res, users, page, limit, total);
  } catch (error) {
    logger.error('Failed to fetch support staff', { error });
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

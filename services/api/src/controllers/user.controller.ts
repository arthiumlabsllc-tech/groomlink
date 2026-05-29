import { Response } from 'express';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';
import prisma from '../config/database';
import logger from '../config/logger';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';
import { revokeAllUserRefreshTokens } from '../utils/jwt';
import { sendWelcomeEmail } from '../services/email.service';
import * as noshowService from '../services/noshow.service';

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
        preferredCategories: true,
        onboardingComplete: true,
        createdAt: true,
        // Include admin permissions for ADMIN and SUPER_ADMIN roles
        adminPermission: {
          select: {
            pages: true,
          },
        },
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

    // Check if favorite already exists for this user+salon combo
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
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

    if (existingFavorite) {
      // Return existing favorite instead of creating duplicate
      successResponse(res, existingFavorite, 200);
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

export async function checkIsFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const { salonId } = req.params;

    if (!salonId) {
      errorResponse(res, 'MISSING_PARAMS', 'Salon ID is required', 400);
      return;
    }

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: req.user.id,
        salonId,
      },
      select: {
        id: true,
      },
    });

    successResponse(res, {
      isFavorited: !!favorite,
      favoriteId: favorite?.id || null,
    });
  } catch (error) {
    errorResponse(res, 'CHECK_FAILED', (error as Error).message, 500);
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

    // Check if user owns salons - prevent deletion if they do
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            salons: true,
          },
        },
      },
    });

    if (user && user._count.salons > 0) {
      errorResponse(
        res,
        'DELETE_FAILED',
        `Cannot delete account while you own ${user._count.salons} salon(s). Please transfer or delete your salons first.`,
        400
      );
      return;
    }

    // Start a transaction to delete all user data
    await prisma.$transaction(async (tx: TransactionClient) => {
      // Delete user's activities first
      await tx.userActivity.deleteMany({
        where: { userId },
      });

      // Delete impersonation logs where user is the staff
      await tx.impersonationLog.deleteMany({
        where: { staffId: userId },
      });

      // Delete impersonation logs where user is the target
      await tx.impersonationLog.deleteMany({
        where: { targetUserId: userId },
      });

      // Delete admin permissions if any
      await tx.adminPermission.deleteMany({
        where: { userId },
      });

      // Delete user's salon queue entries
      await tx.salonQueue.deleteMany({
        where: { customerId: userId },
      });

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

      // Delete user's payments
      await tx.payment.deleteMany({
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

// Admin - Delete user account with full cascade deletion
export async function adminDeleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            salons: true,
            bookings: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      errorResponse(res, 'NOT_FOUND', 'User not found', 404);
      return;
    }

    // Start a transaction to delete all user data including salons
    await prisma.$transaction(async (tx: TransactionClient) => {
      // 1. If user owns salons, delete all salon-related data first
      if (user._count.salons > 0) {
        const salons = await tx.salon.findMany({
          where: { ownerId: id },
          select: { id: true },
        });

        for (const salon of salons) {
          // Delete all workers and their related data for this salon
          const workers = await tx.worker.findMany({
            where: { salonId: salon.id },
            select: { id: true },
          });

          for (const worker of workers) {
            // Delete worker availabilities
            await tx.availability.deleteMany({
              where: { workerId: worker.id },
            });

            // Delete worker-service relationships
            await tx.workerService.deleteMany({
              where: { workerId: worker.id },
            });

            // Delete favorite staff entries for this worker
            await tx.favoriteStaff.deleteMany({
              where: { workerId: worker.id },
            });

            // Delete salon queue entries for this worker
            await tx.salonQueue.deleteMany({
              where: { workerId: worker.id },
            });
          }

          // Delete all workers for this salon
          await tx.worker.deleteMany({
            where: { salonId: salon.id },
          });

          // Delete all bookings for this salon FIRST (they reference services via FK)
          const bookings = await tx.booking.findMany({
            where: { salonId: salon.id },
            select: { id: true },
          });

          for (const booking of bookings) {
            // Delete payment for this booking
            await tx.payment.deleteMany({
              where: { bookingId: booking.id },
            });

            // Delete review for this booking
            await tx.review.deleteMany({
              where: { bookingId: booking.id },
            });
          }

          await tx.booking.deleteMany({
            where: { salonId: salon.id },
          });

          // Now delete services (after bookings are gone)
          const services = await tx.service.findMany({
            where: { salonId: salon.id },
            select: { id: true },
          });

          for (const service of services) {
            // Delete worker-service relationships for this service
            await tx.workerService.deleteMany({
              where: { serviceId: service.id },
            });

            // Delete salon queue entries for this service
            await tx.salonQueue.deleteMany({
              where: { serviceId: service.id },
            });
          }

          await tx.service.deleteMany({
            where: { salonId: salon.id },
          });

          // Delete all reviews for this salon
          await tx.review.deleteMany({
            where: { salonId: salon.id },
          });

          // Delete all favorites for this salon
          await tx.favorite.deleteMany({
            where: { salonId: salon.id },
          });

          // Delete all documents for this salon
          await tx.document.deleteMany({
            where: { salonId: salon.id },
          });

          // Delete all salon queue entries for this salon
          await tx.salonQueue.deleteMany({
            where: { salonId: salon.id },
          });
        }

        // Finally delete all salons owned by this user
        await tx.salon.deleteMany({
          where: { ownerId: id },
        });
      }

      // 2. Delete user's activities
      await tx.userActivity.deleteMany({
        where: { userId: id },
      });

      // 3. Delete impersonation logs where user is the staff
      await tx.impersonationLog.deleteMany({
        where: { staffId: id },
      });

      // 4. Delete impersonation logs where user is the target
      await tx.impersonationLog.deleteMany({
        where: { targetUserId: id },
      });

      // 5. Delete admin permissions if any
      await tx.adminPermission.deleteMany({
        where: { userId: id },
      });

      // 6. Delete user's salon queue entries (as customer)
      await tx.salonQueue.deleteMany({
        where: { customerId: id },
      });

      // 7. Delete user's reviews (as customer)
      await tx.review.deleteMany({
        where: { customerId: id },
      });

      // 8. Delete user's favorites
      await tx.favorite.deleteMany({
        where: { userId: id },
      });

      // 9. Delete user's favorite staff
      await tx.favoriteStaff.deleteMany({
        where: { userId: id },
      });

      // 10. Delete user's notifications
      await tx.notification.deleteMany({
        where: { userId: id },
      });

      // 11. Delete user's payments
      await tx.payment.deleteMany({
        where: { userId: id },
      });

      // 12. Delete user's bookings (as customer) - payments and reviews already deleted above
      await tx.booking.deleteMany({
        where: { customerId: id },
      });

      // 13. Delete user's support tickets and messages
      const userTickets = await tx.supportTicket.findMany({
        where: { userId: id },
        select: { id: true },
      });

      for (const ticket of userTickets) {
        // Delete all messages for this ticket
        await tx.ticketMessage.deleteMany({
          where: { ticketId: ticket.id },
        });
      }

      await tx.supportTicket.deleteMany({
        where: { userId: id },
      });

      // 14. Delete ticket messages where user is the sender
      await tx.ticketMessage.deleteMany({
        where: { senderId: id },
      });

      // 15. Ban the email if user has one - save to BannedEmail table
      if (user.email) {
        await tx.bannedEmail.upsert({
          where: { email: user.email },
          update: {
            reason: `User deleted by admin on ${new Date().toISOString()}`,
            bannedBy: adminId,
            bannedAt: new Date(),
          },
          create: {
            email: user.email,
            reason: `User deleted by admin on ${new Date().toISOString()}`,
            bannedBy: adminId,
            bannedAt: new Date(),
          },
        });
      }

      // 16. Finally delete the user
      await tx.user.delete({
        where: { id },
      });
    });

    // Revoke all refresh tokens
    await revokeAllUserRefreshTokens(id);

    logger.info(`User account deleted by admin: ${id} (including ${user._count.salons} salons)`);
    successResponse(res, { message: 'User account and all associated data deleted successfully' });
  } catch (error) {
    logger.error('Admin account deletion failed', { error, userId: req.params.id });
    errorResponse(res, 'DELETE_FAILED', (error as Error).message, 500);
  }
}

// Schema for creating support staff
const createSupportStaffSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: z.string()
    .transform((val) => val.trim() || null)
    .pipe(z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').nullable())
    .optional(),
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

const updatePreferencesSchema = z.object({
  categories: z.array(z.string()).min(1, 'Select at least one category').max(5, 'You can select up to 5 categories'),
});

export async function updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const data = updatePreferencesSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { preferredCategories: data.categories },
      select: {
        id: true,
        preferredCategories: true,
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

export async function completeOnboarding(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { onboardingComplete: true },
      select: {
        id: true,
        onboardingComplete: true,
        preferredCategories: true,
      },
    });

    successResponse(res, user);
  } catch (error) {
    errorResponse(res, 'UPDATE_FAILED', (error as Error).message, 500);
  }
}

export async function getRecommendedSalons(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    // Get user with preferences and location
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        preferredCategories: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!user || user.preferredCategories.length === 0) {
      successResponse(res, []);
      return;
    }

    // Build OR filters for case-insensitive partial match on service name
    const categoryFilters = user.preferredCategories.map(category => ({
      name: { contains: category, mode: 'insensitive' as const },
    }));

    // Find matching services to get their salon IDs
    const matchingServices = await prisma.service.findMany({
      where: {
        OR: categoryFilters,
        isActive: true,
        salon: { status: 'APPROVED' },
      },
      select: { salonId: true },
    });

    const salonIds = [...new Set(matchingServices.map(s => s.salonId))];

    if (salonIds.length === 0) {
      successResponse(res, []);
      return;
    }

    // Fetch salons with their matching services
    const salons = await prisma.salon.findMany({
      where: {
        id: { in: salonIds },
        status: 'APPROVED',
      },
      select: {
        id: true,
        businessName: true,
        coverImage: true,
        city: true,
        rating: true,
        reviewCount: true,
        latitude: true,
        longitude: true,
        services: {
          where: {
            OR: categoryFilters,
            isActive: true,
          },
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    // Sort by distance if user has location, otherwise by rating
    if (user.latitude != null && user.longitude != null) {
      const userLat = user.latitude;
      const userLng = user.longitude;

      const salonsWithDistance = salons.map(salon => {
        let distance: number | null = null;
        if (salon.latitude != null && salon.longitude != null) {
          // Haversine formula
          const R = 6371; // Earth radius in km
          const dLat = ((salon.latitude - userLat) * Math.PI) / 180;
          const dLng = ((salon.longitude - userLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((userLat * Math.PI) / 180) *
              Math.cos((salon.latitude * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance = R * c;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { latitude, longitude, ...salonData } = salon;
        return { ...salonData, distance };
      });

      salonsWithDistance.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      successResponse(res, salonsWithDistance.slice(0, 20));
    } else {
      // No user location: sort by rating descending
      const sorted = salons
        .map(({ latitude, longitude, ...salonData }) => salonData)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 20);
      successResponse(res, sorted);
    }
  } catch (error) {
    logger.error('Failed to get recommended salons', { error, userId: req.user?.id });
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/**
 * Get no-show status and account restriction for the current user
 */
export async function getNoShowStatusHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    const restrictionStatus = await noshowService.checkAccountRestriction(req.user.id);
    
    successResponse(res, {
      restricted: restrictionStatus.restricted,
      reason: restrictionStatus.reason,
      restrictedUntil: restrictionStatus.restrictedUntil,
      noShowCount: restrictionStatus.noShowCount,
    });
  } catch (error) {
    logger.error('Failed to get no-show status', { error, userId: req.user?.id });
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

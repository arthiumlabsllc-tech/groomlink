import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AuthenticatedUser } from '../types';
import { verifyToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import prisma from '../config/database';

// Export enums for use in routes and controllers
// Using const object with `as const` to create a type-compatible pattern with Prisma
export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  SALON_OWNER: 'SALON_OWNER',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    errorResponse(res, 'UNAUTHORIZED', 'Access token is required', 401);
    return;
  }

  try {
    const decoded = verifyToken(token);
    // Support both 'userId' and 'id' fields for backward compatibility
    const userId = decoded.userId || (decoded as any).id;
    if (!userId) {
      errorResponse(res, 'INVALID_TOKEN', 'Token missing user identifier', 401);
      return;
    }
    req.user = {
      id: userId,
      phoneNumber: decoded.phoneNumber,
      role: decoded.role,
      status: UserStatus.ACTIVE, // Will be verified in DB
      impersonatedBy: decoded.impersonatedBy, // Support for impersonation
    };
    next();
  } catch (error) {
    errorResponse(res, 'INVALID_TOKEN', 'Invalid or expired token', 401);
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role as string)) {
      errorResponse(res, 'FORBIDDEN', 'Insufficient permissions', 403);
      return;
    }

    next();
  };
}

// Check if user is support staff or higher (SUPPORT, ADMIN, SUPER_ADMIN)
export function requireSupportOrHigher(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  const allowedRoles: UserRole[] = [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN];
  if (!allowedRoles.includes(req.user.role)) {
    errorResponse(res, 'FORBIDDEN', 'Support staff access required', 403);
    return;
  }

  next();
}

// Check if user is admin or super admin
export function requireAdminOrHigher(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
  if (!allowedRoles.includes(req.user.role)) {
    errorResponse(res, 'FORBIDDEN', 'Admin access required', 403);
    return;
  }

  next();
}

// Check if user is super admin only
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  if (req.user.role !== UserRole.SUPER_ADMIN) {
    errorResponse(res, 'FORBIDDEN', 'Super admin access required', 403);
    return;
  }

  next();
}

// Check page access permission for regular admins
export function requirePageAccess(page: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    // Super admin has all access
    if (req.user.role === UserRole.SUPER_ADMIN) {
      next();
      return;
    }

    // For regular ADMIN, check page permissions
    const permission = await prisma.adminPermission.findUnique({
      where: { userId: req.user.id }
    });

    if (!permission || !permission.pages.includes(page)) {
      errorResponse(res, 'FORBIDDEN', 'You do not have access to this section', 403);
      return;
    }

    next();
  };
}

export function requireActiveUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  if (req.user.status !== UserStatus.ACTIVE) {
    errorResponse(res, 'ACCOUNT_INACTIVE', 'Your account is not active', 403);
    return;
  }

  next();
}

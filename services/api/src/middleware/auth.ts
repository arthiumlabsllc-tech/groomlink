import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AuthenticatedUser } from '../types';
import { verifyToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';

// Export enums for use in routes and controllers
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SALON_OWNER = 'SALON_OWNER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

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
    req.user = {
      id: decoded.userId,
      phoneNumber: decoded.phoneNumber,
      role: decoded.role,
      status: UserStatus.ACTIVE, // Will be verified in DB
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

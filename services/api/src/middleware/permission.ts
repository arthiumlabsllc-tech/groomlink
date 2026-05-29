import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { UserRole } from '@prisma/client';
import { errorResponse } from '../utils/response';
import prisma from '../config/database';

/**
 * Middleware to check if authenticated admin has permission to access a specific page
 * Usage: requirePermission('salons')
 * 
 * SUPER_ADMIN always has access to all pages
 * ADMIN users must have the page in their AdminPermission.pages array
 */
export function requirePermission(pageId: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      
      if (!authenticatedReq.user) {
        errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      // SUPER_ADMIN has access to everything
      if (authenticatedReq.user.role === UserRole.SUPER_ADMIN) {
        return next();
      }

      // For ADMIN users, check their permissions
      if (authenticatedReq.user.role === UserRole.ADMIN) {
        const permission = await prisma.adminPermission.findUnique({
          where: { userId: authenticatedReq.user.id },
        });

        // If no permission record exists or pages array is empty, deny access
        if (!permission || !permission.pages || permission.pages.length === 0) {
          errorResponse(res, 'FORBIDDEN', 'You do not have permission to access this resource', 403);
          return;
        }

        // Check if the page is in the user's allowed pages
        if (!permission.pages.includes(pageId)) {
          errorResponse(res, 'FORBIDDEN', `You do not have permission to access ${pageId}`, 403);
          return;
        }

        // Permission granted
        return next();
      }

      // For any other role, deny access
      errorResponse(res, 'FORBIDDEN', 'Insufficient permissions', 403);
      return;
    } catch (error) {
      errorResponse(res, 'PERMISSION_CHECK_FAILED', (error as Error).message, 500);
    }
  };
}

/**
 * Middleware to check if user is SUPER_ADMIN
 * Usage: requireSuperAdmin
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const authenticatedReq = req as AuthenticatedRequest;
  
  if (!authenticatedReq.user) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  if (authenticatedReq.user.role !== UserRole.SUPER_ADMIN) {
    errorResponse(res, 'FORBIDDEN', 'Super admin access required', 403);
    return;
  }

  next();
}

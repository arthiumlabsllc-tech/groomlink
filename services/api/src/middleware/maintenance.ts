import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export async function maintenanceCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip maintenance check for admin routes and auth routes
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) {
    next();
    return;
  }
  
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (settings?.maintenanceMode) {
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: settings.maintenanceMsg || 'Site is under maintenance. Please try again later.',
      });
      return;
    }
  } catch (e) {
    // If DB fails, don't block requests
  }
  next();
}

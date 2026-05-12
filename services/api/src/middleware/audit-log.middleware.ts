import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import prisma from '../config/database';

// Audit log levels
export enum AuditLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

// Audit logging middleware
export const auditLog = (action: string, resourceType?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log after response is sent
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Only log successful requests (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAuditEvent({
          userId: (req as any).user?.id || null,
          action,
          resourceType,
          resourceId: req.params.id || null,
          ipAddress: req.ip || null,
          userAgent: req.get('user-agent') || null,
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            query: req.query,
            body: req.body ? Object.keys(req.body) : undefined,
          },
          level: res.statusCode >= 400 ? AuditLevel.ERROR : AuditLevel.INFO,
        }).catch(err => {
          logger.error('Failed to write audit log', { error: err });
        });
      }
    });
    
    next();
  };
};

// Helper function to write audit log
async function logAuditEvent(data: {
  userId: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details?: any;
  level: AuditLevel;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        details: data.details,
        level: data.level,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should not break the request
    logger.error('Audit log write failed', { error });
  }
}

// Specific audit loggers for common actions
export const auditLogin = auditLog('USER_LOGIN', 'auth');
export const auditLogout = auditLog('USER_LOGOUT', 'auth');
export const auditTicketAccess = auditLog('TICKET_VIEW', 'ticket');
export const auditTicketUpdate = auditLog('TICKET_UPDATE', 'ticket');
export const auditUserAccess = auditLog('USER_VIEW', 'user');
export const auditUserUpdate = auditLog('USER_UPDATE', 'user');
export const auditImpersonationStart = auditLog('IMPERSONATION_START', 'user');
export const auditImpersonationEnd = auditLog('IMPERSONATION_END', 'user');
export const auditSettingsUpdate = auditLog('SETTINGS_UPDATE', 'settings');
export const auditProfileUpdate = auditLog('PROFILE_UPDATE', 'profile');

/**
 * security.controller.ts
 * Endpoints for the admin "Security" dashboard.
 *   GET   /api/admin/security/events        paginated, filterable
 *   GET   /api/admin/security/stats         counts for dashboard tiles
 *   PATCH /api/admin/security/events/:id/resolve
 */

import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';

const ALLOWED_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export async function listEvents(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(String(req.query.pageSize || '50'), 10)));
    const severity = String(req.query.severity || '').toUpperCase();
    const eventType = req.query.eventType ? String(req.query.eventType) : undefined;
    const resolvedParam = req.query.resolved;
    const resolved =
      resolvedParam === 'true' ? true :
      resolvedParam === 'false' ? false : undefined;
    const ip = req.query.ip ? String(req.query.ip) : undefined;

    const where: any = {};
    if (ALLOWED_SEVERITIES.includes(severity)) where.severity = severity;
    if (eventType) where.eventType = eventType;
    if (typeof resolved === 'boolean') where.resolved = resolved;
    if (ip) where.ipAddress = ip;

    const [total, items] = await Promise.all([
      prisma.securityEvent.count({ where }),
      prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    successResponse(res, {
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    logger.error('listEvents failed', { err });
    errorResponse(res, 'SECURITY_LIST_FAILED', (err as Error).message, 500);
  }
}

export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      last24h, last7d, unresolved, bySeverity24h, byTypeTop7d,
    ] = await Promise.all([
      prisma.securityEvent.count({ where: { createdAt: { gte: since24h } } }),
      prisma.securityEvent.count({ where: { createdAt: { gte: since7d  } } }),
      prisma.securityEvent.count({ where: { resolved: false } }),
      prisma.securityEvent.groupBy({
        by: ['severity'],
        where: { createdAt: { gte: since24h } },
        _count: { _all: true },
      }),
      prisma.securityEvent.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: since7d } },
        _count: { _all: true },
        orderBy: { _count: { eventType: 'desc' } },
        take: 5,
      }),
    ]);

    const sev: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    bySeverity24h.forEach((row: any) => { sev[row.severity] = row._count._all; });

    successResponse(res, {
      last24h,
      last7d,
      unresolved,
      bySeverity24h: sev,
      topEventTypes7d: byTypeTop7d.map((r: any) => ({ eventType: r.eventType, count: r._count._all })),
    });
  } catch (err) {
    logger.error('getStats failed', { err });
    errorResponse(res, 'SECURITY_STATS_FAILED', (err as Error).message, 500);
  }
}

export async function resolveEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const event = await prisma.securityEvent.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.user?.id || null,
      },
    });
    successResponse(res, event);
  } catch (err) {
    logger.error('resolveEvent failed', { err });
    errorResponse(res, 'SECURITY_RESOLVE_FAILED', (err as Error).message, 500);
  }
}

export async function reopenEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const event = await prisma.securityEvent.update({
      where: { id },
      data: { resolved: false, resolvedAt: null, resolvedBy: null },
    });
    successResponse(res, event);
  } catch (err) {
    logger.error('reopenEvent failed', { err });
    errorResponse(res, 'SECURITY_REOPEN_FAILED', (err as Error).message, 500);
  }
}

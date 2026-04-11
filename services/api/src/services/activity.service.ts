import prisma from '../config/database';
import { Request } from 'express';

function parseDevice(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return 'Mobile';
  if (/tablet/i.test(userAgent)) return 'Tablet';
  return 'Desktop';
}

export const activityService = {
  async trackActivity(userId: string, action: string, req: Request, metadata?: any): Promise<void> {
    try {
      const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';
      const device = parseDevice(userAgent);

      await prisma.userActivity.create({
        data: { userId, action, ipAddress, userAgent, device, metadata, suspicious: false }
      });

      // Check for suspicious activity
      await this.checkSuspicious(userId);
    } catch (error) {
      console.error('Failed to track activity:', error);
      // Don't throw - activity tracking should never break the main flow
    }
  },

  async checkSuspicious(userId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Check multiple IPs in last hour
    const recentActivities = await prisma.userActivity.findMany({
      where: { userId, createdAt: { gte: oneHourAgo } },
      select: { ipAddress: true }
    });
    
    const uniqueIPs = new Set(recentActivities.map(a => a.ipAddress).filter(Boolean));
    if (uniqueIPs.size >= 5) {
      // Flag all recent activities as suspicious
      await prisma.userActivity.updateMany({
        where: { userId, createdAt: { gte: oneHourAgo } },
        data: { suspicious: true }
      });
    }

    // Check rapid login attempts (more than 10 in an hour)
    const loginCount = await prisma.userActivity.count({
      where: { userId, action: 'LOGIN', createdAt: { gte: oneHourAgo } }
    });
    if (loginCount > 10) {
      await prisma.userActivity.updateMany({
        where: { userId, action: 'LOGIN', createdAt: { gte: oneHourAgo } },
        data: { suspicious: true }
      });
    }
  },

  async getUserActivities(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.userActivity.count({ where: { userId } })
    ]);
    return { activities, total, page, totalPages: Math.ceil(total / limit) };
  },

  async getSuspiciousActivities(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where: { suspicious: true },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.userActivity.count({ where: { suspicious: true } })
    ]);
    return { activities, total, page, totalPages: Math.ceil(total / limit) };
  }
};

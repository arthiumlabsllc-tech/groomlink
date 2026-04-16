import prisma from '../config/database';
import logger from '../config/logger';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export interface NotificationWithRelations {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: Date;
  userId: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(data: CreateNotificationData): Promise<NotificationWithRelations> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || null,
      },
    });

    logger.info(`Notification created: ${notification.id} for user: ${data.userId} - type: ${data.type}`);
    return notification;
  } catch (error) {
    logger.error('Failed to create notification', { error, data });
    throw error;
  }
}

/**
 * Get notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20,
  unreadOnly: boolean = false
): Promise<{ notifications: NotificationWithRelations[]; total: number; unreadCount: number }> {
  const where: any = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return { notifications, total, unreadCount };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
    data: { isRead: true },
  });

  return result.count > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  logger.info(`Marked ${result.count} notifications as read for user: ${userId}`);
  return result.count;
}

/**
 * Helper function to create booking notification for salon owner
 */
export async function notifySalonOwnerOfNewBooking(
  salonOwnerId: string,
  bookingId: string,
  customerName: string,
  serviceName: string,
  salonName: string,
  date: string,
  time: string
): Promise<void> {
  await createNotification({
    userId: salonOwnerId,
    type: NotificationType.BOOKING_CREATED,
    title: 'New Booking',
    message: `${customerName} booked ${serviceName} at ${salonName} for ${date} at ${time}`,
    data: { bookingId },
  });
}

/**
 * Helper function to notify salon owner of booking cancellation
 */
export async function notifySalonOwnerOfCancellation(
  salonOwnerId: string,
  bookingId: string,
  customerName: string,
  serviceName: string,
  reason?: string
): Promise<void> {
  await createNotification({
    userId: salonOwnerId,
    type: NotificationType.BOOKING_CANCELLED,
    title: 'Booking Cancelled',
    message: `${customerName} cancelled their ${serviceName} booking${reason ? `: ${reason}` : ''}`,
    data: { bookingId, reason },
  });
}

/**
 * Helper function to notify of payment received
 */
export async function notifyPaymentReceived(
  userId: string,
  bookingId: string,
  amount: number,
  serviceName: string
): Promise<void> {
  await createNotification({
    userId,
    type: NotificationType.PAYMENT_RECEIVED,
    title: 'Payment Received',
    message: `Payment of GHS ${amount.toFixed(2)} received for ${serviceName}`,
    data: { bookingId, amount },
  });
}

/**
 * Helper function to notify of payment failed
 */
export async function notifyPaymentFailed(
  userId: string,
  bookingId: string,
  amount: number,
  serviceName: string
): Promise<void> {
  await createNotification({
    userId,
    type: NotificationType.PAYMENT_FAILED,
    title: 'Payment Failed',
    message: `Payment of GHS ${amount.toFixed(2)} failed for ${serviceName}. Please try again.`,
    data: { bookingId, amount },
  });
}

/**
 * Helper function to notify salon owner of customer check-in
 */
export async function notifySalonOwnerOfCheckin(
  salonOwnerId: string,
  bookingId: string,
  customerName: string,
  serviceName: string,
  queuePosition?: number
): Promise<void> {
  await createNotification({
    userId: salonOwnerId,
    type: NotificationType.CHECKIN,
    title: 'Customer Checked In',
    message: `${customerName} has checked in for ${serviceName}${queuePosition ? ` (Queue #${queuePosition})` : ''}`,
    data: { bookingId, queuePosition },
  });
}

/**
 * Helper function to notify of service completion
 */
export async function notifyServiceCompleted(
  customerId: string,
  bookingId: string,
  serviceName: string,
  salonName: string
): Promise<void> {
  await createNotification({
    userId: customerId,
    type: NotificationType.BOOKING_COMPLETED,
    title: 'Service Completed',
    message: `Your ${serviceName} at ${salonName} has been completed. Thank you for visiting!`,
    data: { bookingId },
  });
}

/**
 * Helper function to notify of new review
 */
export async function notifySalonOwnerOfReview(
  salonOwnerId: string,
  reviewId: string,
  customerName: string,
  rating: number,
  salonName: string
): Promise<void> {
  await createNotification({
    userId: salonOwnerId,
    type: NotificationType.REVIEW,
    title: 'New Review',
    message: `${customerName} left a ${rating}-star review for ${salonName}`,
    data: { reviewId, rating },
  });
}

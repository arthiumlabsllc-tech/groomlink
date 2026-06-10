/**
 * Push Notification Service
 * Sends real push notifications to iOS/Android devices via Expo Push API.
 * This ensures partners receive audible alerts even when the app is backgrounded or killed.
 */
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import prisma from '../config/database';
import logger from '../config/logger';

// Create a single Expo SDK client (reuse across requests)
const expo = new Expo();

// Custom sound file name (bundled with the partners-app)
const PARTNERS_NOTIFICATION_SOUND = 'notification_alert.wav';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string | boolean;
  badge?: number;
  categoryId?: string;
}

/**
 * Send push notification to a specific user (all their registered devices)
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    // Get all push tokens for this user
    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      select: { token: true, platform: true },
    });

    if (tokens.length === 0) {
      logger.debug(`No push tokens found for user ${userId}, skipping push notification`);
      return;
    }

    // Filter to valid Expo push tokens
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t.token));

    if (validTokens.length === 0) {
      logger.warn(`No valid Expo push tokens for user ${userId}`);
      return;
    }

    // Build messages for each token
    const messages: ExpoPushMessage[] = validTokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: payload.sound !== undefined ? payload.sound as any : PARTNERS_NOTIFICATION_SOUND,
      priority: 'high',
      channelId: 'default', // Android channel
      badge: payload.badge,
      categoryId: payload.categoryId,
    }));

    // Send in chunks (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);

        // Handle ticket errors (e.g., invalid token)
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'error') {
            logger.error(`Push notification error for user ${userId}:`, {
              error: ticket.message,
              details: ticket.details,
            });

            // If token is invalid, remove it from database
            if (
              ticket.details?.error === 'DeviceNotRegistered' ||
              ticket.details?.error === 'InvalidCredentials'
            ) {
              const tokenToRemove = validTokens[i]?.token;
              if (tokenToRemove) {
                await prisma.pushToken.delete({
                  where: { token: tokenToRemove },
                }).catch(() => {}); // Ignore if already deleted
                logger.info(`Removed invalid push token for user ${userId}`);
              }
            }
          }
        }
      } catch (error) {
        logger.error('Failed to send push notification chunk:', { error, userId });
      }
    }

    logger.debug(`Push notification sent to user ${userId} (${validTokens.length} devices)`);
  } catch (error) {
    logger.error('Push notification service error:', { error, userId });
  }
}

/**
 * Send push notification to a salon owner (by salon ID)
 */
export async function sendPushToSalonOwner(
  salonId: string,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { ownerId: true },
    });

    if (!salon?.ownerId) {
      logger.debug(`No owner found for salon ${salonId}`);
      return;
    }

    await sendPushToUser(salon.ownerId, payload);
  } catch (error) {
    logger.error('Failed to send push to salon owner:', { error, salonId });
  }
}

/**
 * Notify partner of a new booking (push notification with custom sound)
 */
export async function pushNewBooking(
  salonId: string,
  customerName: string,
  serviceName: string,
  bookingId: string
): Promise<void> {
  await sendPushToSalonOwner(salonId, {
    title: '🔔 New Booking!',
    body: `${customerName} booked ${serviceName}`,
    data: { type: 'booking_new', bookingId },
    sound: PARTNERS_NOTIFICATION_SOUND,
  });
}

/**
 * Notify partner of a customer check-in
 */
export async function pushCustomerCheckin(
  salonId: string,
  customerName: string,
  serviceName: string,
  bookingId: string,
  queuePosition?: number
): Promise<void> {
  await sendPushToSalonOwner(salonId, {
    title: '📍 Customer Checked In',
    body: `${customerName} has checked in for ${serviceName}${queuePosition ? ` - Queue #${queuePosition}` : ''}`,
    data: { type: 'booking_checkin', bookingId, queuePosition },
    sound: PARTNERS_NOTIFICATION_SOUND,
  });
}

/**
 * Notify partner of a service completion
 */
export async function pushServiceCompleted(
  salonId: string,
  customerName: string,
  serviceName: string,
  bookingId: string,
  amount?: string
): Promise<void> {
  await sendPushToSalonOwner(salonId, {
    title: '✅ Service Completed',
    body: `${customerName}'s ${serviceName} completed${amount ? ` - GH₵${amount}` : ''}`,
    data: { type: 'booking_completed', bookingId },
    sound: PARTNERS_NOTIFICATION_SOUND,
  });
}

/**
 * Notify partner of a booking cancellation
 */
export async function pushBookingCancelled(
  salonId: string,
  customerName: string,
  serviceName: string,
  bookingId: string
): Promise<void> {
  await sendPushToSalonOwner(salonId, {
    title: '❌ Booking Cancelled',
    body: `${customerName} cancelled their ${serviceName} booking`,
    data: { type: 'booking_cancelled', bookingId },
    sound: PARTNERS_NOTIFICATION_SOUND,
  });
}

/**
 * Notify partner of a payment received
 */
export async function pushPaymentReceived(
  userId: string,
  amount: number,
  serviceName: string,
  bookingId: string
): Promise<void> {
  await sendPushToUser(userId, {
    title: '💰 Payment Received',
    body: `GHS ${amount.toFixed(2)} received for ${serviceName}`,
    data: { type: 'payment_received', bookingId },
    sound: PARTNERS_NOTIFICATION_SOUND,
  });
}

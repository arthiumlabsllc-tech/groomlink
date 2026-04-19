import cron from 'node-cron';
import logger from '../config/logger';
import { processExpiredSubscriptions, sendExpirationReminders } from '../services/subscription.service';

/**
 * TIMEZONE NOTE: Ghana Time (Africa/Accra = GMT+0)
 *
 * The API container runs with TZ=Africa/Accra set in docker-compose.prod.yml.
 * This means `new Date()` returns Ghana time, which aligns with UTC since
 * Ghana is in the GMT timezone (no daylight saving time).
 *
 * All scheduled jobs and date comparisons assume Ghana timezone.
 */

/**
 * Initialize subscription-related cron jobs
 */
export function initSubscriptionJobs(): void {
  // Job 1: Send expiration reminders - Daily at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running subscription expiration reminders job...');
    try {
      await sendExpirationReminders();
      logger.info('Subscription expiration reminders sent');
    } catch (error) {
      logger.error('Error sending expiration reminders:', error);
    }
  });

  // Job 2: Handle expired subscriptions - Daily at 1 AM (0 1 * * *)
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running expired subscriptions handler...');
    try {
      await processExpiredSubscriptions();
      logger.info('Expired subscriptions processed');
    } catch (error) {
      logger.error('Error processing expired subscriptions:', error);
    }
  });

  logger.info('Subscription cron jobs initialized (reminders at midnight, expiration handler at 1 AM)');
}

import logger from '../config/logger';
import AfricasTalking from 'africastalking';

// Africa's Talking configuration
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AT_API_KEY;
const SMS_FROM = process.env.SMS_FROM || 'GroomLink';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sms: any = null;

if (AT_API_KEY) {
  try {
    const at = AfricasTalking({
      apiKey: AT_API_KEY,
      username: AT_USERNAME,
    });
    sms = at.SMS;
    logger.info(`Africa's Talking initialized with username: ${AT_USERNAME}`);
  } catch (error) {
    logger.error('Failed to initialize Africa\'s Talking:', error);
  }
} else {
  logger.warn('AT_API_KEY not set. SMS will be logged only.');
}

export interface SMSMessage {
  to: string;
  message: string;
}

/**
 * Send SMS using Africa's Talking
 */
export async function sendSMS({ to, message }: SMSMessage): Promise<boolean> {
  try {
    // Format phone number (ensure it has country code)
    const formattedNumber = formatPhoneNumber(to);

    // Log for development
    logger.info(`SMS to ${formattedNumber}: ${message}`);

    // In development mode, just log the message (don't send real SMS)
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV MODE] SMS would be sent to ${formattedNumber}: ${message}`);
      return true;
    }

    // Send via Africa's Talking in production/sandbox mode
    if (sms && AT_API_KEY) {
      const sendOptions: {
        to: string[];
        message: string;
        from?: string;
      } = {
        to: [formattedNumber],
        message,
      };

      // Only include 'from' for production (sandbox doesn't support custom sender IDs)
      if (AT_USERNAME !== 'sandbox' && SMS_FROM) {
        sendOptions.from = SMS_FROM;
      }

      const response = await sms.send(sendOptions);
      logger.info(`SMS sent successfully to ${formattedNumber}`, { response });
    } else {
      logger.warn(`SMS not sent: Africa's Talking not configured`);
    }

    return true;
  } catch (error) {
    logger.error('SMS sending failed:', error);
    // Don't throw - return false to allow graceful handling
    return false;
  }
}

/**
 * Format phone number to international format
 */
function formatPhoneNumber(phone: string): string {
  // Remove spaces and dashes
  let cleaned = phone.replace(/[\s\-]/g, '');

  // If starts with 0, replace with Ghana country code
  if (cleaned.startsWith('0')) {
    cleaned = '+233' + cleaned.substring(1);
  }

  // If doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Send booking confirmation SMS
 */
export async function sendBookingConfirmation(
  phoneNumber: string,
  bookingRef: string,
  salonName: string,
  date: Date,
  time: string
): Promise<boolean> {
  const formattedDate = date.toLocaleDateString('en-GH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const message = `Your appointment at ${salonName} is confirmed!\nRef: ${bookingRef}\nDate: ${formattedDate}\nTime: ${time}\n\nThank you for using GroomLink!`;

  return sendSMS({ to: phoneNumber, message });
}

/**
 * Send 2-hour reminder SMS
 */
export async function sendReminderSMS(
  phoneNumber: string,
  salonName: string,
  time: string
): Promise<boolean> {
  const message = `Reminder: You have an appointment at ${salonName} today at ${time}. See you soon!\n\nGroomLink`;

  return sendSMS({ to: phoneNumber, message });
}

/**
 * Send booking cancellation SMS
 */
export async function sendCancellationSMS(
  phoneNumber: string,
  bookingRef: string,
  salonName: string
): Promise<boolean> {
  const message = `Your appointment at ${salonName} (Ref: ${bookingRef}) has been cancelled.\n\nGroomLink`;

  return sendSMS({ to: phoneNumber, message });
}

/**
 * Send payment confirmation SMS
 */
export async function sendPaymentConfirmationSMS(
  phoneNumber: string,
  amount: number,
  bookingRef: string
): Promise<boolean> {
  const message = `Payment of GHS ${amount.toFixed(2)} received for booking ${bookingRef}.\n\nThank you for using GroomLink!`;

  return sendSMS({ to: phoneNumber, message });
}

/**
 * Send OTP SMS
 */
export async function sendOTPSMS(phoneNumber: string, code: string): Promise<boolean> {
  const message = `Your GroomLink verification code is: ${code}. Valid for 10 minutes.\n\nDo not share this code with anyone.`;

  return sendSMS({ to: phoneNumber, message });
}

/**
 * Schedule reminder for booking (2 hours before)
 * This should be called by a cron job or scheduled task
 */
export async function scheduleBookingReminder(
  phoneNumber: string,
  salonName: string,
  bookingDate: Date,
  startTime: string
): Promise<void> {
  const reminderTime = new Date(bookingDate);
  const [hours, minutes] = startTime.split(':').map(Number);
  reminderTime.setHours(hours - 2, minutes, 0, 0);

  // If reminder time is in the past, don't schedule
  if (reminderTime <= new Date()) {
    return;
  }

  // In production, use a job scheduler like Bull, Agenda, or node-cron
  // For now, we'll log it
  logger.info(`Reminder scheduled for ${phoneNumber} at ${reminderTime.toISOString()}`);

  // TODO: Implement actual job scheduling
  // Example with node-cron:
  // cron.schedule(reminderTime, async () => {
  //   await sendReminderSMS(phoneNumber, salonName, startTime);
  // });
}

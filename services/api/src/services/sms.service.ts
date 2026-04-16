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
  if (process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: AT_API_KEY not set in production! SMS cannot be sent.');
  } else {
    logger.warn('AT_API_KEY not set. SMS will be logged only.');
  }
}

export interface SMSMessage {
  to: string;
  message: string;
}

/**
 * Send SMS using Africa's Talking
 */
export async function sendSMS({ to, message }: SMSMessage): Promise<boolean> {
  // Format phone number (ensure it has country code)
  const formattedNumber = formatPhoneNumber(to);

  // Log for development
  logger.info(`SMS to ${formattedNumber}: ${message}`);

  // In development mode, just log the message (don't send real SMS)
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[DEV MODE] SMS would be sent to ${formattedNumber}: ${message}`);
    return true;
  }

  // Check if SMS service is configured - throw BEFORE try block so errors propagate
  if (!sms || !AT_API_KEY) {
    // In production, this is a critical error - SMS must be sent
    if (process.env.NODE_ENV === 'production') {
      logger.error('SMS service not configured. Cannot send OTP in production.');
      throw new Error('SMS service not configured. Cannot send OTP in production.');
    }
    logger.warn(`SMS not sent: Africa's Talking not configured`);
    return false;
  }

  try {
    const sendOptions: {
      to: string[];
      message: string;
    } = {
      to: [formattedNumber],
      message,
    };
    // Note: 'from' field is intentionally NOT included.
    // Africa's Talking Ghana uses a shared shortcode by default.
    // Only add 'from' if you have an approved sender ID from AT.

    const response = await sms.send(sendOptions);
    logger.info(`SMS sent successfully to ${formattedNumber}`, { response });
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
 * Send group booking confirmation SMS to primary customer and all guests
 */
export async function sendGroupBookingConfirmation(
  primaryPhone: string,
  guestPhones: string[],
  bookingRef: string,
  salonName: string,
  date: Date,
  time: string,
  totalPeople: number
): Promise<void> {
  const formattedDate = date.toLocaleDateString('en-GH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Send to primary customer
  const primaryMessage = `Your group appointment (${totalPeople} people) at ${salonName} is confirmed!\nRef: ${bookingRef}\nDate: ${formattedDate}\nTime: ${time}\n\nThank you for using GroomLink!`;

  await sendSMS({ to: primaryPhone, message: primaryMessage });

  // Send to each guest with a phone number
  const guestMessage = `You've been added to a group appointment at ${salonName}!\nRef: ${bookingRef}\nDate: ${formattedDate}\nTime: ${time}\n\nContact your group organizer for details.`;

  const guestSendPromises = guestPhones
    .filter(phone => phone && phone.trim() !== '')
    .map(phone => sendSMS({ to: phone, message: guestMessage }));

  await Promise.all(guestSendPromises);
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

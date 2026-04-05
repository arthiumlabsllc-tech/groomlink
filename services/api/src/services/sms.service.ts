import logger from '../config/logger';

// SMS Provider configuration
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'twilio';
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_FROM = process.env.SMS_FROM_NUMBER || 'GroomLink';

export interface SMSMessage {
  to: string;
  message: string;
}

/**
 * Send SMS using configured provider
 */
export async function sendSMS({ to, message }: SMSMessage): Promise<boolean> {
  try {
    // Format phone number (ensure it has country code)
    const formattedNumber = formatPhoneNumber(to);

    // Log for development
    logger.info(`SMS to ${formattedNumber}: ${message}`);

    // In production, integrate with actual SMS provider
    // Examples: Twilio, Africa's Talking, Hubtel SMS, etc.
    if (process.env.NODE_ENV === 'production' && SMS_API_KEY) {
      // TODO: Implement actual SMS provider integration
      // Example for Twilio:
      // await twilioClient.messages.create({
      //   body: message,
      //   from: SMS_FROM,
      //   to: formattedNumber,
      // });

      // Example for Africa's Talking:
      // await africasTalking.SMS.send({
      //   to: formattedNumber,
      //   message,
      //   from: SMS_FROM,
      // });
    }

    return true;
  } catch (error) {
    logger.error('SMS sending failed:', error);
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

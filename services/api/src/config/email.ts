import logger from './logger';

// Email configuration (Hostinger SMTP)
export const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
  from: process.env.EMAIL_FROM || 'GroomLink <noreply@notification.groomlinkgh.com>',
};

// Validate email configuration
export function validateEmailConfig(): boolean {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    logger.warn('SMTP credentials not set. Email will be logged only.');
    return false;
  }
  return true;
}

export default emailConfig;

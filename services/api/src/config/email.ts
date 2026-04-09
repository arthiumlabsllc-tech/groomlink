import logger from './logger';

// Email configuration (Google Workspace/Gmail SMTP)
// IMPORTANT: Google Workspace/Gmail requires an App Password for SMTP access
// 1. Go to https://myaccount.google.com/apppasswords (sign in with the email account)
// 2. Generate a new App Password for "Mail" 
// 3. Use the 16-character App Password in SMTP_PASSWORD (NOT your regular password)
// If 2FA is not enabled, you may need to enable "Less secure app access" (not recommended)
const port = parseInt(process.env.SMTP_PORT || '465', 10);

export const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: port,
  secure: port === 465, // true for 465, false for other ports (like 587)
  requireTLS: port === 587, // use STARTTLS for port 587
  tls: {
    rejectUnauthorized: false, // allow self-signed certs if needed
  },
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
  from: process.env.EMAIL_FROM || 'GroomLink <no-reply@groomlinkgh.com>',
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

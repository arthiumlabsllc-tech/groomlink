import nodemailer from 'nodemailer';
import logger from '../config/logger';
import emailConfig, { validateEmailConfig } from '../config/email';

// GroomLink brand colors
const BRAND_GREEN = '#006B3F';
const BRAND_GOLD = '#FCD116';

// Create transporter
let transporter: nodemailer.Transporter | null = null;

if (validateEmailConfig()) {
  try {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
    });
    logger.info(`Email transporter initialized for ${emailConfig.host}:${emailConfig.port}`);
  } catch (error) {
    logger.error('Failed to initialize email transporter:', error);
  }
} else {
  logger.warn('Email service not configured. Emails will be logged only.');
}

/**
 * Send an email with OTP code
 */
export async function sendEmailOTP(email: string, otpCode: string): Promise<boolean> {
  const subject = 'Your GroomLink Verification Code';
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GroomLink Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_GREEN}; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">GroomLink</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #333; font-size: 22px; font-weight: 500;">Verify Your Email</h2>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                You're almost there! Please use the following code to verify your email address:
              </p>
            </td>
          </tr>
          
          <!-- OTP Code -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #f8f9fa; border: 2px dashed ${BRAND_GREEN}; border-radius: 8px; padding: 20px 50px;">
                    <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: ${BRAND_GREEN};">${otpCode}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Expiry Notice -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; color: #888; font-size: 14px; text-align: center;">
                <span style="color: ${BRAND_GOLD};">⏱</span> This code expires in <strong>5 minutes</strong>
              </p>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff8e1; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="margin: 0; color: #666; font-size: 13px;">
                      <strong style="color: #333;">Security tip:</strong> Never share this code with anyone. GroomLink will never ask for your verification code via phone or email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #999; font-size: 13px; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} GroomLink Ghana. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail(email, subject, html);
}

/**
 * Send a transactional email
 */
export async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    // Log for development
    logger.info(`Email to ${to}: ${subject}`);

    // In development mode, just log the message (don't send real email)
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV MODE] Email would be sent to ${to}: ${subject}`);
      return true;
    }

    // Send via SMTP in production
    if (transporter) {
      const info = await transporter.sendMail({
        from: emailConfig.from,
        to,
        subject,
        html,
      });
      logger.info(`Email sent successfully to ${to}`, { messageId: info.messageId });
    } else {
      logger.warn('Email not sent: SMTP not configured');
    }

    return true;
  } catch (error) {
    logger.error(`Email sending failed to ${to}:`, error);
    // Don't throw - return false to allow graceful handling
    return false;
  }
}

/**
 * Verify email configuration by sending test email
 */
export async function verifyEmailConfig(): Promise<boolean> {
  if (!transporter) {
    logger.warn('Email transporter not initialized');
    return false;
  }

  try {
    await transporter.verify();
    logger.info('Email server is ready to send messages');
    return true;
  } catch (error) {
    logger.error('Email configuration verification failed:', error);
    return false;
  }
}

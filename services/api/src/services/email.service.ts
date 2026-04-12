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
      requireTLS: emailConfig.requireTLS,
      tls: emailConfig.tls,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
    });
    logger.info(`Email transporter initialized for ${emailConfig.host}:${emailConfig.port} (secure: ${emailConfig.secure})`);
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
 * Send a welcome email to new support staff
 */
export async function sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
  const subject = 'Welcome to GroomLink Support Team';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to GroomLink Support Team</title>
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
              <h2 style="margin: 0 0 20px 0; color: #333; font-size: 22px; font-weight: 500;">Welcome to the Team!</h2>
              <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                Hi ${firstName},
              </p>
              <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                You have been added as a support team member at <strong style="color: ${BRAND_GREEN};">GroomLink</strong>. We're excited to have you on board!
              </p>
            </td>
          </tr>

          <!-- Login Instructions -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${BRAND_GREEN};">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px; font-weight: 600;">How to Access Your Dashboard</h3>
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; line-height: 1.6;">
                      <strong>Dashboard URL:</strong> <a href="https://support.groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">support.groomlinkgh.com</a>
                    </p>
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; line-height: 1.6;">
                      <strong>Email:</strong> ${email}
                    </p>
                    <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                      <strong>Login Method:</strong> OTP verification via email
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.6;">To log in:</p>
              <ol style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.8;">
                <li>Visit <a href="https://support.groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">support.groomlinkgh.com</a></li>
                <li>Enter your email address: <strong>${email}</strong></li>
                <li>Request an OTP code</li>
                <li>Check your email for the verification code</li>
                <li>Enter the code to access your dashboard</li>
              </ol>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.6;">
                Welcome aboard! If you have any questions, please reach out to your administrator.
              </p>
              <p style="margin: 0; color: #888; font-size: 14px;">
                — <strong style="color: ${BRAND_GREEN};">The GroomLink Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #999; font-size: 13px; text-align: center;">
                If you believe you received this email in error, please contact your administrator.
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
 * Send booking confirmation email to customer or salon owner
 */
export async function sendBookingConfirmationEmail(
  email: string,
  data: {
    customerName: string;
    bookingReference: string;
    salonName: string;
    salonAddress: string;
    salonPhone?: string;
    serviceName: string;
    workerName?: string;
    date: string;
    startTime: string;
    endTime: string;
    totalAmount: number;
    finalAmount: number;
    customerNotes?: string;
  }
): Promise<boolean> {
  const subject = `Booking Confirmed - ${data.bookingReference}`;
  
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
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
              <h2 style="margin: 0 0 10px 0; color: #333; font-size: 22px; font-weight: 500;">Booking Confirmed!</h2>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                Hi ${data.customerName}, your appointment has been booked successfully.
              </p>
            </td>
          </tr>
          
          <!-- Booking Details -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${BRAND_GREEN};">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-size: 16px; font-weight: 600;">Booking Details</h3>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Reference:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.bookingReference}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Salon:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.salonName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Address:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.salonAddress}</td>
                      </tr>
                      ${data.salonPhone ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Phone:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.salonPhone}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Service:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.serviceName}</td>
                      </tr>
                      ${data.workerName ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Staff:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.workerName}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Date:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Time:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.startTime} - ${data.endTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Total:</strong></td>
                        <td style="padding: 8px 0; color: ${BRAND_GREEN}; font-size: 14px; font-weight: 600;">GHS ${data.finalAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${data.customerNotes ? `
          <!-- Customer Notes -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff8e1; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="margin: 0; color: #666; font-size: 13px;">
                      <strong style="color: #333;">Your Notes:</strong> ${data.customerNotes}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Important Note -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f5e9; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="margin: 0; color: #666; font-size: 13px;">
                      <strong style="color: ${BRAND_GREEN};">📌 Important:</strong> Please arrive 5-10 minutes before your appointment time. Bring this booking reference with you.
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
                Thank you for using GroomLink!
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
 * Send new booking notification to salon owner
 */
export async function sendNewBookingNotificationEmail(
  email: string,
  data: {
    customerName: string;
    bookingReference: string;
    serviceName: string;
    workerName?: string;
    date: string;
    startTime: string;
    endTime: string;
    finalAmount: number;
    customerPhone?: string;
    customerNotes?: string;
  }
): Promise<boolean> {
  const subject = `New Booking Received - ${data.bookingReference}`;
  
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking</title>
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
              <h2 style="margin: 0 0 10px 0; color: #333; font-size: 22px; font-weight: 500;">New Booking Received!</h2>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                A new booking has been made at your salon.
              </p>
            </td>
          </tr>
          
          <!-- Booking Details -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${BRAND_GOLD};">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-size: 16px; font-weight: 600;">Booking Details</h3>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Reference:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.bookingReference}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Customer:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.customerName}</td>
                      </tr>
                      ${data.customerPhone ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Phone:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.customerPhone}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Service:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.serviceName}</td>
                      </tr>
                      ${data.workerName ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Staff:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.workerName}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Date:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Time:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.startTime} - ${data.endTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Amount:</strong></td>
                        <td style="padding: 8px 0; color: ${BRAND_GREEN}; font-size: 14px; font-weight: 600;">GHS ${data.finalAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${data.customerNotes ? `
          <!-- Customer Notes -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff8e1; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="margin: 0; color: #666; font-size: 13px;">
                      <strong style="color: #333;">Customer Notes:</strong> ${data.customerNotes}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #999; font-size: 13px; text-align: center;">
                Manage your bookings on the GroomLink Partner Dashboard.
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
 * Send payment receipt email to customer or salon owner
 */
export async function sendPaymentReceiptEmail(
  email: string,
  data: {
    customerName: string;
    bookingReference: string;
    paymentReference?: string;
    salonName: string;
    serviceName: string;
    date: string;
    startTime: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paidAt: string;
  }
): Promise<boolean> {
  const subject = `Payment Receipt - ${data.bookingReference}`;
  
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedPaidAt = new Date(data.paidAt).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
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
              <p style="margin: 10px 0 0 0; color: ${BRAND_GOLD}; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Payment Receipt</p>
            </td>
          </tr>
          
          <!-- Success Badge -->
          <tr>
            <td align="center" style="padding: 30px 40px 20px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #e8f5e9; border-radius: 50px; padding: 10px 25px;">
                    <span style="color: ${BRAND_GREEN}; font-size: 14px; font-weight: 600;">✓ Payment Successful</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Amount -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; color: #666; font-size: 14px;">Amount Paid</p>
              <p style="margin: 5px 0 0 0; color: #333; font-size: 36px; font-weight: 700;">${data.currency} ${data.amount.toFixed(2)}</p>
            </td>
          </tr>
          
          <!-- Receipt Details -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${BRAND_GREEN};">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-size: 16px; font-weight: 600;">Receipt Details</h3>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Receipt To:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Booking Ref:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.bookingReference}</td>
                      </tr>
                      ${data.paymentReference ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Payment Ref:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.paymentReference}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Salon:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.salonName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Service:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.serviceName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Appointment:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${formattedDate} at ${data.startTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Payment Method:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.paymentMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Paid On:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${formattedPaidAt}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Thank You -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="margin: 0; color: #666; font-size: 14px; text-align: center; line-height: 1.6;">
                Thank you for your payment! Please keep this receipt for your records.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #999; font-size: 13px; text-align: center;">
                This is an automated receipt from GroomLink.
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
 * Send payment received notification to salon owner
 */
export async function sendPaymentReceivedNotificationEmail(
  email: string,
  data: {
    customerName: string;
    bookingReference: string;
    paymentReference?: string;
    serviceName: string;
    date: string;
    startTime: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paidAt: string;
  }
): Promise<boolean> {
  const subject = `Payment Received - ${data.bookingReference}`;
  
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedPaidAt = new Date(data.paidAt).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received</title>
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
              <p style="margin: 10px 0 0 0; color: ${BRAND_GOLD}; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Payment Notification</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h2 style="margin: 0 0 10px 0; color: #333; font-size: 22px; font-weight: 500;">Payment Received!</h2>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6;">
                A payment has been received for a booking at your salon.
              </p>
            </td>
          </tr>
          
          <!-- Amount -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; color: #666; font-size: 14px;">Amount Received</p>
              <p style="margin: 5px 0 0 0; color: ${BRAND_GREEN}; font-size: 32px; font-weight: 700;">${data.currency} ${data.amount.toFixed(2)}</p>
            </td>
          </tr>
          
          <!-- Payment Details -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid ${BRAND_GOLD};">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #333; font-size: 16px; font-weight: 600;">Payment Details</h3>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px; width: 40%;"><strong>Customer:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Booking Ref:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.bookingReference}</td>
                      </tr>
                      ${data.paymentReference ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Payment Ref:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.paymentReference}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Service:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.serviceName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Appointment:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${formattedDate} at ${data.startTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Payment Method:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${data.paymentMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Paid On:</strong></td>
                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${formattedPaidAt}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #999; font-size: 13px; text-align: center;">
                Manage your bookings on the GroomLink Partner Dashboard.
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

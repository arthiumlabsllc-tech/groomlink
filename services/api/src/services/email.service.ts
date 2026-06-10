import nodemailer from 'nodemailer';
import logger from '../config/logger';
import emailConfig, { validateEmailConfig } from '../config/email';

// GroomLink brand colors
const BRAND_GREEN = '#006B3F';
const BRAND_GOLD = '#FCD116';

/**
 * Dark mode support for email templates.
 * Adds meta tags and CSS media query so content is visible
 * in dark-mode email clients (Apple Mail, iOS, Gmail, Outlook).
 */
function getDarkModeHead(): string {
  return `
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: dark) {
      /* Background overrides */
      body, .email-body { background-color: #1a1a1a !important; }
      .email-card { background-color: #2d2d2d !important; }
      .email-detail-panel { background: #363636 !important; }
      .email-footer { background-color: #262626 !important; }
      .email-notice-yellow { background-color: #3a3520 !important; border-color: #8b7a2b !important; }
      .email-notice-green { background-color: #1a3a24 !important; border-color: #2d7a4a !important; }

      /* Text color overrides — headings */
      .email-card h2 { color: #f0f0f0 !important; }
      .email-detail-panel h3 { color: #f0f0f0 !important; }

      /* Text color overrides — detail panel rows (labels + values) */
      .email-detail-panel td { color: #e0e0e0 !important; }
      .email-detail-panel th { color: #a0a0a0 !important; }

      /* Text color overrides — paragraphs & general content */
      .email-card p { color: #d0d0d0 !important; }
      .email-card td { color: #d0d0d0 !important; }
      .email-card strong { color: #f0f0f0 !important; }

      /* Footer text */
      .email-footer p { color: #a0a0a0 !important; }
      .email-footer a { color: #4ade80 !important; }

      /* Notice box text */
      .email-notice-yellow p, .email-notice-green p { color: #e0e0e0 !important; }
      .email-notice-yellow strong, .email-notice-green strong { color: #f5f5f5 !important; }

      /* Chat reply template */
      .email-card div { background-color: #3d3d3d !important; color: #e0e0e0 !important; border-color: #4ade80 !important; }

      /* Amount display */
      .email-card p[style*="42px"] { color: #f0f0f0 !important; }
    }
  </style>`;
}

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
  ${getDarkModeHead()}
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; background-color: #eef1f4;" class="email-body">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Your verification code is ready</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04); overflow: hidden;" class="email-card">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #006B3F 0%, #004D2C 100%); padding: 32px 48px 24px 48px; text-align: center;">
              <img src="https://groomlinkgh.com/api/uploads/assets/email-logo.png" alt="GroomLink" width="180" style="display: block; margin: 0 auto 8px auto; max-width: 180px; height: auto;" />
              <p style="margin: 0; color: #FCD116; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Ghana's Premier Salon Platform</p>
            </td>
          </tr>
          <!-- Gold Divider -->
          <tr>
            <td style="background-color: ${BRAND_GOLD}; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 48px 20px 48px;">
              <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 24px; font-weight: 700; border-left: 3px solid ${BRAND_GREEN}; padding-left: 14px;" class="email-text-primary">Verify Your Email</h2>
              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.7;" class="email-text-secondary">
                You're almost there! Please use the following code to verify your email address:
              </p>
            </td>
          </tr>

          <!-- OTP Code -->
          <tr>
            <td align="center" style="padding: 0 48px 30px 48px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: #006B3F; color: #ffffff; font-size: 32px; padding: 16px 20px; border-radius: 10px; letter-spacing: 12px; font-weight: 800; box-shadow: 0 4px 20px rgba(0,107,63,0.3), 0 2px 8px rgba(0,107,63,0.15);">
                    ${otpCode}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;" class="email-text-muted">
                &#9201; This code expires in <strong style="color: #1a1a1a;" class="email-text-primary">5 minutes</strong>
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 48px 40px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef9e7; border-radius: 10px; border-left: 3px solid ${BRAND_GOLD}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);" class="email-notice-yellow">
                <tr>
                  <td style="padding: 16px 22px;">
                    <p style="margin: 0; color: #4a5568; font-size: 13px; line-height: 1.6;" class="email-text-secondary">
                      <strong style="color: #1a1a1a;" class="email-text-primary">&#128274; Security tip:</strong> Never share this code with anyone. GroomLink will never ask for your verification code via phone or email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f6f8; padding: 28px 48px; border-top: 2px solid ${BRAND_GOLD};" class="email-footer">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; text-align: center;">
                <a href="https://groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Visit Website</a>
                &nbsp;&nbsp;&#124;&nbsp;&nbsp;
                <a href="mailto:support@groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Contact Support</a>
              </p>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="margin: 0 0 6px 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Trusted by salons across Ghana
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                &#169; ${new Date().getFullYear()} GroomLink Ghana. All rights reserved.
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
  ${getDarkModeHead()}
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; background-color: #eef1f4;" class="email-body">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Welcome to the GroomLink team</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04); overflow: hidden;" class="email-card">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #006B3F 0%, #004D2C 100%); padding: 32px 48px 24px 48px; text-align: center;">
              <img src="https://groomlinkgh.com/api/uploads/assets/email-logo.png" alt="GroomLink" width="180" style="display: block; margin: 0 auto 8px auto; max-width: 180px; height: auto;" />
              <p style="margin: 0; color: #FCD116; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Ghana's Premier Salon Platform</p>
            </td>
          </tr>
          <!-- Gold Divider -->
          <tr>
            <td style="background-color: ${BRAND_GOLD}; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 48px 20px 48px;">
              <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 24px; font-weight: 700; border-left: 3px solid ${BRAND_GREEN}; padding-left: 14px;" class="email-text-primary">Welcome to the Team!</h2>
              <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.7;" class="email-text-secondary">
                Hi ${firstName},
              </p>
              <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.7;" class="email-text-secondary">
                You have been added as a support team member at <strong style="color: ${BRAND_GREEN};">GroomLink</strong>. We're excited to have you on board!
              </p>
            </td>
          </tr>

          <!-- Login Instructions -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #f8fafb 0%, #f0f4f6 100%); border-radius: 12px; border-left: 3px solid ${BRAND_GREEN}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);" class="email-detail-panel">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 16px; font-weight: 700;" class="email-text-primary">How to Access Your Dashboard</h3>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; width: 40%;" class="email-text-muted">Dashboard URL</td>
                        <td style="padding: 6px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;" class="email-text-value"><a href="https://support.groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">support.groomlinkgh.com</a></td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;" class="email-text-muted">Email</td>
                        <td style="padding: 6px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;" class="email-text-value">${email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;" class="email-text-muted">Login Method</td>
                        <td style="padding: 6px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;" class="email-text-value">OTP verification via email</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 14px; line-height: 1.7;">To log in:</p>
              <ol style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 14px; line-height: 2;">
                <li>Visit <a href="https://support.groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">support.groomlinkgh.com</a></li>
                <li>Enter your email address: <strong style="color: #1a1a1a;">${email}</strong></li>
                <li>Request an OTP code</li>
                <li>Check your email for the verification code</li>
                <li>Enter the code to access your dashboard</li>
              </ol>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 0 48px 40px 48px;">
              <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.7;">
                Welcome aboard! If you have any questions, please reach out to your administrator.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                &#8212; <strong style="color: ${BRAND_GREEN};">The GroomLink Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f6f8; padding: 28px 48px; border-top: 2px solid ${BRAND_GOLD};" class="email-footer">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; text-align: center;">
                <a href="https://groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Visit Website</a>
                &nbsp;&nbsp;&#124;&nbsp;&nbsp;
                <a href="mailto:support@groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Contact Support</a>
              </p>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                If you believe you received this email in error, please contact your administrator.
              </p>
              <p style="margin: 0 0 6px 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Trusted by salons across Ghana
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                &#169; ${new Date().getFullYear()} GroomLink Ghana. All rights reserved.
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
    // Group booking support
    isGroupBooking?: boolean;
    totalPeople?: number;
    guests?: Array<{
      guestName: string;
      service: string;
      staff?: string;
      isChild?: boolean;
    }>;
  }
): Promise<boolean> {
  const subject = `Booking Confirmed - ${data.bookingReference}`;

  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build group booking details section if applicable
  const groupBookingSection = data.isGroupBooking && data.guests && data.guests.length > 0
    ? `
          <!-- Group Booking Details -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #fef9e7 0%, #fdf3d7 100%); border-radius: 12px; border-left: 3px solid ${BRAND_GOLD}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; font-weight: 700;">Group Booking (${data.totalPeople || data.guests.length} people)</h3>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                      <thead>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                          <th style="padding: 10px 8px; text-align: left; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Name</th>
                          <th style="padding: 10px 8px; text-align: left; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Service</th>
                          <th style="padding: 10px 8px; text-align: left; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Staff</th>
                          <th style="padding: 10px 8px; text-align: left; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Age Group</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${data.guests.map(guest => `
                        <tr style="border-bottom: 1px solid #f3f4f6;">
                          <td style="padding: 10px 8px; color: #1a1a1a; font-weight: 500; font-size: 14px;">${guest.guestName}</td>
                          <td style="padding: 10px 8px; color: #4a5568; font-size: 14px;">${guest.service}</td>
                          <td style="padding: 10px 8px; color: #4a5568; font-size: 14px;">${guest.staff || 'Any available'}</td>
                          <td style="padding: 10px 8px; color: #4a5568; font-size: 14px;">${guest.isChild ? 'Child' : 'Adult'}</td>
                        </tr>
                        `).join('')}
                      </tbody>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 15px; border-top: 2px solid ${BRAND_GOLD};">
                      <tr>
                        <td style="padding: 15px 8px 0 8px; color: #1a1a1a; font-size: 14px; font-weight: 700;">Total Group Amount:</td>
                        <td style="padding: 15px 8px 0 8px; color: ${BRAND_GREEN}; font-size: 16px; font-weight: 700; text-align: right;">GHS ${data.finalAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
    `
    : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  ${getDarkModeHead()}
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; background-color: #eef1f4;" class="email-body">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Your appointment is confirmed</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04); overflow: hidden;" class="email-card">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #006B3F 0%, #004D2C 100%); padding: 32px 48px 24px 48px; text-align: center;">
              <img src="https://groomlinkgh.com/api/uploads/assets/email-logo.png" alt="GroomLink" width="180" style="display: block; margin: 0 auto 8px auto; max-width: 180px; height: auto;" />
              <p style="margin: 0; color: #FCD116; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Ghana's Premier Salon Platform</p>
            </td>
          </tr>
          <!-- Gold Divider -->
          <tr>
            <td style="background-color: ${BRAND_GOLD}; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Confirmed Badge -->
          <tr>
            <td align="center" style="padding: 30px 48px 10px 48px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 50px; padding: 8px 24px;">
                    <span style="color: ${BRAND_GREEN}; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">&#10003; CONFIRMED</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 48px 30px 48px;">
              <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 24px; font-weight: 700; border-left: 3px solid ${BRAND_GREEN}; padding-left: 14px;">Booking Confirmed!</h2>
              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.7;">
                Hi ${data.customerName}, your ${data.isGroupBooking ? 'group booking' : 'appointment'} has been booked successfully.
              </p>
            </td>
          </tr>

          <!-- Booking Details -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #f8fafb 0%, #f0f4f6 100%); border-radius: 12px; border-left: 3px solid ${BRAND_GREEN}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);" class="email-detail-panel">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; font-weight: 700;">Booking Details</h3>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; width: 40%;">Reference</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.bookingReference}</td>
                      </tr>
                      ${data.isGroupBooking ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Booking Type</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">Group Booking (${data.totalPeople || data.guests?.length || 1} people)</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Salon</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.salonName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Address</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.salonAddress}</td>
                      </tr>
                      ${data.salonPhone ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Phone</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.salonPhone}</td>
                      </tr>
                      ` : ''}
                      ${!data.isGroupBooking ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Service</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.serviceName}</td>
                      </tr>
                      ${data.workerName ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Staff</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.workerName}</td>
                      </tr>
                      ` : ''}
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Date</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Time</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.startTime} - ${data.endTime}</td>
                      </tr>
                      ${!data.isGroupBooking ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Total</td>
                        <td style="padding: 8px 0; color: ${BRAND_GREEN}; font-size: 14px; font-weight: 700;">GHS ${data.finalAmount.toFixed(2)}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${groupBookingSection}

          ${data.customerNotes ? `
          <!-- Customer Notes -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef9e7; border-radius: 10px; border-left: 3px solid ${BRAND_GOLD}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);" class="email-notice-yellow">
                <tr>
                  <td style="padding: 16px 22px;">
                    <p style="margin: 0; color: #4a5568; font-size: 13px; line-height: 1.6;">
                      <strong style="color: #1a1a1a;">&#9998; Your Notes:</strong> ${data.customerNotes}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Important Note -->
          <tr>
            <td style="padding: 0 48px 40px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f5e9; border-radius: 10px; border-left: 3px solid ${BRAND_GREEN}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);" class="email-notice-green">
                <tr>
                  <td style="padding: 16px 22px;">
                    <p style="margin: 0; color: #4a5568; font-size: 13px; line-height: 1.6;">
                      <strong style="color: ${BRAND_GREEN};">&#128203; Important:</strong> Please arrive 5-10 minutes before your appointment time. Bring this booking reference with you.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f6f8; padding: 28px 48px; border-top: 2px solid ${BRAND_GOLD};" class="email-footer">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; text-align: center;">
                <a href="https://groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Visit Website</a>
                &nbsp;&nbsp;&#124;&nbsp;&nbsp;
                <a href="mailto:support@groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Contact Support</a>
              </p>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                Thank you for using GroomLink!
              </p>
              <p style="margin: 0 0 6px 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Trusted by salons across Ghana
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                &#169; ${new Date().getFullYear()} GroomLink Ghana. All rights reserved.
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
    // Group booking support
    isGroupBooking?: boolean;
    totalPeople?: number;
    guests?: Array<{
      guestName: string;
      service: string;
      staff?: string;
      isChild?: boolean;
    }>;
  }
): Promise<boolean> {
  const subject = `New Booking Received - ${data.bookingReference}`;

  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Build group booking details section if applicable
  const groupBookingSection = data.isGroupBooking && data.guests && data.guests.length > 0
    ? `
          <!-- Group Booking Details -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #e8f5e9 0%, #d4edda 100%); border-radius: 12px; border-left: 3px solid ${BRAND_GREEN}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; font-weight: 700;">Group Members (${data.totalPeople || data.guests.length} people)</h3>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                      <thead>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                          <th style="padding: 10px 8px; text-align: left; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Name</th>
                          <th style="padding: 10px 8px; text-align: left; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Service</th>
                          <th style="padding: 10px 8px; text-align: left; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Assigned Staff</th>
                          <th style="padding: 10px 8px; text-align: left; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Age</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${data.guests.map(guest => `
                        <tr style="border-bottom: 1px solid #f3f4f6;">
                          <td style="padding: 10px 8px; color: #1a1a1a; font-weight: 500; font-size: 14px;">${guest.guestName}</td>
                          <td style="padding: 10px 8px; color: #4a5568; font-size: 14px;">${guest.service}</td>
                          <td style="padding: 10px 8px; color: #4a5568; font-size: 14px;">${guest.staff || 'Unassigned'}</td>
                          <td style="padding: 10px 8px; color: #4a5568; font-size: 14px;">${guest.isChild ? 'Child' : 'Adult'}</td>
                        </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
    `
    : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking</title>
  ${getDarkModeHead()}
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; background-color: #eef1f4;" class="email-body">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">New booking at your salon</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04); overflow: hidden;" class="email-card">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #006B3F 0%, #004D2C 100%); padding: 32px 48px 24px 48px; text-align: center;">
              <img src="https://groomlinkgh.com/api/uploads/assets/email-logo.png" alt="GroomLink" width="180" style="display: block; margin: 0 auto 8px auto; max-width: 180px; height: auto;" />
              <p style="margin: 0; color: #FCD116; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Ghana's Premier Salon Platform</p>
            </td>
          </tr>
          <!-- Gold Divider -->
          <tr>
            <td style="background-color: ${BRAND_GOLD}; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- New Booking Badge -->
          <tr>
            <td align="center" style="padding: 30px 48px 10px 48px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #fef9e7 0%, #fdf3d7 100%); border-radius: 50px; padding: 8px 24px;">
                    <span style="color: #92700c; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">&#9733; NEW BOOKING</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 48px 30px 48px;">
              <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 24px; font-weight: 700; border-left: 3px solid ${BRAND_GOLD}; padding-left: 14px;">New Booking Received!</h2>
              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.7;">
                A new ${data.isGroupBooking ? 'group booking' : 'booking'} has been made at your salon.
              </p>
            </td>
          </tr>

          <!-- Booking Details -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #f8fafb 0%, #f0f4f6 100%); border-radius: 12px; border-left: 3px solid ${BRAND_GOLD}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);" class="email-detail-panel">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; font-weight: 700;">Booking Details</h3>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; width: 40%;">Reference</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.bookingReference}</td>
                      </tr>
                      ${data.isGroupBooking ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Booking Type</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">Group Booking (${data.totalPeople || data.guests?.length || 1} people)</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Customer</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.customerName}</td>
                      </tr>
                      ${data.customerPhone ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Phone</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.customerPhone}</td>
                      </tr>
                      ` : ''}
                      ${!data.isGroupBooking ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Service</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.serviceName}</td>
                      </tr>
                      ${data.workerName ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Staff</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.workerName}</td>
                      </tr>
                      ` : ''}
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Date</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Time</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.startTime} - ${data.endTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Amount</td>
                        <td style="padding: 8px 0; color: ${BRAND_GREEN}; font-size: 14px; font-weight: 700;">GHS ${data.finalAmount.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${groupBookingSection}

          ${data.customerNotes ? `
          <!-- Customer Notes -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef9e7; border-radius: 10px; border-left: 3px solid ${BRAND_GOLD}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);" class="email-notice-yellow">
                <tr>
                  <td style="padding: 16px 22px;">
                    <p style="margin: 0; color: #4a5568; font-size: 13px; line-height: 1.6;">
                      <strong style="color: #1a1a1a;">&#9998; Customer Notes:</strong> ${data.customerNotes}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f6f8; padding: 28px 48px; border-top: 2px solid ${BRAND_GOLD};" class="email-footer">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; text-align: center;">
                <a href="https://groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Visit Website</a>
                &nbsp;&nbsp;&#124;&nbsp;&nbsp;
                <a href="mailto:support@groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Contact Support</a>
              </p>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                Manage your bookings on the GroomLink Partner Dashboard.
              </p>
              <p style="margin: 0 0 6px 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Trusted by salons across Ghana
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                &#169; ${new Date().getFullYear()} GroomLink Ghana. All rights reserved.
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
  ${getDarkModeHead()}
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; background-color: #eef1f4;" class="email-body">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Payment confirmed - receipt inside</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04); overflow: hidden;" class="email-card">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #006B3F 0%, #004D2C 100%); padding: 32px 48px 24px 48px; text-align: center;">
              <img src="https://groomlinkgh.com/api/uploads/assets/email-logo.png" alt="GroomLink" width="180" style="display: block; margin: 0 auto 8px auto; max-width: 180px; height: auto;" />
              <p style="margin: 0; color: #FCD116; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Ghana's Premier Salon Platform</p>
            </td>
          </tr>
          <!-- Gold Divider -->
          <tr>
            <td style="background-color: ${BRAND_GOLD}; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Success Badge -->
          <tr>
            <td align="center" style="padding: 30px 48px 20px 48px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border-radius: 50px; padding: 8px 24px;">
                    <span style="color: ${BRAND_GREEN}; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">&#10003; PAYMENT SUCCESSFUL</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Amount -->
          <tr>
            <td align="center" style="padding: 0 48px 30px 48px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</p>
              <p style="margin: 6px 0 0 0; color: #1a1a1a; font-size: 42px; font-weight: 700;">${data.amount.toFixed(2)}</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; font-weight: 500;">${data.currency}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin-top: 12px;">
                <tr>
                  <td style="background-color: ${BRAND_GOLD}; height: 3px; width: 80px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Receipt Details -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #f8fafb 0%, #f0f4f6 100%); border-radius: 12px; border-left: 3px solid ${BRAND_GREEN}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);" class="email-detail-panel">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; font-weight: 700;">Receipt Details</h3>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; width: 40%;">Receipt To</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Booking Ref</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.bookingReference}</td>
                      </tr>
                      ${data.paymentReference ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Payment Ref</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.paymentReference}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Salon</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.salonName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Service</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.serviceName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Appointment</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${formattedDate} at ${data.startTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Payment Method</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.paymentMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Paid On</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${formattedPaidAt}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Thank You -->
          <tr>
            <td style="padding: 0 48px 40px 48px;">
              <p style="margin: 0; color: #4a5568; font-size: 14px; text-align: center; line-height: 1.7;">
                Thank you for your payment! Please keep this receipt for your records.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f6f8; padding: 28px 48px; border-top: 2px solid ${BRAND_GOLD};" class="email-footer">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; text-align: center;">
                <a href="https://groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Visit Website</a>
                &nbsp;&nbsp;&#124;&nbsp;&nbsp;
                <a href="mailto:support@groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Contact Support</a>
              </p>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                This is an automated receipt from GroomLink.
              </p>
              <p style="margin: 0 0 6px 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Trusted by salons across Ghana
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                &#169; ${new Date().getFullYear()} GroomLink Ghana. All rights reserved.
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
  ${getDarkModeHead()}
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif; background-color: #eef1f4;" class="email-body">
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">Payment received at your salon</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04); overflow: hidden;" class="email-card">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #006B3F 0%, #004D2C 100%); padding: 32px 48px 24px 48px; text-align: center;">
              <img src="https://groomlinkgh.com/api/uploads/assets/email-logo.png" alt="GroomLink" width="180" style="display: block; margin: 0 auto 8px auto; max-width: 180px; height: auto;" />
              <p style="margin: 0; color: #FCD116; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Ghana's Premier Salon Platform</p>
            </td>
          </tr>
          <!-- Gold Divider -->
          <tr>
            <td style="background-color: ${BRAND_GOLD}; height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 48px 20px 48px;">
              <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 24px; font-weight: 700; border-left: 3px solid ${BRAND_GOLD}; padding-left: 14px;">Payment Received!</h2>
              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.7;">
                A payment has been received for a booking at your salon.
              </p>
            </td>
          </tr>

          <!-- Amount -->
          <tr>
            <td align="center" style="padding: 0 48px 30px 48px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Amount Received</p>
              <p style="margin: 6px 0 0 0; color: ${BRAND_GREEN}; font-size: 42px; font-weight: 700;">${data.amount.toFixed(2)}</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; font-weight: 500;">${data.currency}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin-top: 12px;">
                <tr>
                  <td style="background-color: ${BRAND_GOLD}; height: 3px; width: 80px; font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Payment Details -->
          <tr>
            <td style="padding: 0 48px 30px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #f8fafb 0%, #f0f4f6 100%); border-radius: 12px; border-left: 3px solid ${BRAND_GOLD}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);" class="email-detail-panel">
                <tr>
                  <td style="padding: 25px 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; font-weight: 700;">Payment Details</h3>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; width: 40%;">Customer</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Booking Ref</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.bookingReference}</td>
                      </tr>
                      ${data.paymentReference ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Payment Ref</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.paymentReference}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Service</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.serviceName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Appointment</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${formattedDate} at ${data.startTime}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Payment Method</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${data.paymentMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Paid On</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500; font-size: 14px;">${formattedPaidAt}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f6f8; padding: 28px 48px; border-top: 2px solid ${BRAND_GOLD};" class="email-footer">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; text-align: center;">
                <a href="https://groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Visit Website</a>
                &nbsp;&nbsp;&#124;&nbsp;&nbsp;
                <a href="mailto:support@groomlinkgh.com" style="color: ${BRAND_GREEN}; text-decoration: none;">Contact Support</a>
              </p>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                Manage your bookings on the GroomLink Partner Dashboard.
              </p>
              <p style="margin: 0 0 6px 0; color: #9ca3af; font-size: 11px; text-align: center;">
                Trusted by salons across Ghana
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                &#169; ${new Date().getFullYear()} GroomLink Ghana. All rights reserved.
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

/**
 * Send an email notification when a support agent replies via live chat
 * and the user is offline. Lets them know there's a new reply waiting.
 */
export async function sendChatReplyEmail(
  to: string,
  recipientName: string | null | undefined,
  ticketSubject: string,
  agentName: string,
  messagePreview: string
): Promise<boolean> {
  const subject = `New reply from GroomLink Support: ${ticketSubject}`;
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hello,';
  const safePreview = (messagePreview || '').slice(0, 500);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New reply from GroomLink Support</title>
  ${getDarkModeHead()}
</head>
<body style="margin:0;padding:0;font-family:'Inter','Segoe UI',-apple-system,sans-serif;background-color:#eef1f4;" class="email-body">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;" class="email-card">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e,#10b981);padding:28px 32px;color:#ffffff;">
              <h1 style="margin:0;font-size:20px;font-weight:600;">GroomLink Support</h1>
              <p style="margin:4px 0 0;font-size:14px;opacity:0.9;">You have a new reply</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#0f172a;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 16px;"><strong>${agentName}</strong> from the support team replied to your ticket
              <em>"${ticketSubject}"</em>:</p>
              <div style="background:#f1f5f9;border-left:3px solid #10b981;padding:14px 16px;border-radius:8px;color:#1e293b;white-space:pre-wrap;">${safePreview}</div>
              <p style="margin:24px 0 0;">Reply directly inside the GroomLink app or website to continue the conversation.</p>
              <p style="margin:24px 0 0;color:#64748b;font-size:13px;">If you no longer need help, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#f8fafc;color:#64748b;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} GroomLink Ghana &middot; Support Team
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendTransactionalEmail(to, subject, html);
}

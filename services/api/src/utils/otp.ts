import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import logger from '../config/logger';

const OTP_EXPIRY_MINUTES = 10;
const EMAIL_OTP_EXPIRY_MINUTES = 5; // Email OTP expires in 5 minutes
const MAX_ATTEMPTS = 3;

// Apple App Review demo account (customer app). The fixed code 123456 is
// accepted for this email without any OTP being sent or stored.
export const DEMO_REVIEW_EMAIL = 'demo@groomlinkgh.com';
export const DEMO_REVIEW_CODE = '123456';

export function generateOTP(): string {
  // In development, use mock OTP
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_OTP) {
    return process.env.MOCK_OTP;
  }
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * App Review demo bypass: when DEMO_OTP_ENABLED=true, the configured demo
 * phone number accepts the configured fixed code and no SMS is sent.
 * Used to let Apple's App Review sign in without a live SMS code.
 * Disable (or unset) after the review is complete.
 */
export function isDemoOtpBypass(phoneNumber: string, code?: string): boolean {
  if (process.env.DEMO_OTP_ENABLED !== 'true') return false;
  const demoPhone = process.env.DEMO_PHONE_NUMBER;
  const demoCode = process.env.DEMO_OTP_CODE;
  if (!demoPhone || !demoCode) return false;
  if (phoneNumber !== demoPhone) return false;
  if (code === undefined) return true;
  return code === demoCode;
}

export async function createOTP(phoneNumber: string): Promise<string> {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing OTPs for this phone number
  await prisma.otp.updateMany({
    where: { phoneNumber },
    data: { verified: true }, // Mark as used
  });

  // Create new OTP
  await prisma.otp.create({
    data: {
      phoneNumber,
      code,
      expiresAt,
    },
  });

  logger.info(`OTP generated for ${phoneNumber}`);
  return code;
}

export async function verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
  // App Review demo account: accept the fixed code without a stored OTP
  if (isDemoOtpBypass(phoneNumber, code)) {
    logger.info(`Demo OTP bypass accepted for ${phoneNumber}`);
    return true;
  }

  const otp = await prisma.otp.findFirst({
    where: {
      phoneNumber,
      code,
      verified: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otp) {
    return false;
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    return false;
  }

  if (otp.code !== code) {
    // Increment attempts
    await prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  // Mark as verified
  await prisma.otp.update({
    where: { id: otp.id },
    data: { verified: true },
  });

  return true;
}

/**
 * Create OTP for email verification
 */
export async function createEmailOTP(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing OTPs for this email (case-insensitive via normalization)
  await prisma.otp.updateMany({
    where: { email: normalizedEmail },
    data: { verified: true }, // Mark as used
  });

  // Create new OTP for email
  await prisma.otp.create({
    data: {
      phoneNumber: '', // Not used for email OTPs
      email: normalizedEmail,
      code,
      expiresAt,
    },
  });

  logger.info(`OTP generated for email ${normalizedEmail}`);
  return code;
}

/**
 * Verify email OTP
 */
export async function verifyEmailOTP(email: string, code: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();

  // Find the most recent unverified, unexpired OTP for this email.
  // We intentionally do NOT filter by `code` here so that a wrong-code attempt
  // still finds the OTP row and increments its attempts counter.
  const otp = await prisma.otp.findFirst({
    where: {
      email: normalizedEmail,
      verified: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otp) {
    logger.warn(`No active OTP found for email ${normalizedEmail}`);
    return false;
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    logger.warn(`Max OTP attempts reached for email ${normalizedEmail}`);
    return false;
  }

  if (otp.code !== normalizedCode) {
    // Increment attempts on wrong code
    await prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    logger.warn(`Invalid OTP code for email ${normalizedEmail} (attempt ${otp.attempts + 1}/${MAX_ATTEMPTS})`);
    return false;
  }

  // Mark as verified
  await prisma.otp.update({
    where: { id: otp.id },
    data: { verified: true },
  });

  return true;
}

export async function cleanupExpiredOTPs(): Promise<void> {
  const deleted = await prisma.otp.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  if (deleted.count > 0) {
    logger.info(`Cleaned up ${deleted.count} expired OTPs`);
  }
}

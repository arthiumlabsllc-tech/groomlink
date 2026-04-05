import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import logger from '../config/logger';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;

export function generateOTP(): string {
  // In development, use mock OTP
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_OTP) {
    return process.env.MOCK_OTP;
  }
  // Generate 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
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

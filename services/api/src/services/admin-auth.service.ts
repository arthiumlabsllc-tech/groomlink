import prisma from '../config/database';
import logger from '../config/logger';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { User, UserStatus, Prisma } from '@prisma/client';
import {
  generateToken,
  generateRefreshToken,
  generateAdmin2faPendingToken,
  verifyAdmin2faPendingToken,
} from '../utils/jwt';
import { verifyPassword } from '../utils/password';
import {
  generateTotpSecret,
  verifyTotpToken,
  buildOtpauthUrl,
  generateBackupCodes,
  normalizeBackupCode,
} from '../utils/totp';

const ADMIN_ROLES = ['ADMIN', 'SUPPORT', 'SUPER_ADMIN'];
const BACKUP_CODE_COUNT = 10;

interface AdminAuthResponse {
  user: {
    id: string;
    phoneNumber: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    role: string;
    isVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

async function buildAuthResponse(user: User): Promise<AdminAuthResponse> {
  const accessToken = generateToken({
    userId: user.id,
    phoneNumber: user.phoneNumber,
    role: user.role,
  });
  const refreshToken = await generateRefreshToken({
    userId: user.id,
    phoneNumber: user.phoneNumber,
    role: user.role,
  });
  return {
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
    tokens: { accessToken, refreshToken },
  };
}

/** Verify a TOTP token or consume a one-time backup code for a user. */
async function verifySecondFactor(
  user: Pick<User, 'id' | 'twoFactorSecret' | 'twoFactorBackupCodes'>,
  code: string
): Promise<boolean> {
  // TOTP first
  if (user.twoFactorSecret && verifyTotpToken(user.twoFactorSecret, code)) {
    return true;
  }

  // Fall back to one-time backup codes (stored bcrypt-hashed)
  const storedHashes = Array.isArray(user.twoFactorBackupCodes)
    ? (user.twoFactorBackupCodes as unknown as string[])
    : [];
  if (storedHashes.length === 0) {
    return false;
  }

  const normalized = normalizeBackupCode(code);
  if (!/^[A-Z0-9]{8}$/.test(normalized)) {
    return false;
  }

  for (let i = 0; i < storedHashes.length; i++) {
    if (await bcrypt.compare(normalized, storedHashes[i])) {
      // Consume the code so it cannot be reused
      const remaining = storedHashes.filter((_, index) => index !== i);
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: remaining },
      });
      return true;
    }
  }
  return false;
}

/**
 * Admin login step 1: email + password.
 * Returns either full tokens (2FA not set up) or a short-lived pending token
 * that must be completed with a TOTP/backup code.
 */
export async function adminLogin(
  email: string,
  password: string
): Promise<{ requiresTwoFactor: true; twoFactorToken: string } | AdminAuthResponse> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Same error for unknown email / wrong role / bad password to avoid enumeration
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    throw new Error('Invalid email or password');
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw new Error('Account has been suspended');
  }
  if (!user.password) {
    throw new Error('No password is set for this account. Contact a super admin to set one.');
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    return {
      requiresTwoFactor: true,
      twoFactorToken: generateAdmin2faPendingToken(user.id),
    };
  }

  // 2FA not configured yet — log in directly (setup is prompted in the dashboard)
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  logger.info(`Admin logged in without 2FA configured: ${user.id}`);
  return buildAuthResponse(user);
}

/** Admin login step 2: verify TOTP/backup code against the pending token. */
export async function verifyAdmin2faLogin(twoFactorToken: string, code: string): Promise<AdminAuthResponse> {
  const { userId } = verifyAdmin2faPendingToken(twoFactorToken);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !ADMIN_ROLES.includes(user.role) || user.status === UserStatus.SUSPENDED) {
    throw new Error('Invalid session. Please sign in again.');
  }
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new Error('Two-factor authentication is not enabled for this account.');
  }

  const valid = await verifySecondFactor(user, code);
  if (!valid) {
    throw new Error('Invalid authentication code. Check your authenticator app and try again.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  logger.info(`Admin 2FA login verified: ${user.id}`);
  return buildAuthResponse(user);
}

/** Current 2FA status for the signed-in admin. */
export async function getTwoFactorStatus(userId: string): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true, twoFactorBackupCodes: true },
  });
  const codes = Array.isArray(user?.twoFactorBackupCodes)
    ? (user!.twoFactorBackupCodes as unknown as string[])
    : [];
  return { enabled: user?.twoFactorEnabled ?? false, backupCodesRemaining: codes.length };
}

/**
 * Begin 2FA enrollment: generate a secret + QR code.
 * The secret is stored with twoFactorEnabled=false until confirmed.
 */
export async function setupTwoFactor(userId: string): Promise<{ secret: string; otpauthUrl: string; qrCode: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.twoFactorEnabled) throw new Error('Two-factor authentication is already enabled.');

  const secret = generateTotpSecret();
  const accountName = user.email || `${user.firstName}.${user.lastName}`;
  const otpauthUrl = buildOtpauthUrl(secret, accountName);
  const qrCode = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  return { secret, otpauthUrl, qrCode };
}

/** Confirm enrollment with a code from the authenticator app; issues backup codes once. */
export async function enableTwoFactor(userId: string, code: string): Promise<{ backupCodes: string[] }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.twoFactorEnabled) throw new Error('Two-factor authentication is already enabled.');
  if (!user.twoFactorSecret) throw new Error('No pending 2FA setup. Start setup first.');

  if (!verifyTotpToken(user.twoFactorSecret, code)) {
    throw new Error('Invalid code. Enter the current 6-digit code from your authenticator app.');
  }

  const backupCodes = generateBackupCodes(BACKUP_CODE_COUNT);
  const hashed = await Promise.all(backupCodes.map((c) => bcrypt.hash(normalizeBackupCode(c), 10)));

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true, twoFactorBackupCodes: hashed },
  });
  logger.info(`2FA enabled for admin user: ${userId}`);

  return { backupCodes };
}

/** Disable 2FA after proving possession of the current TOTP or a backup code. */
export async function disableTwoFactor(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (!user.twoFactorEnabled) throw new Error('Two-factor authentication is not enabled.');

  const valid = await verifySecondFactor(user, code);
  if (!valid) {
    throw new Error('Invalid code. Enter your current authenticator or backup code.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: Prisma.JsonNull },
  });
  logger.info(`2FA disabled for admin user: ${userId}`);
}

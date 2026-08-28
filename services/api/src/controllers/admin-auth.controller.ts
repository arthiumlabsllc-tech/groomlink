import { Request, Response } from 'express';
import { z } from 'zod';
import { successResponse, errorResponse } from '../utils/response';
import * as adminAuthService from '../services/admin-auth.service';
import * as securityAlert from '../services/security-alert.service';

const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email('Invalid email format')),
  password: z.string().min(1, 'Password is required'),
});

const twoFactorVerifySchema = z.object({
  twoFactorToken: z.string().min(1),
  code: z.string().trim().min(6).max(16),
});

const codeSchema = z.object({
  code: z.string().trim().min(6).max(16),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

function getAuthUserId(req: Request): string | null {
  return (req as any).user?.id ?? null;
}

/** POST /auth/admin/login — email + password, returns 2FA pending token when enabled. */
export async function adminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = adminLoginSchema.parse(req.body);
    const result = await adminAuthService.adminLogin(email, password);
    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    securityAlert.recordFailedLogin({
      identifier: (req.body && req.body.email) || 'unknown',
      reason: (error as Error).message,
      req,
    }).catch(() => undefined);
    errorResponse(res, 'LOGIN_FAILED', (error as Error).message, 401);
  }
}

/** POST /auth/admin/2fa/verify — complete login with TOTP/backup code. */
export async function verifyAdminTwoFactor(req: Request, res: Response): Promise<void> {
  try {
    const { twoFactorToken, code } = twoFactorVerifySchema.parse(req.body);
    const result = await adminAuthService.verifyAdmin2faLogin(twoFactorToken, code);
    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    securityAlert.recordFailedLogin({
      identifier: 'admin-2fa',
      reason: (error as Error).message,
      req,
    }).catch(() => undefined);
    errorResponse(res, 'TWO_FACTOR_FAILED', (error as Error).message, 401);
  }
}

/** GET /auth/admin/2fa/status */
export async function twoFactorStatus(req: Request, res: Response): Promise<void> {
  const userId = getAuthUserId(req);
  if (!userId) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }
  try {
    const status = await adminAuthService.getTwoFactorStatus(userId);
    successResponse(res, status);
  } catch (error) {
    errorResponse(res, 'FETCH_FAILED', (error as Error).message, 500);
  }
}

/** POST /auth/admin/2fa/setup — generate secret + QR for enrollment. */
export async function setupTwoFactor(req: Request, res: Response): Promise<void> {
  const userId = getAuthUserId(req);
  if (!userId) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }
  try {
    const setup = await adminAuthService.setupTwoFactor(userId);
    successResponse(res, setup);
  } catch (error) {
    errorResponse(res, 'SETUP_FAILED', (error as Error).message, 400);
  }
}

/** POST /auth/admin/2fa/enable — confirm enrollment, returns backup codes once. */
export async function enableTwoFactor(req: Request, res: Response): Promise<void> {
  const userId = getAuthUserId(req);
  if (!userId) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }
  try {
    const { code } = codeSchema.parse(req.body);
    const result = await adminAuthService.enableTwoFactor(userId, code);
    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'ENABLE_FAILED', (error as Error).message, 400);
  }
}

/** POST /auth/admin/2fa/disable — requires current TOTP or backup code. */
export async function disableTwoFactor(req: Request, res: Response): Promise<void> {
  const userId = getAuthUserId(req);
  if (!userId) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }
  try {
    const { code } = codeSchema.parse(req.body);
    await adminAuthService.disableTwoFactor(userId, code);
    successResponse(res, { message: 'Two-factor authentication disabled' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'DISABLE_FAILED', (error as Error).message, 400);
  }
}

/** POST /auth/admin/change-password — change admin password. */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = getAuthUserId(req);
  if (!userId) {
    errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
    return;
  }
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await adminAuthService.changePassword(userId, currentPassword, newPassword);
    successResponse(res, { message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'PASSWORD_CHANGE_FAILED', (error as Error).message, 400);
  }
}

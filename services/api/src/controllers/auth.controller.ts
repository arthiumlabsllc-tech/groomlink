import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import * as authService from '../services/auth.service';
import { RoleMismatchError } from '../services/auth.service';
import * as securityAlert from '../services/security-alert.service';
import { z } from 'zod';
import prisma from '../config/database';
import { generateToken, generateRefreshToken } from '../utils/jwt';

const phoneSchema = z.object({
  phoneNumber: z.string().regex(/^\+233[0-9]{9}$/, 'Invalid phone number format. Use +233XXXXXXXXX'),
});

const verifyOTPSchema = z.object({
  phoneNumber: z.string(),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

const registerSchema = z.object({
  phoneNumber: z.string().optional(),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
}).refine(
  (data) => data.phoneNumber || data.email,
  { message: 'Either phoneNumber or email is required' }
);

const loginSchema = z.object({
  phoneNumber: z.string(),
  password: z.string().optional(),
});

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email('Invalid email format')),
  role: z.enum(['CUSTOMER', 'SALON_OWNER']).optional(),
});

const verifyEmailOTPSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email('Invalid email format')),
  code: z.string().trim().length(6, 'OTP must be 6 digits'),
  role: z.enum(['CUSTOMER', 'SALON_OWNER']).optional(),
});

const completeRegistrationSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email('Invalid email format')),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\+233[0-9]{9}$/, 'Invalid phone number format. Use +233XXXXXXXXX').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  role: z.enum(['CUSTOMER', 'SALON_OWNER']).optional(),
});

export async function requestOTP(req: Request, res: Response): Promise<void> {
  try {
    const { phoneNumber } = phoneSchema.parse(req.body);
    // Count every request for this IP – raise OTP_BOMB at thresholds.
    securityAlert.recordOtpRequest({ identifier: phoneNumber, req }).catch(() => undefined);
    await authService.requestOTP(phoneNumber);
    successResponse(res, { message: 'OTP sent successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'REQUEST_FAILED', (error as Error).message, 400);
  }
}

export async function verifyOTP(req: Request, res: Response): Promise<void> {
  try {
    const { phoneNumber, code } = verifyOTPSchema.parse(req.body);
    const result = await authService.verifyOTPAndLogin(phoneNumber, code);
    
    if (result) {
      successResponse(res, result);
    } else {
      securityAlert.recordOtpFailure({ identifier: phoneNumber, req }).catch(() => undefined);
      errorResponse(res, 'INVALID_OTP', 'Invalid or expired OTP', 400);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'VERIFICATION_FAILED', (error as Error).message, 400);
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    successResponse(res, result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'REGISTRATION_FAILED', (error as Error).message, 400);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    successResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    // Record failed login for brute-force detection
    securityAlert.recordFailedLogin({
      identifier: (req.body && (req.body.phoneNumber || req.body.email)) || 'unknown',
      reason: (error as Error).message,
      req,
    }).catch(() => undefined);
    errorResponse(res, 'LOGIN_FAILED', (error as Error).message, 401);
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      errorResponse(res, 'MISSING_TOKEN', 'Refresh token is required', 400);
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, 'REFRESH_FAILED', (error as Error).message, 401);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (userId) {
      await authService.logout(userId);
    }
    successResponse(res, { message: 'Logged out successfully' });
  } catch (error) {
    errorResponse(res, 'LOGOUT_FAILED', (error as Error).message, 500);
  }
}

export async function requestEmailOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email, role } = emailSchema.parse(req.body);
    securityAlert.recordOtpRequest({ identifier: email, req }).catch(() => undefined);
    await authService.requestEmailOTP(email, role as any);
    successResponse(res, { message: 'OTP sent successfully to your email' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    // Handle role mismatch specifically
    if (error instanceof RoleMismatchError) {
      errorResponse(res, 'ROLE_MISMATCH', error.message, 400);
      return;
    }
    errorResponse(res, 'REQUEST_FAILED', (error as Error).message, 400);
  }
}

export async function verifyEmailOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email, code, role } = verifyEmailOTPSchema.parse(req.body);
    
    // Demo account bypass for App Store review
    // REMOVE AFTER APPROVAL: This allows Apple reviewers to login without email access
    if (email === 'demo@groomlink.com' && code === '123456') {
      const result = await authService.verifyEmailOTPAndLogin(email, code, role || 'CUSTOMER');
      
      if (result) {
        successResponse(res, result);
        return;
      }
      
      // If account doesn't exist yet, auto-create it
      const newUser = await prisma.user.create({
        data: {
          email: 'demo@groomlink.com',
          firstName: 'Demo',
          lastName: 'User',
          role: 'CUSTOMER',
          phoneNumber: '+233241234567',
          isVerified: true,
        },
      });
      
      const accessToken = generateToken({
        userId: newUser.id,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
      });
      
      const refreshToken = await generateRefreshToken({
        userId: newUser.id,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
      });
      
      successResponse(res, {
        user: {
          id: newUser.id,
          phoneNumber: newUser.phoneNumber,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          isVerified: newUser.isVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
        isNewUser: true,
      });
      return;
    }
    
    const result = await authService.verifyEmailOTPAndLogin(email, code, role);
    
    if (result) {
      successResponse(res, result);
    } else {
      securityAlert.recordOtpFailure({ identifier: email, req }).catch(() => undefined);
      errorResponse(res, 'INVALID_OTP', 'Invalid or expired OTP', 400);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    // Handle role mismatch specifically
    if (error instanceof RoleMismatchError) {
      errorResponse(res, 'ROLE_MISMATCH', error.message, 400);
      return;
    }
    errorResponse(res, 'VERIFICATION_FAILED', (error as Error).message, 400);
  }
}

export async function completeRegistration(req: Request, res: Response): Promise<void> {
  try {
    const data = completeRegistrationSchema.parse(req.body);

    // Verify that the email in the request matches the verified email from the token
    const verifiedEmail = (req as any).user?.pendingEmail;
    if (!verifiedEmail) {
      errorResponse(res, 'UNAUTHORIZED', 'Email verification required. Please verify your email first.', 401);
      return;
    }
    if (data.email.toLowerCase() !== verifiedEmail.toLowerCase()) {
      errorResponse(res, 'EMAIL_MISMATCH', 'The email provided does not match the verified email. Please use the email you verified with OTP.', 400);
      return;
    }

    // Use the role from the token (verified during OTP step)
    const tokenRole = (req as any).user?.role;
    if (tokenRole) {
      data.role = tokenRole;
    }

    const result = await authService.completeRegistration(data);
    successResponse(res, result, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    // Handle role mismatch specifically
    if (error instanceof RoleMismatchError) {
      errorResponse(res, 'ROLE_MISMATCH', error.message, 400);
      return;
    }
    errorResponse(res, 'REGISTRATION_FAILED', (error as Error).message, 400);
  }
}

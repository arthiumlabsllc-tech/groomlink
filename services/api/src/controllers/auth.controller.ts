import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import * as authService from '../services/auth.service';
import { z } from 'zod';

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
  email: z.string().email('Invalid email format'),
});

const verifyEmailOTPSchema = z.object({
  email: z.string().email('Invalid email format'),
  code: z.string().length(6, 'OTP must be 6 digits'),
});

export async function requestOTP(req: Request, res: Response): Promise<void> {
  try {
    const { phoneNumber } = phoneSchema.parse(req.body);
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
    const { email } = emailSchema.parse(req.body);
    await authService.requestEmailOTP(email);
    successResponse(res, { message: 'OTP sent successfully to your email' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      errorResponse(res, 'VALIDATION_ERROR', error.errors[0].message, 400);
      return;
    }
    errorResponse(res, 'REQUEST_FAILED', (error as Error).message, 400);
  }
}

export async function verifyEmailOTP(req: Request, res: Response): Promise<void> {
  try {
    const { email, code } = verifyEmailOTPSchema.parse(req.body);
    const result = await authService.verifyEmailOTPAndLogin(email, code);
    
    if (result) {
      successResponse(res, result);
    } else {
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

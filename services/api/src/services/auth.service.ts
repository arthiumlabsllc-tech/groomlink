import prisma from '../config/database';
import logger from '../config/logger';
import { generateToken, generateRefreshToken, verifyRefreshToken, rotateRefreshToken, revokeAllUserRefreshTokens } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { createOTP, verifyOTP, createEmailOTP, verifyEmailOTP } from '../utils/otp';
import { sendOTPSMS } from './sms.service';
import { sendEmailOTP } from './email.service';
import { UserRole, UserStatus } from '../middleware/auth';

export interface RegisterData {
  phoneNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  password?: string;
}

export interface LoginData {
  phoneNumber: string;
  password?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    phoneNumber: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    role: UserRole;
    isVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export async function requestOTP(phoneNumber: string): Promise<void> {
  // Validate phone number format (Ghana)
  const ghanaPhoneRegex = /^\+233[0-9]{9}$/;
  if (!ghanaPhoneRegex.test(phoneNumber)) {
    throw new Error('Invalid phone number format. Use +233XXXXXXXXX');
  }

  const otp = await createOTP(phoneNumber);
  logger.info(`OTP requested for ${phoneNumber}`);

  // Send OTP via SMS - await to ensure delivery and propagate errors to client
  // OTP is already saved in database, so retry will work even if this request fails
  const smsSent = await sendOTPSMS(phoneNumber, otp);
  if (!smsSent) {
    logger.error(`Failed to send OTP SMS to ${phoneNumber}`);
    throw new Error('Failed to send OTP SMS. Please try again.');
  }
}

export async function verifyPhoneOTP(phoneNumber: string, code: string): Promise<boolean> {
  return verifyOTP(phoneNumber, code);
}

export interface OTPVerifyResponse {
  user: {
    id: string;
    phoneNumber: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    role: UserRole;
    isVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  isNewUser: boolean;
}

export async function verifyOTPAndLogin(phoneNumber: string, code: string): Promise<OTPVerifyResponse | null> {
  // First verify the OTP
  const isValid = await verifyOTP(phoneNumber, code);
  if (!isValid) {
    return null;
  }

  // Find the user
  const user = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (!user) {
    // User doesn't exist - they need to register
    // Return a temporary verification token for registration
    const tempToken = generateToken({
      userId: 'pending',
      phoneNumber,
      role: UserRole.CUSTOMER,
    });
    
    return {
      user: {
        id: '',
        phoneNumber,
        firstName: '',
        lastName: '',
        email: null,
        role: UserRole.CUSTOMER,
        isVerified: true,
      },
      tokens: {
        accessToken: tempToken,
        refreshToken: '',
      },
      isNewUser: true,
    };
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new Error('Account has been suspended');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), isVerified: true },
  });

  // Generate tokens
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

  logger.info(`User logged in via OTP: ${user.id}`);

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
    tokens: {
      accessToken,
      refreshToken,
    },
    isNewUser: false,
  };
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const { phoneNumber, firstName, lastName, email, password } = data;

  // Check if user already exists by phone or email
  let existingUser = null;
  
  if (phoneNumber) {
    existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (existingUser) {
      throw new Error('User already exists with this phone number');
    }
  }
  
  if (email) {
    existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }
  }

  // Hash password if provided
  const hashedPassword = password ? await hashPassword(password) : null;

  // Create user
  const user = await prisma.user.create({
    data: {
      phoneNumber: phoneNumber || null,
      firstName,
      lastName,
      email: email || null,
      password: hashedPassword,
      isVerified: true, // Since they verified OTP
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    },
  });

  // Generate tokens
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

  logger.info(`User registered: ${user.id}`);

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
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const { phoneNumber, password } = data;

  const user = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (!user) {
    throw new Error('Invalid phone number or password');
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new Error('Account has been suspended');
  }

  // If password is set, verify it
  if (user.password && password) {
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new Error('Invalid phone number or password');
    }
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
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

  logger.info(`User logged in: ${user.id}`);

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
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function refreshAccessToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    // Verify the refresh token and check if it's not revoked
    const decoded = await verifyRefreshToken(token);
    
    // Rotate the refresh token (revoke old, generate new)
    const { newAccessToken, newRefreshToken } = await rotateRefreshToken(decoded.tokenId, {
      userId: decoded.userId,
      phoneNumber: decoded.phoneNumber,
      role: decoded.role,
    });
    
    logger.info(`Token refreshed for user: ${decoded.userId}`);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    logger.error('Token refresh failed', { error });
    throw new Error('Invalid or expired refresh token');
  }
}

export async function logout(userId: string): Promise<void> {
  // Revoke all refresh tokens for the user
  await revokeAllUserRefreshTokens(userId);
  logger.info(`User logged out: ${userId}`);
}

/**
 * Request OTP for email verification
 */
export async function requestEmailOTP(email: string): Promise<void> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  const otp = await createEmailOTP(email);
  logger.info(`Email OTP requested for ${email}`);

  // Send OTP via email (don't await - let it happen in background)
  // If email fails, the OTP is still in the database and can be retrieved
  sendEmailOTP(email, otp).catch((error) => {
    logger.error(`Failed to send OTP email to ${email}:`, error);
  });
}

export interface EmailOTPVerifyResponse {
  user: {
    id: string;
    phoneNumber: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    role: UserRole;
    isVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  isNewUser: boolean;
}

/**
 * Verify email OTP and login/register user
 */
export async function verifyEmailOTPAndLogin(email: string, code: string): Promise<EmailOTPVerifyResponse | null> {
  // First verify the OTP
  const isValid = await verifyEmailOTP(email, code);
  if (!isValid) {
    return null;
  }

  // Find the user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // User doesn't exist - they need to register
    // Return a temporary verification token for registration
    const tempToken = generateToken({
      userId: 'pending',
      phoneNumber: email, // Use email as identifier for pending users
      role: UserRole.CUSTOMER,
    });
    
    return {
      user: {
        id: '',
        phoneNumber: null,
        firstName: '',
        lastName: '',
        email,
        role: UserRole.CUSTOMER,
        isVerified: true,
      },
      tokens: {
        accessToken: tempToken,
        refreshToken: '',
      },
      isNewUser: true,
    };
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new Error('Account has been suspended');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), isVerified: true },
  });

  // Generate tokens
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

  logger.info(`User logged in via email OTP: ${user.id}`);

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
    tokens: {
      accessToken,
      refreshToken,
    },
    isNewUser: false,
  };
}

export interface CompleteRegistrationData {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  region?: string;
  role?: UserRole;
}

export interface CompleteRegistrationResponse {
  user: {
    id: string;
    phoneNumber: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    role: UserRole;
    isVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  isNewUser: boolean;
}

/**
 * Complete registration for a new user after email OTP verification
 * This creates the user record and returns valid tokens
 */
export async function completeRegistration(data: CompleteRegistrationData): Promise<CompleteRegistrationResponse> {
  const { email, firstName, lastName, phoneNumber, latitude, longitude, address, city, region, role = UserRole.CUSTOMER } = data;

  // Check if user already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // User already registered, just return their tokens
    const accessToken = generateToken({
      userId: existingUser.id,
      phoneNumber: existingUser.phoneNumber,
      role: existingUser.role,
    });

    const refreshToken = await generateRefreshToken({
      userId: existingUser.id,
      phoneNumber: existingUser.phoneNumber,
      role: existingUser.role,
    });

    logger.info(`Existing user completed registration flow: ${existingUser.id}`);

    return {
      user: {
        id: existingUser.id,
        phoneNumber: existingUser.phoneNumber,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        email: existingUser.email,
        role: existingUser.role,
        isVerified: existingUser.isVerified,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
      isNewUser: false,
    };
  }

  // Create new user
  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      phoneNumber: phoneNumber || null,
      latitude: latitude || null,
      longitude: longitude || null,
      address: address || null,
      city: city || null,
      region: region || null,
      role,
      isVerified: true,
      status: UserStatus.ACTIVE,
    },
  });

  // Generate tokens
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

  logger.info(`New user completed registration: ${user.id}`);

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
    tokens: {
      accessToken,
      refreshToken,
    },
    isNewUser: true,
  };
}

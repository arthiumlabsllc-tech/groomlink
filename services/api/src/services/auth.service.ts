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

  // Check if email is banned
  if (email) {
    const bannedEmail = await prisma.bannedEmail.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (bannedEmail) {
      throw new Error('This email address has been blocked from registration');
    }
  }

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

  // Require password for login - direct passwordless login is not allowed
  // Users must authenticate via OTP (phone or email) instead
  if (!password) {
    throw new Error('Password is required. Please use OTP login instead.');
  }

  // If user has no password set, they must use OTP login
  if (!user.password) {
    throw new Error('No password set for this account. Please use OTP login instead.');
  }

  // Verify the provided password
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('Invalid phone number or password');
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
  // Normalize email to prevent case-sensitivity mismatches between request/verify
  const normalizedEmail = email.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Invalid email format');
  }

  const otp = await createEmailOTP(normalizedEmail);
  logger.info(`Email OTP requested for ${normalizedEmail}`);

  // Send OTP via email (don't await - let it happen in background)
  // If email fails, the OTP is still in the database and can be retrieved
  sendEmailOTP(normalizedEmail, otp).catch((error) => {
    logger.error(`Failed to send OTP email to ${normalizedEmail}:`, error);
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
 * Custom error class for role mismatch
 */
export class RoleMismatchError extends Error {
  public readonly code: string = 'ROLE_MISMATCH';
  public readonly existingRole: UserRole;
  public readonly requestedRole: UserRole;

  constructor(existingRole: UserRole, requestedRole: UserRole) {
    const isAdminRole = ['ADMIN', 'SUPPORT', 'SUPER_ADMIN'].includes(existingRole);
    
    if (isAdminRole) {
      super('This email is registered as an admin account. Please use the admin portal to log in.');
    } else if (existingRole === UserRole.CUSTOMER && requestedRole === UserRole.SALON_OWNER) {
      super('This email is registered as a customer. Please use a different email or log in at my.groomlinkgh.com');
    } else if (existingRole === UserRole.SALON_OWNER && requestedRole === UserRole.CUSTOMER) {
      super('This email is registered as a salon partner. Please use a different email or log in at partners.groomlinkgh.com');
    } else {
      super(`This email is already registered with a different role (${existingRole}). Please use a different email.`);
    }
    
    this.name = 'RoleMismatchError';
    this.existingRole = existingRole;
    this.requestedRole = requestedRole;
  }
}

/**
 * Check if a role is an admin-type role (ADMIN, SUPPORT, SUPER_ADMIN)
 */
function isAdminRole(role: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.SUPPORT, UserRole.SUPER_ADMIN].includes(role as any);
}

/**
 * Verify email OTP and login/register user
 * @param email - User's email address
 * @param code - OTP code
 * @param requestedRole - Optional role to assign to new users (defaults to CUSTOMER)
 */
export async function verifyEmailOTPAndLogin(email: string, code: string, requestedRole?: UserRole): Promise<EmailOTPVerifyResponse | null> {
  // Normalize email to match what was stored during OTP request
  const normalizedEmail = email.trim().toLowerCase();

  // First verify the OTP
  const isValid = await verifyEmailOTP(normalizedEmail, code);
  if (!isValid) {
    return null;
  }

  // Find the user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Determine the role for new users - use requested role or default to CUSTOMER
  const newUserRole = requestedRole || UserRole.CUSTOMER;

  if (!user) {
    // User doesn't exist - they need to register
    // Return a temporary verification token for registration with the requested role
    const tempToken = generateToken({
      userId: 'pending',
      phoneNumber: normalizedEmail, // Use email as identifier for pending users
      role: newUserRole,
    });
    
    return {
      user: {
        id: '',
        phoneNumber: null,
        firstName: '',
        lastName: '',
        email: normalizedEmail,
        role: newUserRole,
        isVerified: true,
      },
      tokens: {
        accessToken: tempToken,
        refreshToken: '',
      },
      isNewUser: true,
    };
  }

  // Check for role mismatch when a specific role was requested
  // Admin roles (ADMIN, SUPPORT, SUPER_ADMIN) are exempt from this check
  if (requestedRole && !isAdminRole(user.role) && user.role !== requestedRole) {
    throw new RoleMismatchError(user.role, requestedRole);
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
  const { email: rawEmail, firstName, lastName, phoneNumber, latitude, longitude, address, city, region, role = UserRole.CUSTOMER } = data;
  // Normalize email to match OTP storage and prevent duplicate accounts from case differences
  const email = rawEmail.trim().toLowerCase();

  // Check if email is banned
  const bannedEmail = await prisma.bannedEmail.findUnique({
    where: { email },
  });
  if (bannedEmail) {
    throw new Error('This email address has been blocked from registration');
  }

  // Check if user already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // Check for role mismatch - admin roles are exempt
    if (!isAdminRole(existingUser.role) && existingUser.role !== role) {
      throw new RoleMismatchError(existingUser.role, role);
    }
    
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

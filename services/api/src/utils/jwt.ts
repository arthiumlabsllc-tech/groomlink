import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import redis from '../config/redis';
import { TokenPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN: jwt.SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days in seconds

// Pending admin 2FA tokens use a derived signing key so they can NEVER be
// used as access tokens by authenticateToken (which verifies with JWT_SECRET).
const ADMIN_2FA_PENDING_SECRET = crypto
  .createHash('sha256')
  .update(`${JWT_SECRET}:admin-2fa-pending`)
  .digest();

// Token rotation: Store refresh token metadata in Redis
interface RefreshTokenData {
  userId: string;
  tokenFamily: string;
  createdAt: number;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function generateRefreshToken(payload: TokenPayload): Promise<string> {
  const tokenId = uuidv4();
  const tokenFamily = uuidv4();
  
  const refreshToken = jwt.sign(
    { ...payload, tokenId, tokenFamily },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  
  // Store refresh token metadata in Redis for rotation tracking
  const tokenData: RefreshTokenData = {
    userId: payload.userId,
    tokenFamily,
    createdAt: Date.now(),
  };
  
  await redis.setex(
    `refresh_token:${tokenId}`,
    REFRESH_TOKEN_EXPIRES_IN,
    JSON.stringify(tokenData)
  );
  
  // Track all refresh tokens for a user
  await redis.sadd(`user_refresh_tokens:${payload.userId}`, tokenId);
  await redis.expire(`user_refresh_tokens:${payload.userId}`, REFRESH_TOKEN_EXPIRES_IN);
  
  return refreshToken;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload & { tokenId: string; tokenFamily: string }> {
  const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & { tokenId: string; tokenFamily: string };
  
  // Check if token exists in Redis (not revoked)
  const tokenData = await redis.get(`refresh_token:${decoded.tokenId}`);
  if (!tokenData) {
    throw new Error('Refresh token has been revoked');
  }
  
  return decoded;
}

export async function rotateRefreshToken(
  oldTokenId: string,
  payload: TokenPayload
): Promise<{ newRefreshToken: string; newAccessToken: string }> {
  // Revoke old token
  await revokeRefreshToken(oldTokenId);
  
  // Generate new tokens
  const newAccessToken = generateToken(payload);
  const newRefreshToken = await generateRefreshToken(payload);
  
  return { newRefreshToken, newAccessToken };
}

export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await redis.del(`refresh_token:${tokenId}`);
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  const tokenIds = await redis.smembers(`user_refresh_tokens:${userId}`);
  
  const pipeline = redis.pipeline();
  tokenIds.forEach((tokenId) => {
    pipeline.del(`refresh_token:${tokenId}`);
  });
  pipeline.del(`user_refresh_tokens:${userId}`);
  
  await pipeline.exec();
}

/**
 * Short-lived token issued after a correct admin email+password login, used
 * only to complete the TOTP 2FA step. Signed with a derived key, so it is
 * rejected by authenticateToken and cannot be used as an access token.
 */
export function generateAdmin2faPendingToken(userId: string): string {
  return jwt.sign({ userId, purpose: 'admin-2fa' }, ADMIN_2FA_PENDING_SECRET, {
    expiresIn: '5m',
  });
}

export function verifyAdmin2faPendingToken(token: string): { userId: string } {
  const decoded = jwt.verify(token, ADMIN_2FA_PENDING_SECRET) as { userId?: string; purpose?: string };
  if (decoded.purpose !== 'admin-2fa' || !decoded.userId) {
    throw new Error('Invalid 2FA pending token');
  }
  return { userId: decoded.userId };
}

import rateLimit from 'express-rate-limit';
import logger from '../config/logger';
import { recordSecurityEvent } from '../services/security-alert.service';

// Login brute force protection - 5 attempts per 15 minutes
export const loginBruteForceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts max
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many login attempts. Please try again in 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Brute force detected from IP: ${req.ip}`);
    recordSecurityEvent({
      eventType: 'BRUTE_FORCE_DETECTED',
      severity: 'HIGH',
      source: 'auth',
      message: `Multiple failed login attempts from ${req.ip}`,
      req,
    }).catch(() => undefined);
    
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
        message: 'Too many login attempts. Please try again in 15 minutes.',
      },
    });
  },
  keyGenerator: (req) => {
    // Rate limit by IP + email combination
    const email = req.body?.email || '';
    return `${req.ip}:${email}`;
  },
});

// Support login - even stricter (3 attempts per 30 minutes)
export const supportLoginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3, // 3 attempts max
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_SUPPORT_LOGIN_ATTEMPTS',
      message: 'Too many support login attempts. Please contact administrator.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Support brute force detected from IP: ${req.ip}`);
    recordSecurityEvent({
      eventType: 'SUPPORT_BRUTE_FORCE_DETECTED',
      severity: 'CRITICAL',
      source: 'support-auth',
      message: `Multiple failed support login attempts from ${req.ip}`,
      req,
    }).catch(() => undefined);
    
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_SUPPORT_LOGIN_ATTEMPTS',
        message: 'Too many support login attempts. Please contact administrator.',
      },
    });
  },
  keyGenerator: (req) => {
    const email = req.body?.email || '';
    return `${req.ip}:support:${email}`;
  },
});

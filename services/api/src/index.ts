import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';

import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import logger from './config/logger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeSocket } from './config/socket';
import { maintenanceCheck } from './middleware/maintenance';
import { securityProbe } from './middleware/securityProbe';
import { recordSecurityEvent } from './services/security-alert.service';
import { initScheduler } from './jobs/scheduler';
import { loginBruteForceLimiter, supportLoginLimiter } from './middleware/brute-force.middleware';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Security middleware - Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", 'https://groomlinkgh.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false, // Allow embedding resources
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:3000',
  'https://groomlinkgh.com',
  'https://www.groomlinkgh.com',
  'https://dash.groomlinkgh.com',
  'https://partners.groomlinkgh.com',
  'https://support.groomlinkgh.com',
  'https://my.groomlinkgh.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression({
  level: 6,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    // Fire a security event (deduped inside the service to avoid flooding).
    recordSecurityEvent({
      eventType: 'RATE_LIMIT_HIT',
      severity: 'LOW',
      source: 'rate-limit',
      message: `Global rate limit exceeded from ${req.ip}`,
      req,
    }).catch(() => undefined);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
      },
    });
  },
});
app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Increased from 5 to 20 for testing
  message: 'Too many authentication attempts, please try again later.',
  handler: (req, res) => {
    recordSecurityEvent({
      eventType: 'AUTH_RATE_LIMIT_HIT',
      severity: 'MEDIUM',
      source: 'rate-limit',
      message: `Auth rate limit exceeded from ${req.ip}`,
      req,
    }).catch(() => undefined);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.',
      },
    });
  },
});
app.use('/api/auth/otp', authLimiter);
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Suspicious-request detector (runs after body parsing so it can inspect JSON bodies)
app.use(securityProbe);

// Logging
app.use(morgan('dev', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Maintenance mode check (after cors/helmet, before routes)
app.use(maintenanceCheck);

// Serve static files for uploaded avatars and email assets (BEFORE routes to bypass auth)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Also serve uploads under /api path for email template compatibility
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes (MUST come after static file serving)
app.use('/api', routes);

// Return 404 for any upload files that don't exist (prevent fall-through to auth routes)
app.use('/api/uploads', (_req, res) => {
  res.status(404).json({ success: false, message: 'File not found' });
});
app.use('/uploads', (_req, res) => {
  res.status(404).json({ success: false, message: 'File not found' });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Initialize Socket.io
    initializeSocket(server);

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/health`);
      logger.info(`🔌 WebSocket server ready`);

      // Initialize background job scheduler
      initScheduler();
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

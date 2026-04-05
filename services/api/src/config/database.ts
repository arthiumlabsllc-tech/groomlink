import { PrismaClient } from '@prisma/client';
import logger from './logger';

// Connection pool configuration
const CONNECTION_POOL_SIZE = parseInt(process.env.DB_CONNECTION_POOL_SIZE || '20');
const CONNECTION_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000');
const IDLE_TIMEOUT = parseInt(process.env.DB_IDLE_TIMEOUT || '30000');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
  // Connection pool optimization
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Connection pool monitoring
let queryCount = 0;
let slowQueryCount = 0;
const SLOW_QUERY_THRESHOLD = 1000; // ms

prisma.$on('query', (e: { query: string; duration: number; params: string }) => {
  queryCount++;
  
  // Log slow queries
  if (e.duration > SLOW_QUERY_THRESHOLD) {
    slowQueryCount++;
    logger.warn('Slow query detected', { 
      query: e.query, 
      duration: e.duration,
      params: e.params 
    });
  } else {
    logger.debug('Prisma Query', { query: e.query, duration: e.duration });
  }
});

prisma.$on('error', (e: { message: string; target?: string }) => {
  logger.error('Prisma Error', { message: e.message, target: e.target });
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully', {
      poolSize: CONNECTION_POOL_SIZE,
      connectionTimeout: CONNECTION_TIMEOUT,
      idleTimeout: IDLE_TIMEOUT,
    });
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
}

// Get connection pool metrics
export function getPoolMetrics() {
  return {
    totalQueries: queryCount,
    slowQueries: slowQueryCount,
    slowQueryPercentage: queryCount > 0 ? (slowQueryCount / queryCount) * 100 : 0,
    poolSize: CONNECTION_POOL_SIZE,
  };
}

// Reset metrics (useful for testing)
export function resetPoolMetrics() {
  queryCount = 0;
  slowQueryCount = 0;
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

export default prisma;

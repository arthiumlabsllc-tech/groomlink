import Redis from 'ioredis';
import logger from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis error', { error: error.message });
});

redis.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.ping();
    logger.info('Redis connection verified');
  } catch (error) {
    logger.error('Redis connection failed', { error });
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis disconnected');
}

export default redis;

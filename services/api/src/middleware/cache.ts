import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';
import logger from '../config/logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string | ((req: Request) => string);
  tags?: string[];
}

// Generate cache key from request
function generateCacheKey(req: Request): string {
  const path = req.originalUrl || req.url;
  const method = req.method;
  const userId = (req as any).user?.id || 'anonymous';
  return `cache:${method}:${path}:user:${userId}`;
}

// Cache middleware factory
export function cache(options: CacheOptions = {}) {
  const ttl = options.ttl || 300; // Default 5 minutes

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    const cacheKey = typeof options.key === 'function' 
      ? options.key(req) 
      : options.key || generateCacheKey(req);

    try {
      // Try to get cached response
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        logger.debug(`Cache hit: ${cacheKey}`);
        res.set('X-Cache', 'HIT');
        res.json(parsed);
        return;
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = (body: unknown): Response => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(cacheKey, ttl, JSON.stringify(body))
            .then(() => {
              // Add cache tags if specified
              if (options.tags) {
                options.tags.forEach(tag => {
                  redis.sadd(`cache:tag:${tag}`, cacheKey);
                });
              }
            })
            .catch(err => logger.error('Cache set error', { error: err }));
        }
        
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error });
      next();
    }
  };
}

// Invalidate cache by pattern
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(`cache:*${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error('Cache invalidation error', { error, pattern });
  }
}

// Invalidate cache by tag
export async function invalidateCacheByTag(tag: string): Promise<void> {
  try {
    const keys = await redis.smembers(`cache:tag:${tag}`);
    if (keys.length > 0) {
      const pipeline = redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      pipeline.del(`cache:tag:${tag}`);
      await pipeline.exec();
      logger.info(`Invalidated ${keys.length} cache entries for tag: ${tag}`);
    }
  } catch (error) {
    logger.error('Cache tag invalidation error', { error, tag });
  }
}

// Clear all cache
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await redis.keys('cache:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Cleared ${keys.length} cache entries`);
    }
  } catch (error) {
    logger.error('Cache clear error', { error });
  }
}

// Cache statistics
export async function getCacheStats(): Promise<{ totalKeys: number; memoryUsage: number }> {
  try {
    const keys = await redis.keys('cache:*');
    const info = await redis.info('memory');
    const usedMemory = info.match(/used_memory:(\d+)/);
    
    return {
      totalKeys: keys.length,
      memoryUsage: usedMemory ? parseInt(usedMemory[1], 10) : 0,
    };
  } catch (error) {
    logger.error('Cache stats error', { error });
    return { totalKeys: 0, memoryUsage: 0 };
  }
}

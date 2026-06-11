// filename: backend/src/middleware/rateLimiter.js
import { getRedisClient } from '../config/database.js';

export function createRateLimiter(maxRequests = 100, windowSeconds = 60) {
  return async function rateLimiter(req, res, next) {
    const routeKey = req.path.replace(/\/[0-9a-f-]{36}/gi, '/:id');
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `ratelimit:${ip}:${routeKey}`;

    try {
      const redis = await getRedisClient();
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        const ttl = await redis.ttl(key);
        res.setHeader('Retry-After', ttl > 0 ? ttl : windowSeconds);
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        });
      }

      next();
    } catch (err) {
      console.error('[RateLimiter] Redis error, failing open:', err.message);
      next();
    }
  };
}

export const generalLimiter = createRateLimiter(100, 60);
export const strictLimiter = createRateLimiter(5, 60);

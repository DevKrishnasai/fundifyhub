import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import config from './config';
import logger from './logger';
import { RATE_LIMIT_CONFIG, RATE_LIMIT_PREFIX } from '@fundifyhub/types';

/**
 * Rate Limiting Middleware for FundifyHub
 * 
 * Industry-standard rate limiting using Redis sliding window algorithm.
 * Supports:
 * - Per-IP rate limiting
 * - Per-user rate limiting (when authenticated)
 * - Per-endpoint rate limiting
 * - Configurable limits and windows
 */

// Re-export for convenience
export { RATE_LIMIT_CONFIG };

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

// Redis client for rate limiting
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on('error', (err: Error) => {
      logger.error('[RateLimit] Redis error:', err);
    });
  }
  return redisClient;
}

/**
 * Get client identifier for rate limiting
 * Uses user ID if authenticated, otherwise IP address
 */
function getClientIdentifier(req: Request): string {
  // Use user ID if authenticated
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // Fall back to IP address
  const ip = req.ip || 
             req.headers['x-forwarded-for']?.toString().split(',')[0] || 
             req.socket.remoteAddress || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Sliding window rate limiter using Redis
 */
async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  total: number;
}> {
  const redis = getRedisClient();
  const key = `${RATE_LIMIT_PREFIX}${endpoint}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Ensure connection
    if (redis.status !== 'ready') {
      await redis.connect();
    }

    // Use Redis transaction for atomic operations
    const pipeline = redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);
    
    // Set expiry on the key
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));

    const results = await pipeline.exec();
    
    if (!results) {
      // If pipeline fails, allow the request (fail open)
      return { allowed: true, remaining: config.maxRequests, resetTime: 0, total: config.maxRequests };
    }

    const currentCount = (results[1]?.[1] as number) || 0;
    const remaining = Math.max(0, config.maxRequests - currentCount - 1);
    const resetTime = now + config.windowMs;

    return {
      allowed: currentCount < config.maxRequests,
      remaining,
      resetTime,
      total: config.maxRequests,
    };
  } catch (err) {
    logger.error('[RateLimit] Error checking rate limit:', err as Error);
    // Fail open - allow request if Redis is unavailable
    return { allowed: true, remaining: config.maxRequests, resetTime: 0, total: config.maxRequests };
  }
}

/**
 * Create rate limiting middleware with configurable limits
 */
export function createRateLimiter(
  limitConfig: RateLimitConfig = RATE_LIMIT_CONFIG.GENERAL,
  endpointName?: string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identifier = getClientIdentifier(req);
    const endpoint = endpointName || req.path;

    try {
      const result = await checkRateLimit(identifier, endpoint, limitConfig);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', result.total);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter);
        
        logger.warn(`[RateLimit] Rate limit exceeded for ${identifier} on ${endpoint}`);
        
        res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again later.',
          retryAfter,
        });
        return;
      }

      next();
    } catch (err) {
      logger.error('[RateLimit] Middleware error:', err as Error);
      // Fail open - allow request on error
      next();
    }
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  /** General API rate limiter - 100 requests/minute */
  general: createRateLimiter(RATE_LIMIT_CONFIG.GENERAL, 'general'),
  
  /** Authentication rate limiter - 10 attempts/15 minutes */
  auth: createRateLimiter(RATE_LIMIT_CONFIG.AUTH, 'auth'),
  
  /** OTP rate limiter - 3 requests/minute */
  otp: createRateLimiter(RATE_LIMIT_CONFIG.OTP, 'otp'),
  
  /** File upload rate limiter - 10 uploads/minute */
  upload: createRateLimiter(RATE_LIMIT_CONFIG.UPLOAD, 'upload'),
  
  /** Payment rate limiter - 20 requests/minute */
  payment: createRateLimiter(RATE_LIMIT_CONFIG.PAYMENT, 'payment'),
  
  /** Admin rate limiter - 200 requests/minute */
  admin: createRateLimiter(RATE_LIMIT_CONFIG.ADMIN, 'admin'),
};

/**
 * Apply rate limiting to specific routes
 */
export function applyRateLimiting(req: Request, res: Response, next: NextFunction): void {
  const path = req.path.toLowerCase();
  
  // Determine which rate limiter to use based on path
  if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
    rateLimiters.auth(req, res, next);
  } else if (path.includes('/otp') || path.includes('/verify') || path.includes('/send-otp')) {
    rateLimiters.otp(req, res, next);
  } else if (path.includes('/upload') || path.includes('/uploadthing')) {
    rateLimiters.upload(req, res, next);
  } else if (path.includes('/payment') || path.includes('/razorpay')) {
    rateLimiters.payment(req, res, next);
  } else if (path.includes('/admin/')) {
    rateLimiters.admin(req, res, next);
  } else {
    rateLimiters.general(req, res, next);
  }
}

export default rateLimiters;

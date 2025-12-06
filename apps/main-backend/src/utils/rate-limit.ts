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

type LimitResult = {
  ok: boolean;
  reason?: 'minute' | 'hour';
};

type AttemptsResult = {
  ok: boolean;
  count?: number;
  retryAfterMs?: number;
};

// Redis client for rate limiting
let redisClient: Redis | null = null;

// Fallback map used when Redis is unavailable
const localLimiterMap = new Map<string, { windowStart: number; count: number }>();

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

// Extract numeric values safely from Redis eval arrays
function getNumberFromResult(result: unknown, index: number, defaultValue = 0): number {
  if (Array.isArray(result) && typeof result[index] !== 'undefined') {
    return Number(result[index]);
  }
  return defaultValue;
}

// Lua script for OTP send sliding window (minute + hour)
const SLIDING_WINDOW_LUA = `
local minuteKey = KEYS[1]
local hourKey = KEYS[2]
local now = tonumber(ARGV[1])
local minuteWindow = tonumber(ARGV[2])
local hourWindow = tonumber(ARGV[3])
local expireSeconds = tonumber(ARGV[4])
local member = ARGV[5]

redis.call('ZADD', minuteKey, now, member)
redis.call('ZREMRANGEBYSCORE', minuteKey, 0, now - minuteWindow)
local minuteCount = redis.call('ZCARD', minuteKey)
redis.call('EXPIRE', minuteKey, expireSeconds)

redis.call('ZADD', hourKey, now, member)
redis.call('ZREMRANGEBYSCORE', hourKey, 0, now - hourWindow)
local hourCount = redis.call('ZCARD', hourKey)
redis.call('EXPIRE', hourKey, expireSeconds)

return {minuteCount, hourCount}
`;

// Lua script for attempts tracking (single window, returns count + oldest timestamp)
const ATTEMPT_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local expireSeconds = tonumber(ARGV[3])
local member = ARGV[4]
local limit = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

local items = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local minScore = now
if items and #items >= 2 then
  minScore = tonumber(items[2])
end

if count >= limit then
  redis.call('EXPIRE', key, expireSeconds)
  return {count, minScore, 0}
else
  redis.call('ZADD', key, now, member)
  redis.call('EXPIRE', key, expireSeconds)
  local newCount = redis.call('ZCARD', key)
  local items2 = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local minScore2 = now
  if items2 and #items2 >= 2 then
    minScore2 = tonumber(items2[2])
  end
  return {newCount, minScore2, 1}
end
`;

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
 * OTP send sliding-window limiter (minute + hour). Returns false when limits exceeded.
 */
export async function checkAndIncrementOtpRate(identifier: string): Promise<LimitResult> {
  const minuteKey = `otp:rl:${identifier}:m.z`;
  const hourKey = `otp:rl:${identifier}:h.z`;
  const now = Date.now();
  const minuteWindowMs = 60 * 1000;
  const hourWindowMs = 60 * 60 * 1000;
  const expireSeconds = 60 * 60 * 2;
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

  try {
    const redis = getRedisClient();
    if (redis.status !== 'ready') {
      await redis.connect();
    }

    const result = await redis.eval(
      SLIDING_WINDOW_LUA,
      2,
      minuteKey,
      hourKey,
      now,
      minuteWindowMs,
      hourWindowMs,
      expireSeconds,
      member
    );

    const minuteCount = getNumberFromResult(result, 0);
    const hourCount = getNumberFromResult(result, 1);

    if (minuteCount > 3) return { ok: false, reason: 'minute' };
    if (hourCount > 10) return { ok: false, reason: 'hour' };
    return { ok: true };
  } catch (err) {
    logger.warn(`[RateLimit] Redis OTP limiter failed for ${identifier}: ${String(err)}`);

    const entry = localLimiterMap.get(identifier) || { windowStart: now, count: 0 };
    if (now - entry.windowStart > hourWindowMs) {
      entry.windowStart = now;
      entry.count = 0;
    }

    if (entry.count >= 10) return { ok: false, reason: 'hour' };
    entry.count += 1;
    localLimiterMap.set(identifier, entry);
    return { ok: true };
  }
}

/**
 * OTP attempts limiter (single window). Returns retryAfter when exceeded.
 */
export async function checkAndIncrementAttempts(
  identifier: string,
  limit = Number(config.otp.attemptsLimit),
  windowMs = Number(config.otp.attemptsWindowMs)
): Promise<AttemptsResult> {
  const key = `otp:attempts:${identifier}:z`;
  const now = Date.now();
  const expireSeconds = Math.ceil(windowMs / 1000) + 60;
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

  try {
    const redis = getRedisClient();
    if (redis.status !== 'ready') {
      await redis.connect();
    }

    const result = await redis.eval(
      ATTEMPT_WINDOW_LUA,
      1,
      key,
      now,
      windowMs,
      expireSeconds,
      member,
      String(limit)
    );

    const count = getNumberFromResult(result, 0);
    const minScore = getNumberFromResult(result, 1, now);
    if (count >= limit) {
      const retryAfterMs = Math.max(0, windowMs - (now - minScore));
      return { ok: false, count, retryAfterMs };
    }
    return { ok: true, count };
  } catch (err) {
    logger.warn(`[RateLimit] Redis attempts limiter failed for ${identifier}, using in-memory fallback: ${String(err)}`);

    const fallbackKey = `attempts:${identifier}`;
    const entry = localLimiterMap.get(fallbackKey) || { windowStart: now, count: 0 };
    if (now - entry.windowStart > windowMs) {
      entry.windowStart = now;
      entry.count = 0;
    }

    if (entry.count >= limit) {
      const retryAfterMs = Math.max(0, windowMs - (now - entry.windowStart));
      return { ok: false, count: entry.count, retryAfterMs };
    }

    entry.count += 1;
    localLimiterMap.set(fallbackKey, entry);
    return { ok: true, count: entry.count };
  }
}

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

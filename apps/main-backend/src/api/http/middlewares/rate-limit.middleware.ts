/**
 * Rate Limiting Middleware
 *
 * Prevents abuse by limiting the number of requests per IP address.
 *
 * @module api/http/middlewares/rate-limit
 */

import type { Request, Response, NextFunction } from 'express';

const rateLimiters = {
  default: {
    points: 1000, // 100 requests
    duration: 60, // per minute
  },
  auth: {
    points: 50, // 5 requests
    duration: 60 * 15, // per 15 minutes
  },
};

type RateLimiterType = keyof typeof rateLimiters;

export function rateLimit(type: RateLimiterType = 'default') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: (agent) Implement rate limiting logic using a library like `rate-limiter-flexible`
      // const limiter = rateLimiters[type];
      // await limiter.consume(req.ip);
      next();
    } catch (err) {
      res.status(429).json({
        success: false,
        message: 'Too many requests',
        code: 'TOO_MANY_REQUESTS',
      });
    }
  };
}

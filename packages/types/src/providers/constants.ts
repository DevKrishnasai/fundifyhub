// ============================================
// CACHE KEY PATTERNS
// ============================================

/**
 * Common cache key prefixes for the application
 */
export const CACHE_KEY_PREFIX = {
  /** User session data */
  SESSION: 'session:',
  /** User profile data */
  USER: 'user:',
  /** Request/loan data */
  REQUEST: 'request:',
  /** API response cache */
  API: 'api:',
  /** Rate limiting */
  RATE_LIMIT: 'ratelimit:',
  /** OTP tokens */
  OTP: 'otp:',
  /** Feature flags */
  FEATURE: 'feature:',
  /** Configuration */
  CONFIG: 'config:',
} as const;

/**
 * Default TTL values in seconds
 */
export const CACHE_TTL = {
  /** 5 minutes - for frequently changing data */
  SHORT: 300,
  /** 1 hour - for semi-static data */
  MEDIUM: 3600,
  /** 24 hours - for static data */
  LONG: 86400,
  /** 7 days - for rarely changing data */
  EXTENDED: 604800,
  /** Session TTL - 24 hours */
  SESSION: 86400,
  /** OTP TTL - 10 minutes */
  OTP: 600,
  /** Rate limit window - 1 minute */
  RATE_LIMIT: 60,
} as const;

// ============================================
// STORAGE CONSTANTS
// ============================================

/**
 * Commonly used signed URL expiry times
 */
export const SIGNED_URL_EXPIRY = {
  /** 15 minutes - for quick document previews */
  SHORT: 900,
  /** 1 hour - for document downloads */
  MEDIUM: 3600,
  /** 24 hours - for sharing links */
  LONG: 86400,
  /** 7 days - for extended access */
  EXTENDED: 604800,
} as const;

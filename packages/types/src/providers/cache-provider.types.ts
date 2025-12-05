/**
 * Cache Provider Framework Types
 * 
 * This module defines the interface contract for all cache providers.
 * Implementations include: RedisCacheProvider, MemoryCacheProvider (future)
 * 
 * @module providers/cache-provider
 */

// ============================================
// CACHE PROVIDER IDENTIFICATION
// ============================================

/**
 * Supported cache provider types
 */
export enum CacheProviderType {
  REDIS = 'REDIS',
  MEMORY = 'MEMORY',     // For development/testing
  NONE = 'NONE',         // No-op cache (disabled)
}

// ============================================
// CACHE OPERATIONS
// ============================================

/**
 * Options for cache set operations
 */
export interface CacheSetOptions {
  /** Time-to-live in seconds */
  ttl?: number;
  /** Only set if key doesn't exist */
  nx?: boolean;
  /** Only set if key exists */
  xx?: boolean;
}

/**
 * Result of cache get operation
 */
export interface CacheGetResult<T = unknown> {
  /** Whether key was found */
  found: boolean;
  /** Value if found */
  value?: T;
  /** Time-to-live remaining in seconds (if available) */
  ttl?: number;
}

/**
 * Result of cache set operation
 */
export interface CacheSetResult {
  /** Whether set was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Result of cache delete operation
 */
export interface CacheDeleteResult {
  /** Whether delete was successful */
  success: boolean;
  /** Number of keys deleted */
  deletedCount: number;
}

/**
 * Result of cache exists check
 */
export interface CacheExistsResult {
  /** Whether key exists */
  exists: boolean;
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Input for batch get operation
 */
export interface CacheBatchGetInput {
  /** Keys to get */
  keys: string[];
}

/**
 * Result of batch get operation
 */
export interface CacheBatchGetResult<T = unknown> {
  /** Map of key to result */
  results: Map<string, CacheGetResult<T>>;
  /** Count of keys found */
  foundCount: number;
  /** Count of keys not found */
  missCount: number;
}

/**
 * Input for batch set operation
 */
export interface CacheBatchSetInput<T = unknown> {
  /** Entries to set */
  entries: Array<{
    key: string;
    value: T;
    ttl?: number;
  }>;
}

/**
 * Result of batch set operation
 */
export interface CacheBatchSetResult {
  /** Whether all sets were successful */
  success: boolean;
  /** Count of successful sets */
  successCount: number;
  /** Count of failed sets */
  failedCount: number;
  /** Failed keys with errors */
  errors?: Array<{ key: string; error: string }>;
}

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
// CACHE PROVIDER INTERFACE
// ============================================

/**
 * Cache Provider Interface
 * 
 * All cache providers must implement this interface.
 * This enables switching between providers (Redis, Memory, etc.)
 * without changing business logic.
 */
export interface ICacheProvider {
  /** Provider type identifier */
  readonly type: CacheProviderType;
  
  /** Provider display name */
  readonly name: string;
  
  /** Whether provider is configured and ready */
  isConfigured(): boolean;

  /**
   * Connect to the cache backend
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the cache backend
   */
  disconnect(): Promise<void>;

  /**
   * Check if connection is healthy
   */
  isHealthy(): Promise<boolean>;

  // ============================================
  // BASIC OPERATIONS
  // ============================================

  /**
   * Get a value from cache
   */
  get<T = unknown>(key: string): Promise<CacheGetResult<T>>;

  /**
   * Set a value in cache
   */
  set<T = unknown>(
    key: string, 
    value: T, 
    options?: CacheSetOptions
  ): Promise<CacheSetResult>;

  /**
   * Delete a key from cache
   */
  delete(key: string): Promise<CacheDeleteResult>;

  /**
   * Check if a key exists
   */
  exists(key: string): Promise<CacheExistsResult>;

  /**
   * Get remaining TTL for a key (in seconds)
   */
  ttl(key: string): Promise<number>;

  /**
   * Set/update TTL for an existing key
   */
  expire(key: string, ttlSeconds: number): Promise<boolean>;

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Get multiple values at once
   */
  mget<T = unknown>(keys: string[]): Promise<CacheBatchGetResult<T>>;

  /**
   * Set multiple values at once
   */
  mset<T = unknown>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<CacheBatchSetResult>;

  /**
   * Delete multiple keys at once
   */
  mdelete(keys: string[]): Promise<CacheDeleteResult>;

  // ============================================
  // PATTERN OPERATIONS
  // ============================================

  /**
   * Delete all keys matching a pattern
   * Use with caution - can be slow on large datasets
   */
  deletePattern(pattern: string): Promise<CacheDeleteResult>;

  /**
   * Get all keys matching a pattern
   * Use with caution - can be slow on large datasets
   */
  keys(pattern: string): Promise<string[]>;

  // ============================================
  // ATOMIC OPERATIONS
  // ============================================

  /**
   * Increment a numeric value
   */
  incr(key: string, by?: number): Promise<number>;

  /**
   * Decrement a numeric value
   */
  decr(key: string, by?: number): Promise<number>;

  // ============================================
  // UTILITY OPERATIONS
  // ============================================

  /**
   * Clear all cache entries (use with extreme caution)
   */
  clear(): Promise<void>;

  /**
   * Get cache stats (if available)
   */
  stats?(): Promise<CacheStats>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of keys in cache */
  keyCount: number;
  /** Memory usage in bytes (if available) */
  memoryUsage?: number;
  /** Hit rate percentage (if available) */
  hitRate?: number;
  /** Uptime in seconds (if available) */
  uptime?: number;
}

// ============================================
// CACHE SERVICE CONFIGURATION
// ============================================

/**
 * Cache service configuration
 */
export interface CacheServiceConfig {
  /** Default provider to use */
  defaultProvider: CacheProviderType;
  /** Provider-specific configurations */
  providers: {
    redis?: {
      host: string;
      port: number;
      password?: string;
      db?: number;
      keyPrefix?: string;
      /** Connection timeout in ms */
      connectTimeout?: number;
      /** Max retries on connection failure */
      maxRetries?: number;
    };
    memory?: {
      /** Max items to store */
      maxItems?: number;
      /** Check interval for expired items (ms) */
      checkPeriod?: number;
    };
  };
  /** Default TTL for all cache entries (seconds) */
  defaultTtl?: number;
}

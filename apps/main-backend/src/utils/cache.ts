import Redis from 'ioredis';
import config from './config';
import logger from './logger';

/**
 * Redis Cache Client for FundifyHub
 * 
 * Provides a centralized caching layer with:
 * - Automatic JSON serialization/deserialization
 * - TTL (Time To Live) support
 * - Cache key prefixing for namespace isolation
 * - Cache invalidation helpers
 */

const CACHE_PREFIX = 'fundifyhub:cache:';

// Default TTL values (in seconds)
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute - for rapidly changing data
  MEDIUM: 300,         // 5 minutes - for dashboard stats
  LONG: 3600,          // 1 hour - for reference data
  VERY_LONG: 86400,    // 24 hours - for rarely changing data
} as const;

// Cache key patterns
export const CACHE_KEYS = {
  // Dashboard stats
  DASHBOARD_STATS: (userId: string, role: string) => `dashboard:stats:${role}:${userId}`,
  ADMIN_STATS: () => 'admin:stats',
  
  // User data
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_NOTIFICATIONS: (userId: string) => `user:notifications:${userId}`,
  
  // Request data
  REQUEST_DETAIL: (requestId: string) => `request:detail:${requestId}`,
  REQUEST_LIST: (userId: string, page: number) => `request:list:${userId}:${page}`,
  
  // Loan data
  LOAN_DETAIL: (loanId: string) => `loan:detail:${loanId}`,
  LOAN_EMI_SCHEDULE: (loanId: string) => `loan:emi:${loanId}`,
  
  // Reference data
  DISTRICTS: () => 'ref:districts',
  AGENTS_BY_DISTRICT: (district: string) => `ref:agents:${district}`,
  
  // Service configurations
  SERVICE_CONFIG: (serviceName: string) => `service:config:${serviceName}`,
  ALL_SERVICES: () => 'service:all',
} as const;

class CacheClient {
  private redis: Redis;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.error('[Cache] Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info('[Cache] Redis connected');
    });

    this.redis.on('error', (err: Error) => {
      this.isConnected = false;
      logger.error('[Cache] Redis error:', err);
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn('[Cache] Redis connection closed');
    });
  }

  /**
   * Ensure Redis connection is established
   */
  private async ensureConnection(): Promise<boolean> {
    if (this.isConnected) return true;

    if (!this.connectionPromise) {
      this.connectionPromise = this.redis.connect()
        .then(() => {
          this.isConnected = true;
        })
        .catch((err: Error) => {
          logger.error('[Cache] Failed to connect to Redis:', err);
          this.isConnected = false;
        })
        .finally(() => {
          this.connectionPromise = null;
        });
    }

    await this.connectionPromise;
    return this.isConnected;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!await this.ensureConnection()) return null;
      
      const fullKey = CACHE_PREFIX + key;
      const value = await this.redis.get(fullKey);
      
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (err) {
      logger.error(`[Cache] Error getting key ${key}:`, err as Error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    try {
      if (!await this.ensureConnection()) return false;
      
      const fullKey = CACHE_PREFIX + key;
      const serialized = JSON.stringify(value);
      
      await this.redis.setex(fullKey, ttlSeconds, serialized);
      return true;
    } catch (err) {
      logger.error(`[Cache] Error setting key ${key}:`, err as Error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      if (!await this.ensureConnection()) return false;
      
      const fullKey = CACHE_PREFIX + key;
      await this.redis.del(fullKey);
      return true;
    } catch (err) {
      logger.error(`[Cache] Error deleting key ${key}:`, err as Error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      if (!await this.ensureConnection()) return 0;
      
      const fullPattern = CACHE_PREFIX + pattern;
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) return 0;
      
      const deleted = await this.redis.del(...keys);
      return deleted;
    } catch (err) {
      logger.error(`[Cache] Error deleting pattern ${pattern}:`, err as Error);
      return 0;
    }
  }

  /**
   * Get or set pattern - gets from cache or sets from factory function
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttlSeconds: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Invalidate user-related caches
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.delPattern(`*:${userId}:*`);
    await this.del(CACHE_KEYS.USER_PROFILE(userId));
    await this.del(CACHE_KEYS.USER_NOTIFICATIONS(userId));
  }

  /**
   * Invalidate request-related caches
   */
  async invalidateRequest(requestId: string, customerId?: string): Promise<void> {
    await this.del(CACHE_KEYS.REQUEST_DETAIL(requestId));
    if (customerId) {
      await this.delPattern(`request:list:${customerId}:*`);
      await this.delPattern(`dashboard:stats:*:${customerId}`);
    }
    // Also invalidate admin stats
    await this.del(CACHE_KEYS.ADMIN_STATS());
  }

  /**
   * Invalidate loan-related caches
   */
  async invalidateLoan(loanId: string, customerId?: string): Promise<void> {
    await this.del(CACHE_KEYS.LOAN_DETAIL(loanId));
    await this.del(CACHE_KEYS.LOAN_EMI_SCHEDULE(loanId));
    if (customerId) {
      await this.delPattern(`dashboard:stats:*:${customerId}`);
    }
  }

  /**
   * Invalidate service config caches
   */
  async invalidateServiceConfig(serviceName?: string): Promise<void> {
    if (serviceName) {
      await this.del(CACHE_KEYS.SERVICE_CONFIG(serviceName));
    }
    await this.del(CACHE_KEYS.ALL_SERVICES());
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Export singleton instance
export const cache = new CacheClient();

export default cache;

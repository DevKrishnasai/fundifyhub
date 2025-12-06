/**
 * Cache Adapter
 * 
 * Wraps Redis cache provider for application caching needs.
 * Handles session storage, token blacklisting, rate limiting.
 * 
 * @module infra-adapters/cache
 */

import { createRedisCacheProvider, type RedisCacheProviderConfig } from '@fundifyhub/providers';
import { CACHE_TTL } from '@fundifyhub/types';
import logger from '../utils/logger';

/**
 * Cache adapter using Redis provider
 */
export class CacheAdapter {
  private provider: ReturnType<typeof createRedisCacheProvider> | null = null;
  private defaultTtl: number = CACHE_TTL.SHORT; // 1 hour

  constructor(config?: RedisCacheProviderConfig) {
    // If config is provided, use it; otherwise try to create from env
    if (config) {
      this.initializeProvider(config);
    } else {
      this.initializeFromEnv();
    }
  }

  /**
   * Initialize provider from environment variables
   */
  private initializeFromEnv(): void {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger.warn('[CacheAdapter] Redis not configured - cache operations will be no-ops');
      return;
    }

    // Parse Redis URL (redis://host:port or redis://:password@host:port)
    try {
      const url = new URL(redisUrl);
      const config: RedisCacheProviderConfig = {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        db: 0,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'fh:',
        defaultTtl: this.defaultTtl,
        maxRetries: 3,
        connectTimeout: 10000,
      };
      
      this.initializeProvider(config);
    } catch (err) {
      logger.error('[CacheAdapter] Failed to parse REDIS_URL:', { error: err });
    }
  }

  /**
   * Initialize provider with given config
   */
  private initializeProvider(config: RedisCacheProviderConfig): void {
    try {
      this.provider = createRedisCacheProvider(config);
      this.provider.connect().catch((err) => {
        logger.error('[CacheAdapter] Failed to connect to Redis:', err);
        this.provider = null;
      });
      logger.info('[CacheAdapter] Redis provider initialized');
    } catch (err) {
      logger.error('[CacheAdapter] Failed to create Redis provider:', { error: err });
    }
  }

  /**
   * Set cache value
   */
  async set(key: string, value: any, ttl: number = this.defaultTtl): Promise<void> {
    if (!this.provider) return;

    try {
      const result = await this.provider.set(key, value, { ttl });
      if (result.success) {
        logger.debug('[CacheAdapter] Value set:', { key, ttl });
      }
    } catch (err) {
      logger.error('[CacheAdapter] Failed to set value:', { error: err });
      // Don't re-throw - cache is optional
    }
  }

  /**
   * Get cache value
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.provider) return null;

    try {
      const result = await this.provider.get<T>(key);
      return result.found ? result.value! : null;
    } catch (err) {
      logger.error('[CacheAdapter] Failed to get value:', { error: err });
      return null; // Fallback to no cache
    }
  }

  /**
   * Delete cache value
   */
  async delete(key: string): Promise<void> {
    if (!this.provider) return;

    try {
      await this.provider.delete(key);
      logger.debug('[CacheAdapter] Value deleted:', { key });
    } catch (err) {
      logger.error('[CacheAdapter] Failed to delete value:', { error: err });
      // Don't re-throw - cache deletion is optional
    }
  }

  /**
   * Clear all cache values matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.provider) return 0;

    try {
      const result = await this.provider.deletePattern(pattern);
      logger.debug('[CacheAdapter] Pattern cleared:', { pattern, count: result.deletedCount });
      return result.deletedCount;
    } catch (err) {
      logger.error('[CacheAdapter] Failed to clear pattern:', { error: err });
      return 0;
    }
  }

  /**
   * Check if rate limit exceeded
   * Uses Redis INCR for atomic counter
   * 
   * @returns true if limit exceeded, false if within limit
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<boolean> {
    if (!this.provider) return false; // Allow if cache not available

    try {
      const current = await this.provider.incr(key, 1);
      
      // Set TTL only on first increment
      if (current === 1) {
        await this.provider.expire(key, windowSeconds);
      }

      const exceeded = current > limit;
      if (exceeded) {
        logger.warn('[CacheAdapter] Rate limit exceeded:', { key, current, limit });
      }

      return exceeded;
    } catch (err) {
      logger.error('[CacheAdapter] Failed to check rate limit:', { error: err });
      return false; // Fallback: allow
    }
  }

  /**
   * Add token to blacklist (for logout)
   */
  async blacklistToken(token: string, expiresIn: number): Promise<void> {
    if (!this.provider) return;

    try {
      const key = `blacklist:token:${token}`;
      await this.set(key, true, expiresIn);
      logger.debug('[CacheAdapter] Token blacklisted:', { expiresIn });
    } catch (err) {
      logger.error('[CacheAdapter] Failed to blacklist token:', { error: err });
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!this.provider) return false;

    try {
      const key = `blacklist:token:${token}`;
      const exists = await this.provider.exists(key);
      return exists.exists;
    } catch (err) {
      logger.error('[CacheAdapter] Failed to check blacklist:', { error: err });
      return false; // Fallback: allow
    }
  }

  /**
   * Get provider instance for advanced operations
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.provider !== null;
  }
}

export const cacheAdapter = new CacheAdapter();

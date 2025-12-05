/**
 * Redis Cache Provider
 * 
 * Implements ICacheProvider interface using ioredis.
 * Handles caching with Redis backend.
 * 
 * @module providers/cache/redis
 */

import Redis from 'ioredis';
import {
  ICacheProvider,
  CacheProviderType,
  CacheGetResult,
  CacheSetResult,
  CacheSetOptions,
  CacheDeleteResult,
  CacheExistsResult,
  CacheBatchGetResult,
  CacheBatchSetResult,
  CacheStats,
  CACHE_TTL,
} from '@fundifyhub/types';

/**
 * Redis provider configuration
 */
export interface RedisCacheProviderConfig {
  /** Redis host */
  host: string;
  /** Redis port */
  port: number;
  /** Redis password (optional) */
  password?: string;
  /** Redis database number */
  db?: number;
  /** Key prefix for all keys */
  keyPrefix?: string;
  /** Connection timeout in ms */
  connectTimeout?: number;
  /** Max retries on connection failure */
  maxRetries?: number;
  /** Default TTL in seconds */
  defaultTtl?: number;
}

/**
 * Redis Cache Provider Implementation
 */
export class RedisCacheProvider implements ICacheProvider {
  public readonly type = CacheProviderType.REDIS;
  public readonly name = 'Redis';
  
  private readonly config: RedisCacheProviderConfig;
  private client: Redis | null = null;
  private readonly keyPrefix: string;
  private readonly defaultTtl: number;

  constructor(config: RedisCacheProviderConfig) {
    this.config = config;
    this.keyPrefix = config.keyPrefix ?? 'fh:';
    this.defaultTtl = config.defaultTtl ?? CACHE_TTL.MEDIUM;
  }

  /**
   * Get prefixed key
   */
  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.host && this.config.port);
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db ?? 0,
      connectTimeout: this.config.connectTimeout ?? 10000,
      maxRetriesPerRequest: this.config.maxRetries ?? 3,
      retryStrategy: (times: number) => {
        if (times > (this.config.maxRetries ?? 3)) {
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    await this.client.connect();
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = unknown>(key: string): Promise<CacheGetResult<T>> {
    if (!this.client) {
      return { found: false };
    }

    try {
      const prefixedKey = this.getKey(key);
      const [value, ttl] = await Promise.all([
        this.client.get(prefixedKey),
        this.client.ttl(prefixedKey),
      ]);

      if (value === null) {
        return { found: false };
      }

      return {
        found: true,
        value: JSON.parse(value) as T,
        ttl: ttl > 0 ? ttl : undefined,
      };
    } catch {
      return { found: false };
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = unknown>(
    key: string,
    value: T,
    options?: CacheSetOptions
  ): Promise<CacheSetResult> {
    if (!this.client) {
      return { success: false, error: 'Redis not connected' };
    }

    try {
      const prefixedKey = this.getKey(key);
      const serialized = JSON.stringify(value);
      const ttl = options?.ttl ?? this.defaultTtl;

      let result: string | null;
      
      if (options?.nx) {
        // Only set if key does NOT exist
        result = await this.client.set(prefixedKey, serialized, 'EX', ttl, 'NX');
      } else if (options?.xx) {
        // Only set if key DOES exist
        result = await this.client.set(prefixedKey, serialized, 'EX', ttl, 'XX');
      } else {
        // Always set
        result = await this.client.set(prefixedKey, serialized, 'EX', ttl);
      }
      
      // NX/XX return null if condition not met, 'OK' if set
      const success = result === 'OK' || (result === null && (options?.nx === true || options?.xx === true));
      
      return { success };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<CacheDeleteResult> {
    if (!this.client) {
      return { success: false, deletedCount: 0 };
    }

    try {
      const prefixedKey = this.getKey(key);
      const deletedCount = await this.client.del(prefixedKey);
      return { success: true, deletedCount };
    } catch {
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<CacheExistsResult> {
    if (!this.client) {
      return { exists: false };
    }

    try {
      const prefixedKey = this.getKey(key);
      const result = await this.client.exists(prefixedKey);
      return { exists: result === 1 };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) {
      return -2;
    }

    try {
      const prefixedKey = this.getKey(key);
      return await this.client.ttl(prefixedKey);
    } catch {
      return -2;
    }
  }

  /**
   * Set/update TTL for an existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const prefixedKey = this.getKey(key);
      const result = await this.client.expire(prefixedKey, ttlSeconds);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T = unknown>(keys: string[]): Promise<CacheBatchGetResult<T>> {
    const results = new Map<string, CacheGetResult<T>>();
    
    if (!this.client || keys.length === 0) {
      keys.forEach(key => results.set(key, { found: false }));
      return { results, foundCount: 0, missCount: keys.length };
    }

    try {
      const prefixedKeys = keys.map(k => this.getKey(k));
      const values = await this.client.mget(...prefixedKeys);

      let foundCount = 0;
      let missCount = 0;

      keys.forEach((key, index) => {
        const value = values[index];
        if (value === null) {
          results.set(key, { found: false });
          missCount++;
        } else {
          results.set(key, { 
            found: true, 
            value: JSON.parse(value) as T 
          });
          foundCount++;
        }
      });

      return { results, foundCount, missCount };
    } catch {
      keys.forEach(key => results.set(key, { found: false }));
      return { results, foundCount: 0, missCount: keys.length };
    }
  }

  /**
   * Set multiple values at once
   */
  async mset<T = unknown>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<CacheBatchSetResult> {
    if (!this.client || entries.length === 0) {
      return { success: false, successCount: 0, failedCount: entries.length };
    }

    try {
      const pipeline = this.client.pipeline();
      
      entries.forEach(({ key, value, ttl }) => {
        const prefixedKey = this.getKey(key);
        const serialized = JSON.stringify(value);
        const expiry = ttl ?? this.defaultTtl;
        pipeline.set(prefixedKey, serialized, 'EX', expiry);
      });

      const results = await pipeline.exec();
      
      if (!results) {
        return { success: false, successCount: 0, failedCount: entries.length };
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ key: string; error: string }> = [];

      results.forEach(([err], index) => {
        if (err) {
          failedCount++;
          errors.push({ 
            key: entries[index].key, 
            error: err.message 
          });
        } else {
          successCount++;
        }
      });

      return { 
        success: failedCount === 0, 
        successCount, 
        failedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return { 
        success: false, 
        successCount: 0, 
        failedCount: entries.length,
        errors: [{ 
          key: '*', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }]
      };
    }
  }

  /**
   * Delete multiple keys at once
   */
  async mdelete(keys: string[]): Promise<CacheDeleteResult> {
    if (!this.client || keys.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    try {
      const prefixedKeys = keys.map(k => this.getKey(k));
      const deletedCount = await this.client.del(...prefixedKeys);
      return { success: true, deletedCount };
    } catch {
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<CacheDeleteResult> {
    if (!this.client) {
      return { success: false, deletedCount: 0 };
    }

    try {
      const prefixedPattern = this.getKey(pattern);
      const keys = await this.client.keys(prefixedPattern);
      
      if (keys.length === 0) {
        return { success: true, deletedCount: 0 };
      }

      const deletedCount = await this.client.del(...keys);
      return { success: true, deletedCount };
    } catch {
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client) {
      return [];
    }

    try {
      const prefixedPattern = this.getKey(pattern);
      const keys = await this.client.keys(prefixedPattern);
      // Remove prefix from keys
      return keys.map(k => k.slice(this.keyPrefix.length));
    } catch {
      return [];
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string, by = 1): Promise<number> {
    if (!this.client) {
      return 0;
    }

    try {
      const prefixedKey = this.getKey(key);
      if (by === 1) {
        return await this.client.incr(prefixedKey);
      }
      return await this.client.incrby(prefixedKey, by);
    } catch {
      return 0;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decr(key: string, by = 1): Promise<number> {
    if (!this.client) {
      return 0;
    }

    try {
      const prefixedKey = this.getKey(key);
      if (by === 1) {
        return await this.client.decr(prefixedKey);
      }
      return await this.client.decrby(prefixedKey, by);
    } catch {
      return 0;
    }
  }

  /**
   * Clear all cache entries with our prefix
   */
  async clear(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Get cache stats
   */
  async stats(): Promise<CacheStats> {
    if (!this.client) {
      return { keyCount: 0 };
    }

    try {
      const info = await this.client.info('memory');
      const keys = await this.client.keys(`${this.keyPrefix}*`);
      
      // Parse memory usage from info
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1], 10) : undefined;

      // Parse uptime from server info
      const serverInfo = await this.client.info('server');
      const uptimeMatch = serverInfo.match(/uptime_in_seconds:(\d+)/);
      const uptime = uptimeMatch ? parseInt(uptimeMatch[1], 10) : undefined;

      return {
        keyCount: keys.length,
        memoryUsage,
        uptime,
      };
    } catch {
      return { keyCount: 0 };
    }
  }
}

/**
 * Create a Redis cache provider instance
 */
export function createRedisCacheProvider(
  config: RedisCacheProviderConfig
): RedisCacheProvider {
  return new RedisCacheProvider(config);
}

/**
 * Cache Utility Module
 *
 * Uses RedisCacheProvider from @fundifyhub/providers for consistent
 * framework-based caching across the application.
 *
 * @module utils/cache
 */

import { RedisCacheProvider, createRedisCacheProvider } from '@fundifyhub/providers';
import { CACHE_TTL as TTL_CONSTANTS } from '@fundifyhub/types';
import config from './config';
import logger from './logger';

/**
 * Re-export TTL constants with additional app-specific values
 */
export const CACHE_TTL = {
  // From @fundifyhub/types
  ...TTL_CONSTANTS,

  // App-specific TTLs
  USER_PROFILE: 300,          // 5 minutes
  DASHBOARD_STATS: 60,        // 1 minute
  GEOGRAPHY_DATA: 3600,       // 1 hour - countries, states, districts
  WAREHOUSE_DATA: 1800,       // 30 minutes
  SERVICE_CONFIG: 300,        // 5 minutes
  ASSET_DATA: 180,            // 3 minutes
  AUCTION_DATA: 30,           // 30 seconds - frequently changing
  REFERENCE_DATA: 7200,       // 2 hours - static reference data
} as const;

// Cache key patterns
export const CACHE_KEYS = {
  // Dashboard stats
  DASHBOARD_STATS: (userId: string, role: string) => `dashboard:stats:${role}:${userId}`,
  ADMIN_STATS: () => 'admin:stats',

  // User data
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_NOTIFICATIONS: (userId: string) => `user:notifications:${userId}`,
  USER_PERMISSIONS: (userId: string) => `user:permissions:${userId}`,

  // Request data
  REQUEST_DETAIL: (requestId: string) => `request:detail:${requestId}`,
  REQUEST_LIST: (userId: string, page: number) => `request:list:${userId}:${page}`,

  // Loan data
  LOAN_DETAIL: (loanId: string) => `loan:detail:${loanId}`,
  LOAN_EMI_SCHEDULE: (loanId: string) => `loan:emi:${loanId}`,

  // Geography data
  COUNTRIES: () => 'geography:countries',
  COUNTRY_BY_ID: (countryId: string) => `geography:country:${countryId}`,
  STATES_ALL: () => 'geography:states',
  STATES_BY_COUNTRY: (countryId: string) => `geography:states:country:${countryId}`,
  STATE_BY_ID: (stateId: string) => `geography:state:${stateId}`,
  DISTRICTS_ALL: () => 'geography:districts',
  DISTRICTS_BY_STATE: (stateId: string) => `geography:districts:state:${stateId}`,
  DISTRICT_BY_ID: (districtId: string) => `geography:district:${districtId}`,
  WAREHOUSES_ALL: () => 'geography:warehouses',
  WAREHOUSES_BY_DISTRICT: (districtId: string) => `geography:warehouses:district:${districtId}`,
  WAREHOUSE_BY_ID: (warehouseId: string) => `geography:warehouse:${warehouseId}`,

  // Asset data
  ASSET_DETAIL: (assetId: string) => `asset:detail:${assetId}`,
  ASSET_MOVEMENTS: (assetId: string) => `asset:movements:${assetId}`,
  WAREHOUSE_INVENTORY: (warehouseId: string) => `warehouse:inventory:${warehouseId}`,

  // Auction data
  AUCTION_DETAIL: (auctionId: string) => `auction:detail:${auctionId}`,
  AUCTION_BIDS: (auctionId: string) => `auction:bids:${auctionId}`,
  ACTIVE_AUCTIONS: () => 'auction:active',
  USER_BIDS: (userId: string) => `auction:user-bids:${userId}`,

  // Reference data (legacy - kept for backward compatibility)
  DISTRICTS: () => 'ref:districts',
  AGENTS_BY_DISTRICT: (district: string) => `ref:agents:${district}`,

  // Service configurations
  SERVICE_CONFIG: (serviceName: string) => `service:config:${serviceName}`,
  ALL_SERVICES: () => 'service:all',
} as const;

/**
 * Cache client wrapper using RedisCacheProvider
 */
class CacheClient {
  private provider: RedisCacheProvider | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    // Initialize provider with config
    if (config.redis.host && config.redis.port) {
      this.provider = createRedisCacheProvider({
        host: config.redis.host,
        port: config.redis.port,
        keyPrefix: 'fundifyhub:cache:',
        defaultTtl: CACHE_TTL.MEDIUM,
        maxRetries: 3,
        connectTimeout: 10000,
      });
    }
  }

  /**
   * Ensure Redis connection is established
   */
  private async ensureConnection(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    if (this.isConnected) {
      return true;
    }

    if (!this.connectionPromise) {
      this.connectionPromise = this.provider.connect()
        .then(() => {
          this.isConnected = true;
          logger.info('[Cache] Redis connected via RedisCacheProvider');
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
      if (!await this.ensureConnection() || !this.provider) return null;

      const result = await this.provider.get<T>(key);
      return result.found ? (result.value ?? null) : null;
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
      if (!await this.ensureConnection() || !this.provider) return false;

      const result = await this.provider.set(key, value, { ttl: ttlSeconds });
      return result.success;
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
      if (!await this.ensureConnection() || !this.provider) return false;

      const result = await this.provider.delete(key);
      return result.success;
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
      if (!await this.ensureConnection() || !this.provider) return 0;

      const result = await this.provider.deletePattern(pattern);
      return result.deletedCount;
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
   * Invalidate geography-related caches
   */
  async invalidateGeography(): Promise<void> {
    await this.del(CACHE_KEYS.COUNTRIES());
    await this.del(CACHE_KEYS.STATES_ALL());
    await this.del(CACHE_KEYS.DISTRICTS_ALL());
    await this.del(CACHE_KEYS.WAREHOUSES_ALL());
    await this.delPattern('geography:*');
  }

  /**
   * Invalidate asset-related caches
   */
  async invalidateAsset(assetId: string, warehouseId?: string): Promise<void> {
    await this.del(CACHE_KEYS.ASSET_DETAIL(assetId));
    await this.del(CACHE_KEYS.ASSET_MOVEMENTS(assetId));
    if (warehouseId) {
      await this.del(CACHE_KEYS.WAREHOUSE_INVENTORY(warehouseId));
    }
  }

  /**
   * Invalidate auction-related caches
   */
  async invalidateAuction(auctionId?: string): Promise<void> {
    if (auctionId) {
      await this.del(CACHE_KEYS.AUCTION_DETAIL(auctionId));
      await this.del(CACHE_KEYS.AUCTION_BIDS(auctionId));
    }
    await this.del(CACHE_KEYS.ACTIVE_AUCTIONS());
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
    return this.isConnected && this.provider !== null;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Get cache stats
   */
  async stats(): Promise<{ keyCount: number; memoryUsage?: number }> {
    if (!this.provider || !this.isConnected) {
      return { keyCount: 0 };
    }

    try {
      return await this.provider.stats();
    } catch {
      return { keyCount: 0 };
    }
  }
}

// Export singleton instance
export const cache = new CacheClient();

export default cache;

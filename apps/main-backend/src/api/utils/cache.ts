/**
 * Cache utility for API layer
 * 
 * Re-exports the main cache utility from utils/cache.ts
 * with additional helper methods for common API patterns.
 */

import cache, { CACHE_TTL, CACHE_KEYS } from '../../utils/cache';

// Re-export everything from the main cache module
export { CACHE_TTL, CACHE_KEYS };
export default cache;

/**
 * Type-safe cache methods for common patterns
 */
export const cacheHelpers = {
  /**
   * Get JSON value from cache
   */
  getJson: <T>(key: string): Promise<T | null> => cache.get<T>(key),

  /**
   * Set JSON value in cache
   */
  setJson: <T>(key: string, value: T, ttlSeconds: number): Promise<boolean> =>
    cache.set(key, value, ttlSeconds),

  /**
   * Delete one or more keys
   */
  del: async (keys: string | string[]): Promise<boolean> => {
    if (Array.isArray(keys)) {
      await Promise.all(keys.map((k) => cache.del(k)));
      return true;
    }
    return cache.del(keys);
  },

  /**
   * Get or compute and cache
   */
  getOrSet: <T>(key: string, factory: () => Promise<T>, ttlSeconds: number): Promise<T> =>
    cache.getOrSet(key, factory, ttlSeconds),
};

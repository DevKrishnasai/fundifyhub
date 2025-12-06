/**
 * Infrastructure Adapters
 * 
 * Thin wrappers around external services and providers.
 * All adapters use @fundifyhub/providers - no direct external SDK imports.
 * Translate between domain layer and provider APIs.
 * 
 * Pattern:
 * - Each adapter wraps one provider from @fundifyhub/providers
 * - All adapters are singletons (initialized once)
 * - No business logic in adapters (just translation)
 * - Configuration passed from environment, no hardcoded values
 * - Errors are logged but often not re-thrown (services are optional)
 * 
 * @module infra-adapters
 */

export { CacheAdapter, cacheAdapter } from './cache.adapter';
export { PaymentAdapter } from './payments.adapter';
export { StorageAdapter } from './storage.adapter';
export { NotificationAdapter, notificationAdapter } from './notification.adapter';
export { RealtimeAdapter, realtimeAdapter } from './realtime.adapter';

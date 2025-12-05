/**
 * Infrastructure Adapters
 * 
 * Thin wrappers around external services and providers.
 * Translate between domain layer and external APIs.
 * 
 * Pattern:
 * - Each adapter wraps one external service
 * - Adapters use TODO markers for production implementation
 * - All adapters are singletons (initialized once)
 * - No business logic in adapters (just translation)
 * - Errors are logged but often not re-thrown (services are optional)
 * 
 * @module infra-adapters
 */

export { CacheAdapter, cacheAdapter } from './cache.adapter';
export { PaymentAdapter } from './payments.adapter';
export { StorageAdapter } from './storage.adapter';
export { NotificationAdapter, notificationAdapter } from './notification.adapter';
export { RealtimeAdapter, realtimeAdapter } from './realtime.adapter';
export { AuditAdapter, auditAdapter } from './audit.adapter';

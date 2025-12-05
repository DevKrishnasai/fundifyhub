/**
 * @fundifyhub/providers
 * 
 * Provider implementations for external services:
 * - Payments: Razorpay, Manual
 * - Storage: UploadThing
 * - Cache: Redis
 * - Notifications: Email, WhatsApp, In-App (TODO)
 * 
 * @module providers
 */

// Payment providers
export {
  RazorpayProvider,
  createRazorpayProvider,
  ManualPaymentProvider,
  createManualPaymentProvider,
} from './payments';

export type {
  RazorpayProviderConfig,
  ManualPaymentProviderConfig,
} from './payments';

// Storage providers
export {
  UploadThingProvider,
  createUploadThingProvider,
} from './storage';

export type {
  UploadThingProviderConfig,
} from './storage';

// Cache providers
export {
  RedisCacheProvider,
  createRedisCacheProvider,
} from './cache';

export type {
  RedisCacheProviderConfig,
} from './cache';

// Audit providers
export {
  PrismaAuditProvider,
} from './audit';

export type {
  PrismaAuditProviderConfig,
} from './audit';

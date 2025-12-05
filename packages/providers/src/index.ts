/**
 * @fundifyhub/providers
 * 
 * Provider implementations for external services:
 * - Payments: Razorpay, Manual
 * - Storage: UploadThing
 * - Cache: Redis
 * - Notifications: Email, WhatsApp, In-App, Push
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

// Notification providers
export {
  NotificationService,
  NotificationOrchestrator,
  getNotificationService,
  NotificationBuilder,
  createNotification,
  BaseChannelAdapter,
  EmailAdapter,
  getEmailAdapter,
  WhatsAppAdapter,
  getWhatsAppAdapter,
  InAppAdapter,
  getInAppAdapter,
  PushAdapter,
  getPushAdapter,
} from './notifications';

export * from './notifications/channels';

export type {
  NotificationServiceConfig,
  IChannelAdapter,
  ChannelSendParams,
  ChannelSendResult,
  PushSubscription,
  PushPayload,
  PushAdapterConfig,
} from './notifications';

// Audit providers
export {
  PrismaAuditProvider,
} from './audit';

export type {
  PrismaAuditProviderConfig,
} from './audit';

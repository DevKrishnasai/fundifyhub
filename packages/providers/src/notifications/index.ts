/**
 * @fundifyhub/providers/notifications
 *
 * Industry-standard notification service for FundifyHub.
 * Provides a unified interface for sending notifications across multiple channels
 * (Email, WhatsApp, SMS, In-App, Push) with automatic retries, logging, and preference management.
 *
 * Features:
 * - Multi-channel support with automatic channel routing
 * - Four notification modes: BROADCAST, INDEPENDENT, FALLBACK, SINGLE
 * - Exponential backoff retry mechanism
 * - Automatic notification logging to database
 * - User preference management
 * - Rate limiting support
 * - Template validation
 *
 * @example
 * ```typescript
 * import { NotificationService, createNotification, NotificationChannel, DeliveryMode } from '@fundifyhub/providers/notifications';
 *
 * // Initialize service
 * const notificationService = NotificationService.getInstance();
 * await notificationService.initialize();
 *
 * // Send using builder pattern
 * const notification = createNotification('OTP_VERIFICATION')
 *   .to({ email: 'user@example.com', phoneNumber: '+919876543210' })
 *   .withVariables({ otpCode: '123456', expiresInMinutes: 10 })
 *   .viaEmailAndWhatsApp()
 *   .independent() // Different OTP per channel
 *   .highPriority()
 *   .build();
 *
 * const result = await notificationService.send(notification);
 * ```
 */

// Main service
export {
  NotificationService,
  getNotificationService,
  type NotificationServiceConfig,
} from './notification-service';

// Builder
export {
  NotificationBuilder,
  createNotification,
} from './notification-builder';

// Channel adapters
export {
  BaseChannelAdapter,
  type IChannelAdapter,
  type ChannelSendParams,
  type ChannelSendResult,
  NON_RETRYABLE_ERROR_CODES,
} from './channel-adapters/base-adapter';

export { EmailAdapter, getEmailAdapter } from './channel-adapters/email-adapter';
export { WhatsAppAdapter, getWhatsAppAdapter } from './channel-adapters/whatsapp-adapter';
export { InAppAdapter, getInAppAdapter } from './channel-adapters/in-app-adapter';
export { PushAdapter, getPushAdapter, type PushSubscription, type PushPayload, type PushAdapterConfig } from './channel-adapters/push-adapter';

// Channel aliases aligned with architecture (channels/*)
export * from './channels';

// Re-export types from @fundifyhub/types for convenience
export {
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationCategory,
  DeliveryMode,
  BackoffStrategy,
  DEFAULT_RETRY_CONFIGS,
  DEFAULT_CHANNEL_RATE_LIMITS,
  type NotificationRequest,
  type NotificationResult,
  type ChannelDeliveryResult,
  type RetryConfig,
  type NotificationRecipient,
  type ChannelOptions,
  type EmailOptions,
  type WhatsAppOptions,
  type PushOptions,
  type InAppOptions,
  type ChannelRateLimitConfig,
  type RateLimitResult,
} from '@fundifyhub/types';


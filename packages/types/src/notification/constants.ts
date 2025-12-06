import { NotificationPriority, BackoffStrategy, NotificationChannel } from './enums';

/**
 * Retry configuration for notification delivery
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay: number;
  /** Maximum delay cap in milliseconds (default: 300000 = 5 min) */
  maxDelay: number;
  /** Backoff strategy (default: EXPONENTIAL) */
  backoffStrategy: BackoffStrategy;
  /** Multiplier for exponential/linear backoff (default: 2) */
  backoffMultiplier: number;
  /** Jitter factor to randomize delays (0-1, default: 0.1) */
  jitter: number;
  /** Error codes that should not be retried */
  nonRetryableErrors?: string[];
}

/**
 * Default retry configurations by priority
 */
export const DEFAULT_RETRY_CONFIGS: Record<NotificationPriority, RetryConfig> = {
  [NotificationPriority.CRITICAL]: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 60000,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    backoffMultiplier: 2,
    jitter: 0.1,
  },
  [NotificationPriority.HIGH]: {
    maxAttempts: 4,
    initialDelay: 1000,
    maxDelay: 120000,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    backoffMultiplier: 2,
    jitter: 0.1,
  },
  [NotificationPriority.NORMAL]: {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 300000,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    backoffMultiplier: 2,
    jitter: 0.2,
  },
  [NotificationPriority.LOW]: {
    maxAttempts: 2,
    initialDelay: 5000,
    maxDelay: 600000,
    backoffStrategy: BackoffStrategy.EXPONENTIAL,
    backoffMultiplier: 2,
    jitter: 0.3,
  },
  [NotificationPriority.BULK]: {
    maxAttempts: 2,
    initialDelay: 10000,
    maxDelay: 900000,
    backoffStrategy: BackoffStrategy.LINEAR,
    backoffMultiplier: 2,
    jitter: 0.5,
  },
};

/**
 * Rate limit configuration per channel
 */
export interface ChannelRateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Whether to queue requests when rate limited (vs rejecting) */
  queueOnLimit?: boolean;
  /** Maximum queue size when queueing */
  maxQueueSize?: number;
}

/**
 * Default rate limits per channel
 * These are conservative limits; adjust based on provider quotas
 */
export const DEFAULT_CHANNEL_RATE_LIMITS: Record<NotificationChannel, ChannelRateLimitConfig> = {
  [NotificationChannel.EMAIL]: {
    maxRequests: 100,       // 100 emails per minute
    windowMs: 60 * 1000,
    queueOnLimit: true,
    maxQueueSize: 1000,
  },
  [NotificationChannel.WHATSAPP]: {
    maxRequests: 50,        // 50 messages per minute (WhatsApp Business API limits)
    windowMs: 60 * 1000,
    queueOnLimit: true,
    maxQueueSize: 500,
  },
  [NotificationChannel.SMS]: {
    maxRequests: 30,        // 30 SMS per minute (typical provider limits)
    windowMs: 60 * 1000,
    queueOnLimit: true,
    maxQueueSize: 500,
  },
  [NotificationChannel.PUSH]: {
    maxRequests: 500,       // 500 push per minute (FCM/APNS are generous)
    windowMs: 60 * 1000,
    queueOnLimit: true,
    maxQueueSize: 2000,
  },
  [NotificationChannel.IN_APP]: {
    maxRequests: 1000,      // 1000 per minute (database inserts)
    windowMs: 60 * 1000,
    queueOnLimit: false,    // In-app should never be rate limited
    maxQueueSize: 0,
  },
};

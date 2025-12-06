/**
 * @fileoverview Industry-standard notification system types
 * 
 * This module provides comprehensive types for a scalable, multi-channel
 * notification system with support for:
 * - Multiple delivery channels (Email, WhatsApp, SMS, Push, In-App)
 * - Broadcast mode (same content to all channels)
 * - Independent mode (different content/OTPs per channel)
 * - Automatic retry with exponential backoff
 * - Delivery tracking and logging
 * - User notification preferences
 * - Template-based content rendering
 */

// ============================================
// NOTIFICATION CHANNELS
// ============================================

/**
 * Supported notification delivery channels
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

/**
 * Notification delivery status
 */
export enum NotificationStatus {
  /** Notification created, waiting to be processed */
  PENDING = 'PENDING',
  /** Currently being processed/sent */
  PROCESSING = 'PROCESSING',
  /** Successfully delivered to the channel provider */
  SENT = 'SENT',
  /** Confirmed delivered to recipient */
  DELIVERED = 'DELIVERED',
  /** Recipient opened/read the notification */
  READ = 'READ',
  /** Delivery failed, may retry */
  FAILED = 'FAILED',
  /** All retry attempts exhausted */
  PERMANENTLY_FAILED = 'PERMANENTLY_FAILED',
  /** Notification was cancelled */
  CANCELLED = 'CANCELLED',
  /** Scheduled for future delivery */
  SCHEDULED = 'SCHEDULED',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  /** System critical - immediate delivery, no batching */
  CRITICAL = 1,
  /** High priority - OTPs, security alerts */
  HIGH = 2,
  /** Normal priority - transactional messages */
  NORMAL = 3,
  /** Low priority - reminders, marketing */
  LOW = 4,
  /** Bulk - can be batched and delayed */
  BULK = 5,
}

/**
 * Notification categories for grouping and preferences
 */
export enum NotificationCategory {
  /** Security: OTPs, login alerts, password changes */
  SECURITY = 'SECURITY',
  /** Transactional: Request updates, payment confirmations */
  TRANSACTIONAL = 'TRANSACTIONAL',
  /** Reminders: EMI due, inspection scheduled */
  REMINDER = 'REMINDER',
  /** Marketing: Promotions, offers */
  MARKETING = 'MARKETING',
  /** System: Maintenance, updates */
  SYSTEM = 'SYSTEM',
}

// ============================================
// DELIVERY MODES
// ============================================

/**
 * Delivery mode determines how notifications are sent across channels
 */
export enum DeliveryMode {
  /**
   * BROADCAST: Same content sent to all specified channels
   * Use case: Password reset link (same link to email + WhatsApp)
   */
  BROADCAST = 'BROADCAST',
  
  /**
   * INDEPENDENT: Each channel gets independently generated content
   * Use case: OTP verification (different OTP per channel)
   */
  INDEPENDENT = 'INDEPENDENT',
  
  /**
   * FALLBACK: Try channels in order, stop on first success
   * Use case: Critical alerts (try email, if fails try WhatsApp)
   */
  FALLBACK = 'FALLBACK',
  
  /**
   * SINGLE: Send to only one specified channel
   * Use case: Email-only verification
   */
  SINGLE = 'SINGLE',
}

// ============================================
// RETRY CONFIGURATION
// ============================================

/**
 * Backoff strategy for retries
 */
export enum BackoffStrategy {
  /** Fixed delay between retries */
  FIXED = 'FIXED',
  /** Exponential increase: delay * 2^attempt */
  EXPONENTIAL = 'EXPONENTIAL',
  /** Linear increase: delay * attempt */
  LINEAR = 'LINEAR',
}

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

// ============================================
// RATE LIMITING
// ============================================

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

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** When the rate limit resets (timestamp) */
  resetAt: number;
  /** If rate limited, how long to wait (ms) */
  retryAfter?: number;
}


// ============================================
// RECIPIENT TYPES
// ============================================

/**
 * Recipient information for notification delivery
 */
export interface NotificationRecipient {
  /** User ID (if registered user) */
  userId?: string;
  /** Email address */
  email?: string;
  /** Phone number (with country code) */
  phoneNumber?: string;
  /** Device token for push notifications */
  deviceToken?: string;
  /** Recipient's preferred name for personalization */
  name?: string;
  /** Preferred language (ISO 639-1 code) */
  language?: string;
  /** Timezone for scheduled notifications */
  timezone?: string;
}

// ============================================
// CHANNEL-SPECIFIC OPTIONS
// ============================================

/**
 * Email-specific options
 */
export interface EmailOptions {
  /** Email subject line */
  subject: string;
  /** Reply-to address */
  replyTo?: string;
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** Attachments */
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * WhatsApp-specific options
 */
export interface WhatsAppOptions {
  /** Use WhatsApp Business template (for HSM) */
  useTemplate?: boolean;
  /** Template name (if using HSM) */
  templateName?: string;
  /** Template language */
  templateLanguage?: string;
  /** Media attachment URL */
  mediaUrl?: string;
  /** Media type */
  mediaType?: 'image' | 'video' | 'document' | 'audio';
}

/**
 * SMS-specific options
 */
export interface SMSOptions {
  /** Sender ID */
  senderId?: string;
  /** Use Unicode encoding */
  unicode?: boolean;
  /** Flash message (show immediately) */
  flash?: boolean;
}

/**
 * Push notification options
 */
export interface PushOptions {
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Icon URL */
  icon?: string;
  /** Image URL */
  image?: string;
  /** Action URL when clicked */
  actionUrl?: string;
  /** Custom data payload */
  data?: Record<string, unknown>;
  /** Time to live in seconds */
  ttl?: number;
  /** Badge count */
  badge?: number;
  /** Sound name */
  sound?: string;
}

/**
 * In-app notification options
 */
export interface InAppOptions {
  /** Action URL when clicked */
  actionUrl?: string;
  /** Icon name or URL */
  icon?: string;
  /** Auto-dismiss after seconds (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Persist in notification center */
  persist?: boolean;
}

/**
 * Channel-specific options map
 */
export interface ChannelOptions {
  [NotificationChannel.EMAIL]?: EmailOptions;
  [NotificationChannel.WHATSAPP]?: WhatsAppOptions;
  [NotificationChannel.SMS]?: SMSOptions;
  [NotificationChannel.PUSH]?: PushOptions;
  [NotificationChannel.IN_APP]?: InAppOptions;
}

// ============================================
// NOTIFICATION REQUEST
// ============================================

/**
 * Main notification request interface
 * This is what you pass to send a notification
 */
export interface NotificationRequest<T extends string = string> {
  /** Unique correlation ID for tracking (auto-generated if not provided) */
  correlationId?: string;
  
  /** Template name to use */
  templateName: T;
  
  /** Template variables for content rendering */
  variables: Record<string, unknown>;
  
  /** Recipient information */
  recipient: NotificationRecipient;
  
  /** Delivery channels to use */
  channels: NotificationChannel[];
  
  /** Delivery mode (default: BROADCAST) */
  deliveryMode?: DeliveryMode;
  
  /** Priority level (default: NORMAL) */
  priority?: NotificationPriority;
  
  /** Category for grouping and preferences */
  category?: NotificationCategory;
  
  /** Channel-specific options */
  channelOptions?: ChannelOptions;
  
  /** Custom retry configuration (overrides defaults) */
  retryConfig?: Partial<RetryConfig>;
  
  /** Schedule for future delivery (ISO timestamp) */
  scheduledAt?: string;
  
  /** Expiry time - don't deliver after this (ISO timestamp) */
  expiresAt?: string;
  
  /** Idempotency key to prevent duplicate sends */
  idempotencyKey?: string;
  
  /** Additional metadata for logging/tracking */
  metadata?: Record<string, unknown>;
  
  /**
   * Variable generator for INDEPENDENT mode
   * Called for each channel to generate channel-specific variables
   * Example: Generate different OTP per channel
   */
  variableGenerator?: (channel: NotificationChannel, baseVariables: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

// ============================================
// NOTIFICATION RESULT
// ============================================

/**
 * Result of sending to a single channel
 */
export interface ChannelDeliveryResult {
  /** Channel this result is for */
  channel: NotificationChannel;
  /** Delivery status */
  status: NotificationStatus;
  /** Provider message ID (if available) */
  messageId?: string;
  /** Error message (if failed) */
  error?: string;
  /** Error code (if failed) */
  errorCode?: string;
  /** Timestamp of last attempt */
  lastAttemptAt: string;
  /** Number of attempts made */
  attempts: number;
  /** Next retry scheduled at (if applicable) */
  nextRetryAt?: string;
}

/**
 * Complete notification result
 */
export interface NotificationResult {
  /** Correlation ID for tracking */
  correlationId: string;
  /** Overall success (true if at least one channel succeeded based on mode) */
  success: boolean;
  /** Per-channel results */
  channelResults: ChannelDeliveryResult[];
  /** Notification log ID for reference */
  notificationLogId?: string;
  /** Error message (if complete failure) */
  error?: string;
}

// ============================================
// NOTIFICATION LOG (for Prisma model reference)
// ============================================

/**
 * Notification log entry structure (matches Prisma model)
 */
export interface NotificationLogEntry {
  id: string;
  correlationId: string;
  
  /** Recipient info */
  userId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  
  /** Template and content */
  templateName: string;
  variables: Record<string, unknown>;
  
  /** Delivery info */
  channel: NotificationChannel;
  deliveryMode: DeliveryMode;
  priority: NotificationPriority;
  category?: NotificationCategory | null;
  
  /** Status tracking */
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  
  /** Provider info */
  providerMessageId?: string | null;
  providerResponse?: Record<string, unknown> | null;
  
  /** Error tracking */
  lastError?: string | null;
  lastErrorCode?: string | null;
  lastAttemptAt?: Date | null;
  nextRetryAt?: Date | null;
  
  /** Scheduling */
  scheduledAt?: Date | null;
  expiresAt?: Date | null;
  
  /** Delivery timestamps */
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  
  /** Metadata */
  metadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// USER NOTIFICATION PREFERENCES
// ============================================

/**
 * User notification preference per channel and category
 */
export interface NotificationPreference {
  userId: string;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  /** Quiet hours start (HH:mm format) */
  quietHoursStart?: string | null;
  /** Quiet hours end (HH:mm format) */
  quietHoursEnd?: string | null;
  /** Frequency limit (max notifications per hour) */
  frequencyLimit?: number | null;
}

// ============================================
// TEMPLATE TYPES
// ============================================

/**
 * Rendered template content for a specific channel
 */
export interface RenderedContent {
  /** Main content (HTML for email, text for others) */
  content: string;
  /** Subject line (email only) */
  subject?: string;
  /** Plain text version (email) */
  plainText?: string;
}

/**
 * Template renderer function type
 */
export type TemplateRenderer<TVariables = Record<string, unknown>> = (
  variables: TVariables
) => RenderedContent | Promise<RenderedContent>;

/**
 * Channel-specific template renderers
 */
export interface ChannelRenderers<TVariables = Record<string, unknown>> {
  [NotificationChannel.EMAIL]?: TemplateRenderer<TVariables>;
  [NotificationChannel.WHATSAPP]?: TemplateRenderer<TVariables>;
  [NotificationChannel.SMS]?: TemplateRenderer<TVariables>;
  [NotificationChannel.PUSH]?: TemplateRenderer<TVariables>;
  [NotificationChannel.IN_APP]?: TemplateRenderer<TVariables>;
}

/**
 * Template definition
 */
export interface NotificationTemplate<TVariables = Record<string, unknown>> {
  /** Template identifier */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Supported channels */
  supportedChannels: NotificationChannel[];
  /** Default category */
  defaultCategory: NotificationCategory;
  /** Default priority */
  defaultPriority: NotificationPriority;
  /** Channel-specific renderers */
  renderers: ChannelRenderers<TVariables>;
  /** Default retry config (optional override) */
  retryConfig?: Partial<RetryConfig>;
  /** Variable schema for validation (optional) */
  variableSchema?: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;
}

// ============================================
// SERVICE EVENTS
// ============================================

/**
 * Notification event types for hooks/callbacks
 */
export enum NotificationEvent {
  CREATED = 'notification.created',
  PROCESSING = 'notification.processing',
  SENT = 'notification.sent',
  DELIVERED = 'notification.delivered',
  READ = 'notification.read',
  FAILED = 'notification.failed',
  RETRY_SCHEDULED = 'notification.retry_scheduled',
  PERMANENTLY_FAILED = 'notification.permanently_failed',
  CANCELLED = 'notification.cancelled',
}

/**
 * Event payload for notification events
 */
export interface NotificationEventPayload {
  event: NotificationEvent;
  correlationId: string;
  channel: NotificationChannel;
  notificationLogId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

// ============================================
// QUEUE JOB TYPES
// ============================================

/**
 * Notification job data for queue processing
 */
export interface NotificationJobData {
  /** Notification log ID */
  notificationLogId: string;
  /** Correlation ID for tracking */
  correlationId: string;
  /** Target channel */
  channel: NotificationChannel;
  /** Recipient info */
  recipient: NotificationRecipient;
  /** Template name */
  templateName: string;
  /** Template variables */
  variables: Record<string, unknown>;
  /** Channel-specific options */
  channelOptions?: ChannelOptions[NotificationChannel];
  /** Current attempt number */
  attemptNumber: number;
  /** Priority */
  priority: NotificationPriority;
  /** Retry config */
  retryConfig: RetryConfig;
  /** Expiry timestamp */
  expiresAt?: string;
}

/**
 * Notification job result
 */
export interface NotificationJobResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  shouldRetry?: boolean;
  providerResponse?: Record<string, unknown>;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Extract variables type from a template
 */
export type ExtractTemplateVariables<T> = T extends NotificationTemplate<infer V> ? V : never;

/**
 * Type-safe notification request builder
 */
export type TypedNotificationRequest<T extends NotificationTemplate> = Omit<
  NotificationRequest<string>,
  'templateName' | 'variables'
> & {
  templateName: T['name'];
  variables: ExtractTemplateVariables<T>;
};

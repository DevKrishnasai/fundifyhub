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

// ============================================
// SERVICE NAMES
// ============================================

export enum SERVICE_NAMES {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

// ============================================
// TEMPLATE NAMES ENUM
// ============================================

/**
 * All available notification templates
 * Add new templates here as the system grows
 */
export enum NotificationTemplateName {
  // Authentication & Security
  OTP_VERIFICATION = 'OTP_VERIFICATION',
  WELCOME = 'WELCOME',
  LOGIN_ALERT = 'LOGIN_ALERT',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  ADMIN_USER_CREATED = 'ADMIN_USER_CREATED',
  
  // Request Lifecycle
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
  REQUEST_STATUS_UPDATE = 'REQUEST_STATUS_UPDATE',
  MORE_INFO_REQUIRED = 'MORE_INFO_REQUIRED',
  
  // Offer & Negotiation
  OFFER_SENT = 'OFFER_SENT',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_DECLINED = 'OFFER_DECLINED',
  OFFER_EXPIRED = 'OFFER_EXPIRED',
  
  // Inspection
  INSPECTION_SCHEDULED = 'INSPECTION_SCHEDULED',
  INSPECTION_REMINDER = 'INSPECTION_REMINDER',
  INSPECTION_COMPLETED = 'INSPECTION_COMPLETED',
  
  // Loan
  LOAN_APPROVED = 'LOAN_APPROVED',
  LOAN_DISBURSED = 'LOAN_DISBURSED',
  LOAN_COMPLETED = 'LOAN_COMPLETED',
  
  // Payments & EMI
  EMI_REMINDER = 'EMI_REMINDER',
  EMI_OVERDUE = 'EMI_OVERDUE',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // Asset
  ASSET_PLEDGE = 'ASSET_PLEDGE',
  
  // System
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

// Alias for backward compatibility if needed
export const TEMPLATE_NAMES = NotificationTemplateName;

// ============================================
// QUEUE NAMES
// ============================================

export enum QUEUE_NAMES {
  EMI_CRON_QUEUE = 'EMI_CRON_QUEUE',
  NOTIFICATION_QUEUE = 'NOTIFICATION_QUEUE',
  SERVICE_CONTROL_QUEUE = 'SERVICE_CONTROL_QUEUE',
}

// ============================================
// JOB TYPES
// ============================================

export enum JOB_TYPES {
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  UPDATE_OVERDUE_EMIS = 'UPDATE_OVERDUE_EMIS',
  SERVICE_CONTROL = 'SERVICE_CONTROL',
}

// ============================================
// SERVICE CONTROL
// ============================================

export enum SERVICE_CONTROL_ACTIONS {
  START = 'START',
  STOP = 'STOP',
  RESTART = 'RESTART',
  DISCONNECT = 'DISCONNECT',
  TEST = 'TEST',
}

export enum CONNECTION_STATUS {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  CONNECTING = 'CONNECTING',
  WAITING_FOR_QR_SCAN = 'WAITING_FOR_QR_SCAN',
  AUTHENTICATED = 'AUTHENTICATED',
  INITIALIZING = 'INITIALIZING',
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

import { 
  NotificationChannel, 
  NotificationStatus, 
  NotificationPriority, 
  NotificationCategory,
  DeliveryMode,
  NotificationTemplateName,
  SERVICE_NAMES,
  CONNECTION_STATUS,
  NotificationEvent
} from './enums';
import { RetryConfig } from './constants';

// ============================================
// RATE LIMITING
// ============================================

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
// TEMPLATE PAYLOAD TYPES
// ============================================

/**
 * Base payload that all templates receive
 */
export interface BaseTemplatePayload {
  /** Recipient email (required for email channel) */
  email?: string;
  /** Recipient phone number (required for WhatsApp/SMS) */
  phoneNumber?: string;
  /** Recipient name for personalization */
  recipientName?: string;
  /** Company branding */
  companyName: string;
  companyUrl?: string;
  supportUrl?: string;
  logoUrl?: string;
}

/**
 * OTP Verification payload
 */
export interface OTPVerificationPayload extends BaseTemplatePayload {
  otpCode: string;
  expiresInMinutes: number;
  verifyUrl?: string;
  purpose?: 'registration' | 'login' | 'password_reset' | 'phone_verification' | 'email_verification';
}

/**
 * Welcome payload
 */
export interface WelcomePayload extends BaseTemplatePayload {
  customerName: string;
  dashboardUrl?: string;
}

/**
 * Login Alert payload
 */
export interface LoginAlertPayload extends BaseTemplatePayload {
  customerName: string;
  device: string;
  location: string;
  loginTime: string;
  ipAddress?: string;
  resetPasswordUrl?: string;
}

/**
 * Password Reset payload
 */
export interface PasswordResetPayload extends BaseTemplatePayload {
  customerName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

/**
 * Admin User Created payload
 */
export interface AdminUserCreatedPayload extends BaseTemplatePayload {
  name: string;
  email: string;
  role: string;
  loginUrl: string;
  temporaryPassword?: string;
}

/**
 * Request Submitted payload
 */
export interface RequestSubmittedPayload extends BaseTemplatePayload {
  customerName: string;
  requestId: string;
  requestNumber: string;
  assetName: string;
  requestedAmount: number;
  district: string;
  submittedAt: string;
  dashboardUrl: string;
}

/**
 * Request Status Update payload
 */
export interface RequestStatusUpdatePayload extends BaseTemplatePayload {
  customerName: string;
  requestId: string;
  requestNumber: string;
  previousStatus: string;
  currentStatus: string;
  statusDescription?: string;
  actionRequired?: string;
  dashboardUrl: string;
  updatedAt: string;
}

/**
 * More Info Required payload
 */
export interface MoreInfoRequiredPayload extends BaseTemplatePayload {
  customerName: string;
  requestId: string;
  requestNumber: string;
  requiredInfo: string;
  dashboardUrl: string;
  deadlineDate?: string;
}

/**
 * Offer Sent payload
 */
export interface OfferSentPayload extends BaseTemplatePayload {
  customerName: string;
  requestId: string;
  requestNumber: string;
  offeredAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  processingFee?: number;
  expiresAt?: string;
  dashboardUrl: string;
}

/**
 * Inspection Scheduled payload
 */
export interface InspectionScheduledPayload extends BaseTemplatePayload {
  customerName: string;
  requestId: string;
  requestNumber: string;
  scheduledDate: string;
  scheduledTime: string;
  agentName?: string;
  agentPhone?: string;
  address: string;
  rescheduleUrl?: string;
}

/**
 * Loan Disbursed payload
 */
export interface LoanDisbursedPayload extends BaseTemplatePayload {
  customerName: string;
  loanNumber: string;
  disbursedAmount: number;
  transferMethod: string;
  transferReference?: string;
  firstEmiDate: string;
  emiAmount: number;
  dashboardUrl: string;
}

/**
 * EMI Reminder payload
 */
export interface EMIReminderPayload extends BaseTemplatePayload {
  customerName: string;
  loanNumber: string;
  emiNumber: number;
  emiAmount: number;
  dueDate: string;
  daysUntilDue: number;
  totalOutstanding?: number;
  paymentUrl?: string;
}

/**
 * EMI Overdue payload
 */
export interface EMIOverduePayload extends BaseTemplatePayload {
  customerName: string;
  loanNumber: string;
  emiNumber: number;
  emiAmount: number;
  dueDate: string;
  daysOverdue: number;
  lateFee: number;
  totalDue: number;
  overdueCount: number;
  paymentUrl?: string;
}

/**
 * Payment Success payload
 */
export interface PaymentSuccessPayload extends BaseTemplatePayload {
  customerName: string;
  loanNumber: string;
  emiNumber: number;
  amountPaid: number;
  paymentMethod: string;
  transactionId: string;
  paidAt: string;
  remainingEMIs: number;
  remainingAmount: number;
  receiptUrl?: string;
}

/**
 * Payment Failed payload
 */
export interface PaymentFailedPayload extends BaseTemplatePayload {
  customerName: string;
  loanNumber: string;
  emiNumber: number;
  attemptedAmount: number;
  failureReason?: string;
  retryUrl?: string;
}

/**
 * Asset Pledge payload
 */
export interface AssetPledgePayload extends BaseTemplatePayload {
  customerName: string;
  assetName: string;
  amount: number;
  district: string;
  requestId: string;
  timestamp: string;
  additionalDescription?: string;
  adminDashboardUrl?: string;
}


/**
 * Maps template names to their payload types
 */
export interface TemplatePayloadMap {
  [NotificationTemplateName.OTP_VERIFICATION]: OTPVerificationPayload;
  [NotificationTemplateName.WELCOME]: WelcomePayload;
  [NotificationTemplateName.LOGIN_ALERT]: LoginAlertPayload;
  [NotificationTemplateName.PASSWORD_RESET]: PasswordResetPayload;
  [NotificationTemplateName.PASSWORD_CHANGED]: BaseTemplatePayload & { customerName: string };
  [NotificationTemplateName.ADMIN_USER_CREATED]: AdminUserCreatedPayload;
  [NotificationTemplateName.REQUEST_SUBMITTED]: RequestSubmittedPayload;
  [NotificationTemplateName.REQUEST_STATUS_UPDATE]: RequestStatusUpdatePayload;
  [NotificationTemplateName.MORE_INFO_REQUIRED]: MoreInfoRequiredPayload;
  [NotificationTemplateName.OFFER_SENT]: OfferSentPayload;
  [NotificationTemplateName.OFFER_ACCEPTED]: BaseTemplatePayload & { customerName: string; requestNumber: string; dashboardUrl: string };
  [NotificationTemplateName.OFFER_DECLINED]: BaseTemplatePayload & { customerName: string; requestNumber: string };
  [NotificationTemplateName.OFFER_EXPIRED]: BaseTemplatePayload & { customerName: string; requestNumber: string; dashboardUrl: string };
  [NotificationTemplateName.INSPECTION_SCHEDULED]: InspectionScheduledPayload;
  [NotificationTemplateName.INSPECTION_REMINDER]: InspectionScheduledPayload;
  [NotificationTemplateName.INSPECTION_COMPLETED]: BaseTemplatePayload & { customerName: string; requestNumber: string; dashboardUrl: string };
  [NotificationTemplateName.LOAN_APPROVED]: BaseTemplatePayload & { customerName: string; loanNumber: string; approvedAmount: number; dashboardUrl: string };
  [NotificationTemplateName.LOAN_DISBURSED]: LoanDisbursedPayload;
  [NotificationTemplateName.LOAN_COMPLETED]: BaseTemplatePayload & { customerName: string; loanNumber: string; totalPaid: number };
  [NotificationTemplateName.EMI_REMINDER]: EMIReminderPayload;
  [NotificationTemplateName.EMI_OVERDUE]: EMIOverduePayload;
  [NotificationTemplateName.PAYMENT_SUCCESS]: PaymentSuccessPayload;
  [NotificationTemplateName.PAYMENT_FAILED]: PaymentFailedPayload;
  [NotificationTemplateName.ASSET_PLEDGE]: AssetPledgePayload;
  [NotificationTemplateName.SYSTEM_ANNOUNCEMENT]: BaseTemplatePayload & { title: string; message: string; actionUrl?: string };
}

// ============================================
// CHANNEL RENDERER TYPE
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
 * Renderer function for a specific channel
 */
export type ChannelRenderer<TPayload> = (
  payload: TPayload
) => RenderedContent | Promise<RenderedContent>;

/**
 * Channel renderers map for a template
 */
export type TemplateChannelRenderers<TPayload> = {
  [K in NotificationChannel]?: ChannelRenderer<TPayload>;
};

// ============================================
// TEMPLATE DEFINITION
// ============================================

/**
 * Complete template definition
 */
export interface NotificationTemplateDefinition<TName extends NotificationTemplateName> {
  /** Template identifier */
  name: TName;
  
  /** Human-readable description */
  description: string;
  
  /** Supported channels for this template */
  supportedChannels: NotificationChannel[];
  
  /** Default category */
  defaultCategory: NotificationCategory;
  
  /** Default priority */
  defaultPriority: NotificationPriority;
  
  /** Channel-specific renderers */
  renderers: TemplateChannelRenderers<TemplatePayloadMap[TName]>;
  
  /** Default retry configuration override */
  retryConfig?: Partial<RetryConfig>;
  
  /** Get email subject (for email channel) */
  getSubject?: (payload: TemplatePayloadMap[TName]) => string;
}

// ============================================
// TEMPLATE REGISTRY TYPE
// ============================================

/**
 * Registry containing all template definitions
 */
export type NotificationTemplateRegistry = {
  [K in NotificationTemplateName]: NotificationTemplateDefinition<K>;
};

// ============================================
// HELPER TYPES
// ============================================

/**
 * Get payload type for a template name
 */
export type GetTemplatePayload<T extends NotificationTemplateName> = TemplatePayloadMap[T];

/**
 * Type-safe template request
 */
export interface TypedTemplateRequest<T extends NotificationTemplateName> {
  templateName: T;
  variables: TemplatePayloadMap[T];
}

/**
 * Legacy alias for template definition
 * @deprecated Use NotificationTemplateDefinition instead
 */
export type TemplateDefinitionType = NotificationTemplateDefinition<any>;

// ============================================
// SERVICE EVENTS
// ============================================

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
  /** Target channels */
  channels: NotificationChannel[];
  /** Delivery mode */
  deliveryMode?: DeliveryMode;
  /** Recipient info */
  recipient: NotificationRecipient;
  /** Template name */
  templateName: string;
  /** Template variables */
  variables: Record<string, unknown>;
  /** Channel-specific options */
  channelOptions?: ChannelOptions;
  /** Current attempt number */
  attemptNumber: number;
  /** Priority */
  priority: NotificationPriority;
  /** Retry config */
  retryConfig: RetryConfig;
  /** Expiry timestamp */
  expiresAt?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
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

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  icon?: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: Date | null;
  isArchived: boolean;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any> | null;
}

/**
 * Email service configuration
 */
export interface EmailConfigType {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

/**
 * Generic service configuration
 * Used for tracking and managing external service connections
 */
export interface ServiceConfigType {
  serviceName: SERVICE_NAMES;
  status: string;
  isEnabled: boolean;
  isActive: boolean;
  connectionStatus: CONNECTION_STATUS;
  lastConnectedAt?: Date;
  lastError?: string;
  config?: EmailConfigType | Record<string, unknown>;
  /** QR code for WhatsApp connection */
  qrCode?: string;
}

/**
 * Utils package environment configuration
 */
export interface UtilsEnvConfigType {
  redis: {
    host: string;
    port: number;
    url?: string;
  };
}

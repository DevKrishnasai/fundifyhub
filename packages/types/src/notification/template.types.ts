/**
 * @fileoverview Template system types for the notification framework
 * 
 * Templates are defined in code (not database) for:
 * - Type safety with TypeScript
 * - Version control
 * - Easy testing and deployment
 * - No database dependency for critical notifications
 * 
 * Each template supports multiple channels (email, whatsapp, sms, etc.)
 * with channel-specific renderers.
 */

import {
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  RenderedContent,
  RetryConfig,
} from './notification-types';

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

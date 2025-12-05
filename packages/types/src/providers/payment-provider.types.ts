/**
 * Payment Provider Framework Types
 * 
 * This module defines the interface contract for all payment providers.
 * Implementations include: RazorpayProvider, ManualPaymentProvider
 * 
 * @module providers/payment-provider
 */

import { PAYMENT_METHOD, PAYMENT_STATUS, PAYMENT_ORDER_STATUS } from '../payment/payment.constants';

// ============================================
// PAYMENT PROVIDER IDENTIFICATION
// ============================================

/**
 * Supported payment provider types
 */
export enum PaymentProviderType {
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',       // Future
  MANUAL = 'MANUAL',       // Cash, Cheque, Bank Transfer
}

// ============================================
// PAYMENT ORDER TYPES
// ============================================

/**
 * Amount breakdown for EMI payments
 */
export interface PaymentAmountBreakdown {
  /** Base EMI amount (principal + interest) */
  emiAmount: number;
  /** Penalty amount (late fees + overdue penalty) */
  penalty: number;
  /** Total amount to be paid */
  totalAmount: number;
  /** Principal component */
  principal?: number;
  /** Interest component */
  interest?: number;
  /** Days late (if applicable) */
  daysLate?: number;
}

/**
 * Input for creating a payment order
 */
export interface CreatePaymentOrderInput {
  /** Unique loan identifier */
  loanId: string;
  /** EMI schedule entry ID */
  emiId: string;
  /** EMI number (1, 2, 3, etc.) */
  emiNumber: number;
  /** Customer user ID */
  customerId: string;
  /** Request ID associated with the loan */
  requestId: string;
  /** Amount breakdown */
  amount: PaymentAmountBreakdown;
  /** Currency code (default: INR) */
  currency?: string;
  /** Customer details for payment gateway */
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  /** Additional metadata */
  metadata?: Record<string, string>;
}

/**
 * Result of creating a payment order
 */
export interface CreatePaymentOrderResult {
  /** Whether order creation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Provider-specific order ID (e.g., Razorpay order_id) */
  providerOrderId?: string;
  /** Internal payment order ID */
  paymentOrderId?: string;
  /** Amount in smallest currency unit (paise for INR) */
  amountInSmallestUnit?: number;
  /** Currency code */
  currency?: string;
  /** Order expiry timestamp */
  expiresAt?: Date;
  /** Any provider-specific data to pass to frontend */
  providerData?: Record<string, unknown>;
}

// ============================================
// PAYMENT VERIFICATION TYPES
// ============================================

/**
 * Input for verifying a payment (frontend callback)
 */
export interface VerifyPaymentInput {
  /** Provider order ID */
  providerOrderId: string;
  /** Provider payment ID */
  providerPaymentId: string;
  /** Provider signature for verification */
  providerSignature?: string;
}

/**
 * Result of payment verification
 */
export interface VerifyPaymentResult {
  /** Whether verification was successful */
  success: boolean;
  /** Whether the payment is valid */
  isValid: boolean;
  /** Error message if failed */
  error?: string;
  /** Provider payment ID */
  providerPaymentId?: string;
}

// ============================================
// WEBHOOK TYPES
// ============================================

/**
 * Webhook event types from payment providers
 */
export type WebhookEventType =
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.authorized'
  | 'order.paid'
  | 'refund.created'
  | 'refund.processed'
  | 'refund.failed';

/**
 * Parsed webhook payload
 */
export interface WebhookPayload {
  /** Event type */
  event: WebhookEventType;
  /** Order ID from provider */
  orderId?: string;
  /** Payment ID from provider */
  paymentId?: string;
  /** Amount in smallest unit */
  amount?: number;
  /** Payment method used */
  paymentMethod?: string;
  /** Error code if payment failed */
  errorCode?: string;
  /** Error description if payment failed */
  errorDescription?: string;
  /** Notes/metadata attached to payment */
  notes?: Record<string, string>;
  /** Raw payload from provider */
  rawPayload: unknown;
}

// ============================================
// FETCH PAYMENT TYPES
// ============================================

/**
 * Input for fetching payment details
 */
export interface FetchPaymentInput {
  /** Provider payment ID */
  providerPaymentId: string;
}

/**
 * Result of fetching payment details
 */
export interface FetchPaymentResult {
  /** Whether fetch was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Payment ID from provider */
  paymentId?: string;
  /** Order ID from provider */
  orderId?: string;
  /** Amount in smallest unit */
  amount?: number;
  /** Currency code */
  currency?: string;
  /** Payment status */
  status?: string;
  /** Payment method used */
  method?: string;
  /** Error code if payment failed */
  errorCode?: string;
  /** Error description if payment failed */
  errorDescription?: string;
  /** Notes/metadata attached to payment */
  notes?: Record<string, string>;
  /** Email used for payment */
  email?: string;
  /** Contact/phone used for payment */
  contact?: string;
  /** Raw payment data from provider */
  rawData?: unknown;
}

// ============================================
// REFUND TYPES
// ============================================

/**
 * Input for initiating a refund
 */
export interface RefundInput {
  /** Provider payment ID to refund */
  providerPaymentId: string;
  /** Amount to refund (in smallest unit) */
  amount: number;
  /** Reason for refund */
  reason: string;
  /** Additional notes */
  notes?: Record<string, string>;
}

/**
 * Result of refund initiation
 */
export interface RefundResult {
  /** Whether refund was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Provider refund ID */
  providerRefundId?: string;
  /** Refund status */
  status?: 'pending' | 'processed' | 'failed';
  /** Amount refunded */
  amountRefunded?: number;
}

// ============================================
// MANUAL PAYMENT TYPES
// ============================================

/**
 * Manual payment methods
 */
export enum ManualPaymentMethod {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
}

/**
 * Input for recording a manual payment
 */
export interface RecordManualPaymentInput {
  /** Loan ID */
  loanId: string;
  /** EMI ID */
  emiId: string;
  /** Amount received */
  amount: number;
  /** Payment method */
  method: ManualPaymentMethod;
  /** Reference number (cheque number, UTR, etc.) */
  referenceNumber?: string;
  /** ID of user who collected the payment */
  collectedBy: string;
  /** Notes */
  notes?: string;
  /** Date of collection (defaults to now) */
  collectionDate?: Date;
}

/**
 * Result of recording a manual payment
 */
export interface RecordManualPaymentResult {
  /** Whether recording was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Internal payment ID */
  paymentId?: string;
  /** Status of the payment */
  status?: 'pending_verification' | 'verified' | 'rejected';
}

// ============================================
// PAYMENT PROVIDER INTERFACE
// ============================================

/**
 * Payment Provider Interface
 * 
 * All payment providers must implement this interface.
 * This enables switching between providers (Razorpay, Stripe, etc.)
 * without changing business logic.
 */
export interface IPaymentProvider {
  /** Provider type identifier */
  readonly type: PaymentProviderType;
  
  /** Provider display name */
  readonly name: string;
  
  /** Whether provider is configured and ready */
  isConfigured(): boolean;

  /**
   * Create a payment order
   */
  createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult>;

  /**
   * Verify payment signature (for frontend callback)
   */
  verifyPayment?(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature?(payload: string, signature: string): boolean;

  /**
   * Parse webhook payload
   */
  parseWebhookPayload?(rawPayload: unknown): WebhookPayload;

  /**
   * Initiate refund
   */
  refund?(input: RefundInput): Promise<RefundResult>;

  /**
   * Fetch payment details from provider
   */
  fetchPayment?(input: FetchPaymentInput): Promise<FetchPaymentResult>;
}

// ============================================
// PAYMENT SERVICE TYPES
// ============================================

/**
 * Payment service configuration
 */
export interface PaymentServiceConfig {
  /** Default provider to use */
  defaultProvider: PaymentProviderType;
  /** Provider-specific configurations */
  providers: {
    razorpay?: {
      keyId: string;
      keySecret: string;
      webhookSecret?: string;
    };
    stripe?: {
      secretKey: string;
      webhookSecret?: string;
    };
    manual?: {
      enabled: boolean;
      allowedMethods: ManualPaymentMethod[];
    };
  };
}

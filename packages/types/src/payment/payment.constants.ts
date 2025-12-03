/**
 * Payment constants
 * @module payment/payment.constants
 */

// ============================================
// PAYMENT METHOD
// ============================================

export enum PAYMENT_METHOD {
  RAZORPAY = 'RAZORPAY',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  CARD = 'CARD',
}

// ============================================
// PAYMENT STATUS
// ============================================

export enum PAYMENT_STATUS {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ============================================
// PAYMENT TYPE
// ============================================

export enum PAYMENT_TYPE {
  EMI = 'EMI',
  ADVANCE = 'ADVANCE',
  LATE_FEE = 'LATE_FEE',
}

// ============================================
// PAYMENT ORDER STATUS
// ============================================

export enum PAYMENT_ORDER_STATUS {
  CREATED = 'CREATED',
  ATTEMPTED = 'ATTEMPTED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

// ============================================
// RAZORPAY CONFIGURATION
// ============================================

/** Razorpay order expiry time in minutes */
export const RAZORPAY_ORDER_EXPIRY_MINUTES = 30;

/** Razorpay webhook event types */
export enum RAZORPAY_WEBHOOK_EVENT {
  PAYMENT_CAPTURED = 'payment.captured',
  PAYMENT_AUTHORIZED = 'payment.authorized',
  PAYMENT_FAILED = 'payment.failed',
  ORDER_PAID = 'order.paid',
  REFUND_CREATED = 'refund.created',
}

// ============================================
// PAYMENT PROCESSING CONFIG
// ============================================

export const PAYMENT_PROCESSING_CONFIG = {
  /** Maximum retry attempts for webhook processing */
  MAX_WEBHOOK_RETRIES: 5,
  /** Webhook retry delay in milliseconds (exponential backoff base) */
  WEBHOOK_RETRY_BASE_DELAY_MS: 1000,
  /** Order expiry check buffer in minutes */
  ORDER_EXPIRY_BUFFER_MINUTES: 5,
} as const;

// ============================================
// EMI PAYMENT AVAILABILITY
// ============================================

export enum EMI_PAYMENT_AVAILABILITY {
  /** EMI can be paid normally */
  AVAILABLE = 'AVAILABLE',
  /** EMI already paid */
  PAID = 'PAID',
  /** EMI has penalties accumulated (can still be paid) */
  AVAILABLE_WITH_PENALTY = 'AVAILABLE_WITH_PENALTY',
}

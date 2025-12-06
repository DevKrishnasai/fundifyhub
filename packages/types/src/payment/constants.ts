// ============================================
// RAZORPAY CONFIGURATION
// ============================================

/** Razorpay order expiry time in minutes */
export const RAZORPAY_ORDER_EXPIRY_MINUTES = 30;

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

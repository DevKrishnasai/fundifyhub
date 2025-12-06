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
// RAZORPAY WEBHOOK EVENTS
// ============================================

export enum RAZORPAY_WEBHOOK_EVENT {
  PAYMENT_CAPTURED = 'payment.captured',
  PAYMENT_AUTHORIZED = 'payment.authorized',
  PAYMENT_FAILED = 'payment.failed',
  ORDER_PAID = 'order.paid',
  REFUND_CREATED = 'refund.created',
}

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

// ============================================
// TRANSFER METHOD
// ============================================

export enum TRANSFER_METHOD {
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
}

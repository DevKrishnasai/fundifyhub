/**
 * Payment-related constants and enums
 * Aligned with Prisma schema
 */

export enum PaymentOrderStatus {
  CREATED = 'CREATED',
  ATTEMPTED = 'ATTEMPTED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export const PAYMENT_ORDER_STATUSES = Object.values(PaymentOrderStatus);

export const PAYMENT_TYPES = {
  EMI: 'EMI',
  PENALTY: 'PENALTY',
  LATE_FEE: 'LATE_FEE',
  FULL_SETTLEMENT: 'FULL_SETTLEMENT',
  PARTIAL: 'PARTIAL',
} as const;

export const PAYMENT_METHODS = {
  RAZORPAY: 'RAZORPAY',
  CASH: 'CASH',
  CHEQUE: 'CHEQUE',
  BANK_TRANSFER: 'BANK_TRANSFER',
  UPI: 'UPI',
} as const;

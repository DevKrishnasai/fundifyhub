import { Loan, EMISchedule } from '../loan/models';

// ============================================
// PAYMENT TYPE
// ============================================

export interface Payment {
  id: string;
  loanId: string;
  requestId: string;
  emiScheduleId: string | null;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  paymentReference: string;
  paidDate: Date;
  processedBy: string;
  remarks: string | null;
  receiptPath: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  loan?: Loan;
  request?: unknown;
  emiSchedule?: EMISchedule | null;
}

// ============================================
// PAYMENT ORDER TYPE (Razorpay)
// ============================================

export interface PaymentOrder {
  id: string;
  razorpayOrderId: string;
  loanId: string;
  requestId: string;
  emiScheduleId: string;
  customerId: string;

  // Amount breakdown (in INR)
  emiAmount: number;
  penalty: number;
  totalAmount: number;

  // Status tracking
  status: string;
  attempts: number;
  lastAttemptAt: Date | null;

  // Payment details (populated after success)
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  paymentMethod: string | null;
  paidAt: Date | null;

  // Failure tracking
  failureReason: string | null;
  failureCode: string | null;

  // Metadata
  notes: Record<string, unknown> | null;
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  loan?: Loan;
  request?: unknown;
  emiSchedule?: EMISchedule;
}

// ============================================
// PAYMENT METADATA TYPES
// ============================================

export interface PaymentInitiatedMetadata {
  paymentOrderId: string;
  razorpayOrderId: string;
  emiId: string;
  emiNumber: number;
  emiAmount: number;
  penalty: number;
  totalAmount: number;
  initiatedBy: string;
}

export interface PaymentSuccessMetadata {
  paymentOrderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  emiId: string;
  emiNumber: number;
  amountPaid: number;
  penalty: number;
  paymentMethod?: string | null;
  paidAt: string;
}

export interface PaymentFailedMetadata {
  paymentOrderId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  emiId: string;
  emiNumber: number;
  attemptedAmount: number;
  failureReason?: string | null;
  failureCode?: string | null;
  failedAt: string;
}

export interface PaymentExpiredMetadata {
  paymentOrderId: string;
  razorpayOrderId: string;
  emiId: string;
  emiNumber: number;
  totalAmount: number;
  expiredAt: string;
}

// Aliases
export type PaymentType = Payment;
export type PaymentOrderType = PaymentOrder;

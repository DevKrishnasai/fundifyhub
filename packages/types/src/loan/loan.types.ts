/**
 * Loan, EMI, and payment types
 * @module loan/loan.types
 */

// ============================================
// LOAN TYPE
// ============================================

export interface LoanType {
  id: string;
  loanNumber: string;
  requestId: string;

  // Fixed Loan Terms
  approvedAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;

  // Calculated Totals
  totalInterest: number;
  totalAmount: number;

  // Loan Status & Dates
  status: string;
  approvedDate: Date;
  disbursedDate: Date | null;
  firstEMIDate: Date;
  lastEMIDate: Date;

  // Payment Tracking
  totalPaidAmount: number;
  remainingAmount: number;
  paidEMIs: number;
  remainingEMIs: number;
  overdueEMIs: number;

  // Transfer Details
  transferMethod: string | null;
  transferReference: string | null;
  transferProof: string | null;

  // Closure Details
  closedDate: Date | null;
  closureType: string | null;

  createdAt: Date;
  updatedAt: Date;

  // Relations (forward declarations to avoid circular deps)
  request?: unknown;
  emisSchedule?: EMIScheduleType[];
  payments?: PaymentType[];
  paymentOrders?: PaymentOrderType[];
}

// ============================================
// EMI SCHEDULE TYPE
// ============================================

export interface EMIScheduleType {
  id: string;
  loanId: string;
  requestId: string;
  emiNumber: number;
  dueDate: Date;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  status: string;
  paidDate: Date | null;
  paidAmount: number | null;
  lateFee: number;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  loan?: LoanType;
  request?: unknown;
  payments?: PaymentType[];
  paymentOrders?: PaymentOrderType[];
}

// ============================================
// PAYMENT TYPE
// ============================================

export interface PaymentType {
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
  loan?: LoanType;
  request?: unknown;
  emiSchedule?: EMIScheduleType | null;
}

// ============================================
// PAYMENT ORDER TYPE (Razorpay)
// ============================================

export interface PaymentOrderType {
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
  loan?: LoanType;
  request?: unknown;
  emiSchedule?: EMIScheduleType;
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

export interface EMIOverdueMetadata {
  emiId: string;
  emiNumber: number;
  emiAmount: number;
  dueDate: string;
  daysOverdue: number;
  lateFee: number;
  previousStatus: string;
}

export interface EMIPenaltyAppliedMetadata {
  emiId: string;
  emiNumber: number;
  penaltyAmount: number;
  penaltyType: string;
  daysLate: number;
  calculatedAt: string;
}

export interface LoanDefaultedMetadata {
  loanId: string;
  overdueEmiCount: number;
  totalOverdueAmount: number;
  defaultedAt: string;
}

export interface LoanCompletedMetadata {
  loanId: string;
  totalPaidAmount: number;
  totalEmisPaid: number;
  completedAt: string;
}

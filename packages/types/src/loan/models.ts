import { PaymentOrder, Payment } from '../payment/models';

/**
 * Loan, EMI types
 */

// ============================================
// LOAN TYPE
// ============================================

export interface Loan {
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
  emisSchedule?: EMISchedule[];
  payments?: Payment[];
  paymentOrders?: PaymentOrder[];
}

// ============================================
// EMI SCHEDULE TYPE
// ============================================

export interface EMISchedule {
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
  loan?: Loan;
  request?: unknown;
  payments?: Payment[];
  paymentOrders?: PaymentOrder[];
}

export interface AdminEmiScheduleSnapshot {
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  emiSchedule: {
    emiNumber: number;
    dueDate: Date;
    emiAmount: number;
    principalAmount: number;
    interestAmount: number;
  }[];
}

export interface NormalizedEmiData {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  emiSchedule: {
    installment: number;
    paymentDate: Date;
    paymentAmount: number;
    principal: number;
    interest: number;
  }[];
}

export interface EMIWithBreakdown {
  principalAmount: number;
  interestRate: number;
  tenure: number;
  monthlyEMI: number;
  totalAmount: number;
  totalInterest: number;
  schedule: {
    month: number;
    principalPaid: number;
    interestPaid: number;
    totalPaid: number;
    outstandingBalance: number;
  }[];
}

export function isAdminEmiScheduleSnapshot(obj: any): obj is AdminEmiScheduleSnapshot {
  return obj && typeof obj === 'object' && 'emiSchedule' in obj && Array.isArray(obj.emiSchedule);
}

// Aliases for backward compatibility
export type LoanType = Loan;
export type EMIScheduleType = EMISchedule;
// PaymentType/PaymentOrderType are now imported from payment/models but we can re-export aliases if needed
// But better to rely on imports from payment directly in consumers.
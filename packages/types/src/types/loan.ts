/**
 * Loan-related types
 */

import type { LoanStatus } from '../constants/loan';

export interface LoanSummary {
  id: string;
  loanNumber: string;
  requestId: string;
  approvedAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  status: LoanStatus;
  approvedDate: Date | string;
  disbursedDate?: Date | string | null;
  totalPaidAmount: number;
  remainingAmount: number;
  paidEMIs: number;
  remainingEMIs: number;
  overdueEMIs: number;
}

export interface LoanDetail extends LoanSummary {
  totalInterest: number;
  totalAmount: number;
  firstEMIDate: Date | string;
  lastEMIDate: Date | string;
  transferMethod?: string | null;
  transferReference?: string | null;
  transferProof?: string | null;
  closedDate?: Date | string | null;
  closureType?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

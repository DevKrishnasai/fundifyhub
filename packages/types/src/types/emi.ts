/**
 * EMI-related types
 */

import type { EMIStatus } from '../constants/emi';

export interface EMIScheduleDTO {
  id: string;
  loanId: string;
  requestId: string;
  emiNumber: number;
  dueDate: Date | string;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  status: EMIStatus;
  paidDate?: Date | string | null;
  paidAmount?: number | null;
  lateFee: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EMIBreakdown {
  emiAmount: number;
  principal: number;
  interest: number;
  penalty: number;
  daysLate: number;
  totalDue: number;
}

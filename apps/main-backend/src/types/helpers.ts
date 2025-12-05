/**
 * Helper functions for type conversions and guards
 */

import type { EMICalcResult } from '@fundifyhub/utils';
import type { AdminEmiScheduleSnapshot, NormalizedEmiData } from '@fundifyhub/types';

/**
 * Convert AdminEmiScheduleSnapshot to NormalizedEmiData
 */
export function normalizeAdminSnapshot(snapshot: AdminEmiScheduleSnapshot): NormalizedEmiData {
  return {
    monthlyPayment: snapshot.monthlyPayment,
    totalInterest: snapshot.totalInterest,
    totalPayment: snapshot.totalAmount,
    emiSchedule: snapshot.emiSchedule.map(emi => ({
      installment: emi.emiNumber,
      paymentDate: emi.dueDate,
      paymentAmount: emi.emiAmount,
      principal: emi.principalAmount,
      interest: emi.interestAmount,
    })),
  };
}

/**
 * Convert EMICalcResult to NormalizedEmiData
 */
export function normalizeEmiCalcResult(result: EMICalcResult): NormalizedEmiData {
  return {
    monthlyPayment: result.monthlyPayment,
    totalInterest: result.totalInterest,
    totalPayment: result.totalPayment,
    emiSchedule: result.emiSchedule.map(emi => ({
      installment: emi.installment,
      paymentDate: emi.paymentDate,
      paymentAmount: emi.paymentAmount,
      principal: emi.principal,
      interest: emi.interest,
    })),
  };
}

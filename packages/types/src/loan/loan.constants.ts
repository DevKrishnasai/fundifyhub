/**
 * Loan, EMI, and payment constants
 * @module loan/loan.constants
 */

// ============================================
// LOAN STATUS
// ============================================

export enum LOAN_STATUS {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DEFAULTED = 'DEFAULTED',
}

// ============================================
// EMI STATUS
// ============================================

export enum EMI_STATUS {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  DEFAULTED = 'DEFAULTED',
}

// ============================================
// PENALTY CONFIGURATION
// ============================================

/** Late fee starts from day 1 (no grace period for daily charges) */
export const LATE_FEE_GRACE_PERIOD_DAYS = 0;

/** Grace period before marking as overdue penalty */
export const OVERDUE_GRACE_PERIOD_DAYS = 30;

/** Default penalty percentage for late payment */
export const DEFAULT_PENALTY_PERCENTAGE = 4;

/** Default late fee percentage per day */
export const DEFAULT_LATE_FEE_PERCENTAGE = 0.01;

// ============================================
// LOAN CONFIGURATION
// ============================================

export const DAYS_PER_MONTH = 30;
export const LATE_FEE_RATE = 0.01; // 1% per day

export enum CLOSURE_TYPE {
  REGULAR = 'REGULAR',
  FORECLOSURE = 'FORECLOSURE',
  SETTLEMENT = 'SETTLEMENT',
  WRITE_OFF = 'WRITE_OFF',
}

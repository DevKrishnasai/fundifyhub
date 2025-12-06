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

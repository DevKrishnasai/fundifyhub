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

export enum CLOSURE_TYPE {
  REGULAR = 'REGULAR',
  FORECLOSURE = 'FORECLOSURE',
  SETTLEMENT = 'SETTLEMENT',
  WRITE_OFF = 'WRITE_OFF',
}

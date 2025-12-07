/**
 * Loan-related constants and enums
 * Aligned with Prisma schema
 */

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DEFAULTED = 'DEFAULTED',
}

export const LOAN_STATUSES = Object.values(LoanStatus);

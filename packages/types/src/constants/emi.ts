/**
 * EMI-related constants and enums
 * Aligned with Prisma schema
 */

export enum EMIStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  DEFAULTED = 'DEFAULTED',
}

export const EMI_STATUSES = Object.values(EMIStatus);

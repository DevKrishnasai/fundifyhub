/**
 * Zod schemas for Loan domain
 */
import { z } from 'zod';
import { paymentSchema } from '../payment/schemas';

export const emiScheduleSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  requestId: z.string(),
  emiNumber: z.number(),
  dueDate: z.union([z.string(), z.date()]),
  emiAmount: z.number(),
  principalAmount: z.number(),
  interestAmount: z.number(),
  status: z.string(),
  paidDate: z.union([z.string(), z.date()]).nullable(),
  paidAmount: z.number().nullable(),
  lateFee: z.number(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  
  // Relations
  payments: z.array(paymentSchema).optional(),
});

export const loanSchema = z.object({
  id: z.string(),
  loanNumber: z.string(),
  requestId: z.string(),

  // Fixed Loan Terms
  approvedAmount: z.number(),
  interestRate: z.number(),
  tenureMonths: z.number(),
  emiAmount: z.number(),

  // Calculated Totals
  totalInterest: z.number(),
  totalAmount: z.number(),

  // Loan Status & Dates
  status: z.string(),
  approvedDate: z.union([z.string(), z.date()]),
  disbursedDate: z.union([z.string(), z.date()]).nullable(),
  firstEMIDate: z.union([z.string(), z.date()]),
  lastEMIDate: z.union([z.string(), z.date()]),

  // Payment Tracking
  totalPaidAmount: z.number(),
  remainingAmount: z.number(),
  paidEMIs: z.number(),
  remainingEMIs: z.number(),
  overdueEMIs: z.number(),

  // Transfer Details
  transferMethod: z.string().nullable(),
  transferReference: z.string().nullable(),
  transferProof: z.string().nullable(),

  // Closure Details
  closedDate: z.union([z.string(), z.date()]).nullable(),
  closureType: z.string().nullable(),

  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),

  // Relations
  emisSchedule: z.array(emiScheduleSchema).optional(),
  payments: z.array(paymentSchema).optional(),
  request: z.any().optional(), // Avoid circular dependency for now
});

// List Response Schema
export const loanListResponseSchema = z.object({
  loans: z.array(loanSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type LoanSchema = z.infer<typeof loanSchema>;
export type EMIScheduleSchema = z.infer<typeof emiScheduleSchema>;
export type LoanListResponse = z.infer<typeof loanListResponseSchema>;
/**
 * Loan validation schemas
 */

import { z } from 'zod';

export const CreateLoanFromRequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID required'),
  approvedAmount: z.number().positive('Amount must be positive'),
  interestRate: z.number().positive().max(100, 'Interest rate must be <= 100%'),
  tenureMonths: z.number().int().positive().min(1).max(120),
  emiAmount: z.number().positive(),
  totalInterest: z.number().positive(),
  totalAmount: z.number().positive(),
  firstEMIDate: z.string().datetime(),
  transferMethod: z.string().optional(),
  transferReference: z.string().optional(),
});

export type CreateLoanFromRequestInput = z.infer<typeof CreateLoanFromRequestSchema>;

export const DisburseLoanSchema = z.object({
  disbursedDate: z.string().datetime(),
  transferMethod: z.string().min(1, 'Transfer method required'),
  transferReference: z.string().min(1, 'Transfer reference required'),
  transferProof: z.string().optional(),
});

export type DisburseLoanInput = z.infer<typeof DisburseLoanSchema>;

export const CloseLoanSchema = z.object({
  closureType: z.enum(['FULL_SETTLEMENT', 'FORECLOSURE', 'DEFAULT']),
  closedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export type CloseLoanInput = z.infer<typeof CloseLoanSchema>;

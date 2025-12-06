import { z } from 'zod';
import { PAYMENT_METHOD } from './enums';

export const paymentSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  requestId: z.string(),
  emiScheduleId: z.string().nullable(),
  amount: z.number(),
  paymentType: z.string(),
  paymentMethod: z.string(),
  paymentReference: z.string(),
  paidDate: z.union([z.string(), z.date()]),
  processedBy: z.string(),
  remarks: z.string().nullable(),
  status: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PAYMENT_METHOD),
  paymentReference: z.string(),
  remarks: z.string().optional(),
  emiScheduleId: z.string().optional(),
});

export type PaymentSchema = z.infer<typeof paymentSchema>;
export type RecordPaymentPayload = z.infer<typeof recordPaymentSchema>;

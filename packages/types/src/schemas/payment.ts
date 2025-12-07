/**
 * Payment validation schemas
 */

import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  loanId: z.string().min(1, 'Loan ID required'),
  requestId: z.string().min(1, 'Request ID required'),
  emiScheduleId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  paymentType: z.string().default('EMI'),
  paymentMethod: z.string().min(1, 'Payment method required'),
  paymentReference: z.string().min(1, 'Payment reference required'),
  remarks: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export const CreatePaymentOrderSchema = z.object({
  loanId: z.string().min(1, 'Loan ID required'),
  emiScheduleId: z.string().min(1, 'EMI schedule ID required'),
});

export type CreatePaymentOrderPayload = z.infer<typeof CreatePaymentOrderSchema>;

export const VerifyRazorpayPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'Razorpay order ID required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature required'),
});

export type VerifyRazorpayPaymentInput = z.infer<typeof VerifyRazorpayPaymentSchema>;

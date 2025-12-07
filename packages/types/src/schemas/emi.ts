/**
 * EMI validation schemas
 */

import { z } from 'zod';

export const RecordEMIPaymentSchema = z.object({
  emiScheduleId: z.string().min(1, 'EMI schedule ID required'),
  paidAmount: z.number().positive('Paid amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method required'),
  paymentReference: z.string().min(1, 'Payment reference required'),
  paidDate: z.string().datetime().optional(),
  remarks: z.string().optional(),
});

export type RecordEMIPaymentInput = z.infer<typeof RecordEMIPaymentSchema>;

/**
 * Payments Validators
 * 
 * Zod schemas for validating payment-related requests.
 * 
 * @module domain/payments/validators
 */

import { z } from 'zod';

/**
 * Create payment order input validation
 */
export const createPaymentOrderSchema = z.object({
  emiId: z.string().min(1, 'EMI ID is required'),
  amount: z.number().positive('Amount must be positive'),
});

/**
 * Verify payment input validation
 */
export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
});

/**
 * Razorpay webhook validation
 */
export const razorpayWebhookSchema = z.object({
  event: z.string(),
  payload: z.record(z.string(), z.any()),
});

/**
 * Payment-related types
 */

import type { PaymentOrderStatus } from '../constants/payment';

export interface PaymentDTO {
  id: string;
  loanId: string;
  requestId: string;
  emiScheduleId?: string | null;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  paymentReference: string;
  paidDate: Date | string;
  processedBy: string;
  remarks?: string | null;
  receiptPath?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PaymentOrderDTO {
  id: string;
  razorpayOrderId: string;
  loanId: string;
  requestId: string;
  emiScheduleId: string;
  customerId: string;
  emiAmount: number;
  penalty: number;
  totalAmount: number;
  status: PaymentOrderStatus;
  attempts: number;
  lastAttemptAt?: Date | string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  paymentMethod?: string | null;
  paidAt?: Date | string | null;
  failureReason?: string | null;
  failureCode?: string | null;
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

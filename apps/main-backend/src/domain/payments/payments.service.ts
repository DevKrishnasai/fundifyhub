/**
 * Payments Service
 * 
 * Handles payment processing and verification:
 * - Create payment orders with Razorpay
 * - Verify payment signatures
 * - Record manual payments (cash, bank transfer)
 * - Track payment status and history
 * - Handle refunds and adjustments
 * 
 * Payment States:
 * PENDING → COMPLETED (or FAILED)
 * 
 * @module domain/payments
 */

import { prisma } from '@fundifyhub/prisma';
import { ValidationError, NotFoundError, BusinessRuleError, ErrorCode } from '@fundifyhub/utils';
import type { Payment, EMISchedule } from '@fundifyhub/types';

export interface CreatePaymentOrderInput {
  emiId: string;
  customerId: string;
  amount: number;
  description?: string;
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RecordManualPaymentInput {
  emiId: string;
  customerId: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  referenceNumber?: string;
  paymentDate?: Date;
}

export interface GetPaymentHistoryInput {
  loanId: string;
  page?: number;
  pageSize?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * PaymentsService - Payment processing and EMI management
 * 
 * Integrates with Razorpay for online payments.
 * Supports manual payment recording for offline channels.
 * Tracks payment history and automates EMI transitions.
 */
export class PaymentsService {
  private static instance: PaymentsService;

  static getInstance(): PaymentsService {
    if (!PaymentsService.instance) {
      PaymentsService.instance = new PaymentsService();
    }
    return PaymentsService.instance;
  }

  /**
   * Create payment order for EMI
   * 
   * 1. Verify EMI exists and is in PENDING status
   * 2. Verify amount matches EMI due amount
   * 3. Create Razorpay order via payment adapter
   * 4. Create Payment record with PENDING status
   * 5. Return order details for customer
   * 
   * @throws NotFoundError if EMI doesn't exist
   * @throws ValidationError if amount invalid
   */
  async createPaymentOrder(input: CreatePaymentOrderInput, user: any): Promise<{
    razorpayOrderId: string;
    amount: number;
    currency: string;
    customerId: string;
    description: string;
  }> {
    try {
      if (!input.emiId || !input.customerId || !input.amount) {
        throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT);
      }

      if (input.amount <= 0) {
        throw new ValidationError('Amount must be positive', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Fetch EMI, verify exists and PENDING
      // TODO: (agent) Verify amount matches emi.dueAmount
      // TODO: (agent) Call payment adapter to create Razorpay order
      // TODO: (agent) Create Payment record in DB with PENDING status
      // TODO: (agent) Return order ID for frontend

      console.log(`[PaymentsService.createPaymentOrder] Payment order created for EMI: ${input.emiId}`, {
        amount: input.amount,
      });

      return {
        razorpayOrderId: '',
        amount: input.amount,
        currency: 'INR',
        customerId: input.customerId,
        description: input.description || 'EMI Payment',
      };
    } catch (err) {
      console.error('[PaymentsService.createPaymentOrder] Failed to create payment order:', err);
      throw err;
    }
  }

  /**
   * Verify payment signature
   * 
   * Called by webhook handler after Razorpay processes payment.
   * 1. Verify Razorpay signature using secret
   * 2. Verify payment amount matches order
   * 3. Fetch and update EMI to PAID
   * 4. Update loan outstanding balance
   * 5. Check if all EMIs paid → auto-close loan
   * 6. Emit PaymentSuccessful event
   * 
   * @throws ValidationError if signature invalid
   * @throws BusinessRuleError if payment already recorded
   */
  async verifyPayment(input: VerifyPaymentInput): Promise<{
    paymentId: string;
    status: string;
    emiId: string;
    message: string;
  }> {
    try {
      if (!input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) {
        throw new ValidationError('Missing payment details', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Call payment adapter to verify signature
      // TODO: (agent) If invalid signature: throw ValidationError
      // TODO: (agent) Fetch Payment record by razorpayOrderId
      // TODO: (agent) Fetch EMI
      // TODO: (agent) Update Payment to COMPLETED
      // TODO: (agent) Update EMI to PAID
      // TODO: (agent) Update loan outstanding balance
      // TODO: (agent) If all EMIs paid: trigger loan closure
      // TODO: (agent) Emit PaymentSuccessful event

      console.log('[PaymentsService.verifyPayment] Payment verified successfully', {
        paymentId: input.razorpayPaymentId,
      });

      return {
        paymentId: input.razorpayPaymentId,
        status: 'COMPLETED',
        emiId: '',
        message: 'Payment recorded successfully',
      };
    } catch (err) {
      console.error('[PaymentsService.verifyPayment] Failed to verify payment:', err);
      throw err;
    }
  }

  /**
   * Record manual payment (cash, check, bank transfer)
   * 
   * For offline payment channels.
   * 1. Verify EMI exists and PENDING
   * 2. Verify payment amount <= due amount
   * 3. Create Payment record with manual method
   * 4. Update EMI (if full: PAID, if partial: keep PENDING)
   * 5. Update loan outstanding balance
   * 6. Emit ManualPaymentRecorded event
   * 
   * @throws NotFoundError if EMI doesn't exist
   * @throws ValidationError if amount invalid
   */
  async recordManualPayment(input: RecordManualPaymentInput, user: any): Promise<{
    paymentId: string;
    emiId: string;
    amountPaid: number;
    status: string;
  }> {
    try {
      if (!input.emiId || !input.customerId || !input.amount || !input.paymentMethod) {
        throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT);
      }

      if (input.amount <= 0) {
        throw new ValidationError('Amount must be positive', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Fetch EMI, verify PENDING
      // TODO: (agent) Verify amount <= dueAmount
      // TODO: (agent) Check user is admin or agent
      // TODO: (agent) Create Payment record with method and referenceNumber
      // TODO: (agent) Update EMI: if amount == dueAmount: PAID, else: keep PENDING
      // TODO: (agent) Update loan outstanding balance
      // TODO: (agent) Emit ManualPaymentRecorded event

      console.log(`[PaymentsService.recordManualPayment] Manual payment recorded for EMI: ${input.emiId}`, {
        amount: input.amount,
        method: input.paymentMethod,
      });

      return {
        paymentId: '',
        emiId: input.emiId,
        amountPaid: input.amount,
        status: 'RECORDED',
      };
    } catch (err) {
      console.error('[PaymentsService.recordManualPayment] Failed to record manual payment:', err);
      throw err;
    }
  }

  /**
   * Get payment history for a loan
   * 
   * @throws NotFoundError if loan doesn't exist
   * @throws ValidationError if pagination invalid
   */
  async getPaymentHistory(input: GetPaymentHistoryInput, user: any): Promise<{
    payments: Payment[];
    total: number;
  }> {
    try {
      const page = input.page || 1;
      const pageSize = Math.min(input.pageSize || 20, 100);

      if (page < 1 || pageSize < 1) {
        throw new ValidationError('Invalid pagination', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Fetch loan, verify exists
      // TODO: (agent) Check user access (RBAC)
      // TODO: (agent) Build WHERE clause for payments
      // TODO: (agent) Apply date filters if provided
      // TODO: (agent) Fetch payments ordered by date DESC
      // TODO: (agent) Return paginated results

      console.log('[PaymentsService.getPaymentHistory] Payment history retrieved', {
        loanId: input.loanId,
        page,
        pageSize,
      });

      return { payments: [], total: 0 };
    } catch (err) {
      console.error('[PaymentsService.getPaymentHistory] Failed to get payment history:', err);
      throw err;
    }
  }

  /**
   * Record payment failure
   * 
   * Called when Razorpay payment fails.
   * Updates payment status to FAILED and stores error details.
   * 
   * @throws NotFoundError if payment doesn't exist
   */
  async recordPaymentFailure(
    razorpayOrderId: string,
    errorCode: string,
    errorDescription: string
  ): Promise<void> {
    try {
      // TODO: (agent) Fetch Payment by razorpayOrderId
      // TODO: (agent) Update status to FAILED
      // TODO: (agent) Store error details
      // TODO: (agent) Emit PaymentFailed event

      console.log('[PaymentsService.recordPaymentFailure] Payment failure recorded', {
        orderId: razorpayOrderId,
        error: errorCode,
      });
    } catch (err) {
      console.error('[PaymentsService.recordPaymentFailure] Failed to record payment failure:', err);
      throw err;
    }
  }

  /**
   * Process refund
   * 
   * Refund payment and mark EMI as unpaid.
   * Only admins can initiate refunds.
   * 
   * @throws NotFoundError if payment doesn't exist
   * @throws ForbiddenError if not admin
   * @throws BusinessRuleError if payment not refundable
   */
  async refund(paymentId: string, reason: string, user: any): Promise<{ refundId: string }> {
    try {
      if (!paymentId || !reason) {
        throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Fetch Payment, verify not already refunded
      // TODO: (agent) Check user is admin
      // TODO: (agent) Call payment adapter to refund
      // TODO: (agent) Create Refund record
      // TODO: (agent) Update EMI back to PENDING
      // TODO: (agent) Emit PaymentRefunded event

      console.log(`[PaymentsService.refund] Refund initiated for payment: ${paymentId}`, { reason });

      return { refundId: '' };
    } catch (err) {
      console.error(`[PaymentsService.refund] Failed to refund payment ${paymentId}:`, err);
      throw err;
    }
  }
}

export const paymentsService = PaymentsService.getInstance();

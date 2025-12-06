/**
 * Payments Adapter
 * 
 * Wraps Razorpay provider for payment processing.
 * Translates between domain layer and payment provider.
 * 
 * @module infra-adapters/payments
 */
import { createRazorpayProvider } from '@fundifyhub/providers';
import {
  type CreatePaymentOrderInput,
  type CreatePaymentOrderResult,
  type FetchPaymentResult,
  type RefundResult,
} from '@fundifyhub/types';
import logger from '../utils/logger';
import crypto from 'crypto';

export class PaymentAdapter {
  private razorpayKeyId: string;
  private razorpayKeySecret: string;
  private provider: ReturnType<typeof createRazorpayProvider>;

  constructor() {
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
    this.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

    if (!this.razorpayKeyId || !this.razorpayKeySecret) {
      logger.warn('[PaymentAdapter] Razorpay keys not configured');
    }

    this.provider = createRazorpayProvider({
      keyId: this.razorpayKeyId,
      keySecret: this.razorpayKeySecret,
    });

    logger.info('[PaymentAdapter] Initialized with Razorpay provider');
  }

  /**
   * Create payment order with Razorpay
   * 
   * @returns Order ID for frontend checkout
   */
  async createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    try {
      const order = await this.provider.createOrder(input);

      if (!order.success) {
        logger.error('[PaymentAdapter] Failed to create order', { error: order.error, input });
        return order;
      }

      logger.info('[PaymentAdapter] Order created', {
        orderId: order.providerOrderId,
        amount: input.amount.totalAmount,
        loanId: input.loanId,
        emiNumber: input.emiNumber,
      });
      return order;
    } catch (err) {
      logger.error('[PaymentAdapter] Failed to create order', { error: err, input });
      throw err;
    }
  }

  /**
   * Verify payment signature from Razorpay webhook
   * 
   * @returns true if signature valid, false otherwise
   */
  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    try {
      const payload = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.razorpayKeySecret)
        .update(payload)
        .digest('hex');

      const isValid = expectedSignature === signature;

      if (isValid) {
        logger.info('[PaymentAdapter] Signature verified', { orderId, paymentId });
      } else {
        logger.warn('[PaymentAdapter] Invalid signature', { orderId, paymentId });
      }

      return isValid;
    } catch (err) {
      logger.error('[PaymentAdapter] Failed to verify signature', { error: err, orderId, paymentId });
      return false;
    }
  }

  /**
   * Get payment details from Razorpay
   */
  async getPaymentDetails(paymentId: string): Promise<FetchPaymentResult> {
    try {
      const payment = await this.provider.fetchPayment({ providerPaymentId: paymentId });

      if (!payment.success) {
        logger.warn('[PaymentAdapter] Payment fetch failed', { paymentId, error: payment.error });
        return payment;
      }

      logger.info('[PaymentAdapter] Payment fetched', { paymentId, status: payment.status });
      return payment;
    } catch (err) {
      logger.error('[PaymentAdapter] Failed to fetch payment', { error: err, paymentId });
      throw err;
    }
  }

  /**
   * Refund payment
   */
  async refund(paymentId: string, amountInRupees?: number): Promise<RefundResult> {
    try {
      const refund = await this.provider.refund({
        providerPaymentId: paymentId,
        amount: amountInRupees ? Math.round(amountInRupees * 100) : 0,
        reason: 'manual-refund',
      });

      if (!refund.success) {
        logger.warn('[PaymentAdapter] Refund failed', { paymentId, error: refund.error });
        return refund;
      }

      logger.info('[PaymentAdapter] Refund initiated', {
        paymentId,
        refundId: refund.providerRefundId,
        amount: amountInRupees,
      });
      return refund;
    } catch (err) {
      logger.error('[PaymentAdapter] Failed to refund', { error: err, paymentId, amount: amountInRupees });
      throw err;
    }
  }
}

export const paymentAdapter = new PaymentAdapter();

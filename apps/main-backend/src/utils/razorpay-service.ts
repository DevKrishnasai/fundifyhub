/**
 * Simple Razorpay SDK wrapper for main-backend
 * Replaces @fundifyhub/providers/payments/razorpay
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  orderExpiryMinutes?: number;
}

export class RazorpayService {
  private razorpay: Razorpay;
  private config: RazorpayConfig;

  constructor(config: RazorpayConfig) {
    this.config = config;
    this.razorpay = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
  }

  /**
   * Check if Razorpay is configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.keyId && this.config.keySecret);
  }

  /**
   * Create a payment order
   */
  async createOrder(params: {
    loanId: string;
    emiId: string;
    emiNumber: number;
    customerId: string;
    requestId: string;
    amount: {
      emiAmount: number;
      penalty: number;
      totalAmount: number;
      principal: number;
      interest: number;
      daysLate: number;
    };
    currency: string;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    metadata: Record<string, string>;
  }) {
    try {
      const receipt = `EMI_${params.loanId}_${params.emiNumber}_${Date.now()}`;
      const amountInPaise = Math.round(params.amount.totalAmount * 100);
      
      const order = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: params.currency,
        receipt,
        notes: params.metadata,
      });

      return {
        success: true,
        providerOrderId: order.id,
        amountInSmallestUnit: order.amount,
        currency: order.currency,
        expiresAt: null, // Razorpay orders don't have built-in expiry
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Fetch payment details
   */
  async fetchPayment(params: { providerPaymentId: string }) {
    try {
      const payment = await this.razorpay.payments.fetch(params.providerPaymentId);

      return {
        success: true,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        orderId: payment.order_id,
        notes: payment.notes || {},
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify payment signature
   */
  verifySignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const { orderId, paymentId, signature } = params;
    const body = `${orderId}|${paymentId}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', this.config.keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Fetch payment details
   */
  async getPayment(paymentId: string) {
    return this.razorpay.payments.fetch(paymentId);
  }

  /**
   * Fetch order details
   */
  async getOrder(orderId: string) {
    return this.razorpay.orders.fetch(orderId);
  }

  /**
   * Create a refund
   */
  async createRefund(paymentId: string, amount?: number) {
    return this.razorpay.payments.refund(paymentId, {
      amount,
    });
  }

  /**
   * Get refund details
   */
  async getRefund(paymentId: string, refundId: string) {
    return this.razorpay.payments.fetchRefund(paymentId, refundId);
  }
}

/**
 * Create a Razorpay service instance
 */
export function createRazorpayService(config: RazorpayConfig): RazorpayService {
  return new RazorpayService(config);
}

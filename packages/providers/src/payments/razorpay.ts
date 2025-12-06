/**
 * Razorpay Payment Provider
 * 
 * Implements IPaymentProvider interface for Razorpay payment gateway.
 * Handles order creation, payment verification, webhook processing, and refunds.
 * 
 * @module providers/payments/razorpay
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import {
  IPaymentProvider,
  PaymentProviderType,
  CreatePaymentOrderInput,
  CreatePaymentOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  WebhookPayload,
  WebhookEventType,
  RefundInput,
  RefundResult,
  FetchPaymentInput,
  FetchPaymentResult,
} from '@fundifyhub/types';

/**
 * Razorpay provider configuration
 */
export interface RazorpayProviderConfig {
  /** Razorpay Key ID */
  keyId: string;
  /** Razorpay Key Secret */
  keySecret: string;
  /** Webhook secret for signature verification */
  webhookSecret?: string;
  /** Order expiry in minutes (default: 30) */
  orderExpiryMinutes?: number;
}

/**
 * Razorpay Payment Provider Implementation
 */
export class RazorpayProvider implements IPaymentProvider {
  public readonly type = PaymentProviderType.RAZORPAY;
  public readonly name = 'Razorpay';
  
  private readonly config: RazorpayProviderConfig;
  private readonly client: Razorpay | null;
  private readonly orderExpiryMinutes: number;

  constructor(config: RazorpayProviderConfig) {
    this.config = config;
    this.orderExpiryMinutes = config.orderExpiryMinutes ?? 30;
    
    // Initialize Razorpay client if configured
    if (config.keyId && config.keySecret) {
      this.client = new Razorpay({
        key_id: config.keyId,
        key_secret: config.keySecret,
      });
    } else {
      this.client = null;
    }
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Create a Razorpay order
   */
  async createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }

    try {
      const amountInPaise = Math.round(input.amount.totalAmount * 100);
      const currency = input.currency ?? 'INR';

      // Build receipt string (limited to 40 chars by Razorpay)
      const receipt = `EMI_${input.emiNumber}_${input.loanId.substring(0, 20)}`;

      // Create order with Razorpay
      const order = await this.client.orders.create({
        amount: amountInPaise,
        currency,
        receipt,
        notes: {
          loanId: input.loanId,
          emiId: input.emiId,
          requestId: input.requestId,
          customerId: input.customerId,
          customerEmail: input.customer.email,
          emiNumber: input.emiNumber.toString(),
          emiAmount: input.amount.emiAmount.toString(),
          penalty: input.amount.penalty.toString(),
          totalAmount: input.amount.totalAmount.toString(),
          ...input.metadata,
        },
      });

      const expiresAt = new Date(Date.now() + this.orderExpiryMinutes * 60 * 1000);

      return {
        success: true,
        providerOrderId: order.id,
        amountInSmallestUnit: amountInPaise,
        currency,
        expiresAt,
        providerData: {
          keyId: this.config.keyId,
          orderId: order.id,
          amount: amountInPaise,
          currency,
          name: 'FundifyHub',
          description: `EMI Payment #${input.emiNumber}`,
          prefill: {
            name: input.customer.name,
            email: input.customer.email,
            contact: input.customer.phone,
          },
          notes: order.notes,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error creating order';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Verify payment signature (frontend callback)
   */
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!this.config.keySecret) {
      return Promise.resolve({
        success: false,
        isValid: false,
        error: 'Razorpay key secret not configured',
      });
    }

    try {
      // Generate expected signature
      const text = `${input.providerOrderId}|${input.providerPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.config.keySecret)
        .update(text)
        .digest('hex');

      const isValid = expectedSignature === input.providerSignature;

      return Promise.resolve({
        success: true,
        isValid,
        providerPaymentId: input.providerPaymentId,
        error: isValid ? undefined : 'Invalid payment signature',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signature verification failed';
      return Promise.resolve({
        success: false,
        isValid: false,
        error: message,
      });
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch {
      return false;
    }
  }

  /**
   * Parse Razorpay webhook payload
   */
  parseWebhookPayload(rawPayload: unknown): WebhookPayload {
    const payload = rawPayload as Record<string, unknown>;
    const event = payload.event as string;
    const paymentEntity = (payload.payload as Record<string, unknown>)?.payment as Record<string, unknown>;
    const orderEntity = (payload.payload as Record<string, unknown>)?.order as Record<string, unknown>;
    const entity = (paymentEntity?.entity ?? orderEntity?.entity) as Record<string, unknown> | undefined;

    return {
      event: event as WebhookEventType,
      orderId: entity?.order_id as string | undefined,
      paymentId: entity?.id as string | undefined,
      amount: entity?.amount as number | undefined,
      paymentMethod: entity?.method as string | undefined,
      errorCode: entity?.error_code as string | undefined,
      errorDescription: entity?.error_description as string | undefined,
      notes: entity?.notes as Record<string, string> | undefined,
      rawPayload,
    };
  }

  /**
   * Initiate a refund
   */
  async refund(input: RefundInput): Promise<RefundResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }

    try {
      const refund = await this.client.payments.refund(input.providerPaymentId, {
        amount: input.amount,
        notes: {
          reason: input.reason,
          ...input.notes,
        },
      });

      return {
        success: true,
        providerRefundId: refund.id,
        status: refund.status === 'processed' ? 'processed' : 'pending',
        amountRefunded: refund.amount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Refund failed';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Fetch payment details from Razorpay
   */
  async fetchPayment(input: FetchPaymentInput): Promise<FetchPaymentResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Razorpay is not configured',
      };
    }

    try {
      const payment = await this.client.payments.fetch(input.providerPaymentId);

      // Normalize amount to number (Razorpay returns string or number)
      const amount = typeof payment.amount === 'string' 
        ? parseInt(payment.amount, 10) 
        : payment.amount;

      // Normalize method to string (Razorpay returns string or number)
      const method = payment.method != null 
        ? String(payment.method) 
        : undefined;

      // Normalize email/contact to string (Razorpay can return mixed types)
      const email = payment.email != null 
        ? String(payment.email) 
        : undefined;
      
      const contact = payment.contact != null 
        ? String(payment.contact) 
        : undefined;

      return {
        success: true,
        paymentId: payment.id,
        orderId: payment.order_id,
        amount,
        currency: payment.currency,
        status: payment.status,
        method,
        errorCode: payment.error_code ?? undefined,
        errorDescription: payment.error_description ?? undefined,
        notes: payment.notes as Record<string, string> | undefined,
        email,
        contact,
        rawData: payment,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch payment';
      return {
        success: false,
        error: message,
      };
    }
  }
}

/**
 * Create a Razorpay provider instance
 */
export function createRazorpayProvider(config: RazorpayProviderConfig): RazorpayProvider {
  return new RazorpayProvider(config);
}

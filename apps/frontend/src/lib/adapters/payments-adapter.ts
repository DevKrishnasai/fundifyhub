/**
 * Payments Adapter
 *
 * Abstraction layer for payments API calls.
 *
 * @module lib/adapters/payments
 */

import { getWithResult, postWithResult } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';
import type { PaymentType } from '@fundifyhub/types';

/**
 * Razorpay order creation payload
 */
export interface CreateRazorpayOrderPayload {
  amount: number;
  currency?: string;
  loanId?: string;
  emiScheduleId?: string;
  notes?: Record<string, string>;
}

/**
 * Razorpay order response
 */
export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string; // Razorpay key for frontend
}

/**
 * Razorpay payment verification payload
 */
export interface VerifyRazorpayPaymentPayload {
  orderId: string;
  paymentId: string;
  signature: string;
  loanId?: string;
  emiScheduleId?: string;
}

/**
 * Payment verification response
 */
export interface VerifyPaymentResponse {
  success: boolean;
  payment: PaymentType;
}

/**
 * Payment history filters
 */
export interface PaymentHistoryFilters {
  page?: number;
  limit?: number;
  loanId?: string;
  paymentType?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Payment history response
 */
export interface PaymentHistoryResponse {
  payments: PaymentType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const paymentsAdapter = {
  /**
   * Create Razorpay payment order
   */
  async createRazorpayOrder(payload: CreateRazorpayOrderPayload) {
    return postWithResult<RazorpayOrderResponse, CreateRazorpayOrderPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.RAZORPAY_CREATE_ORDER,
      payload
    );
  },

  /**
   * Verify Razorpay payment after successful payment
   */
  async verifyRazorpayPayment(payload: VerifyRazorpayPaymentPayload) {
    return postWithResult<VerifyPaymentResponse, VerifyRazorpayPaymentPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.RAZORPAY_VERIFY,
      payload
    );
  },

  /**
   * Get payment history with filters
   */
  async getHistory(filters?: PaymentHistoryFilters) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.loanId) params.append('loanId', filters.loanId);
    if (filters?.paymentType) params.append('paymentType', filters.paymentType);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);

    const url = `${BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.BASE}?${params.toString()}`;
    return getWithResult<PaymentHistoryResponse>(url);
  },

  /**
   * Pay EMI
   */
  async payEmi(payload: { emiScheduleId: string; amount: number; paymentReference: string }) {
    return postWithResult<PaymentType>(
      BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.EMI_PAY,
      payload
    );
  },
};

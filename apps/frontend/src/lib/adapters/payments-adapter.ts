/**
 * Payments Adapter
 * 
 * Handles all payment-related API calls:
 * - Create Razorpay order
 * - Verify payment signature
 * - Pay EMI
 * - EMI breakdown
 * 
 * @module lib/adapters/payments
 */

import { post, get, type ApiResult } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';

const { ENDPOINTS } = BACKEND_API_CONFIG;

export interface CreateOrderPayload {
  amount: number;
  currency?: string;
  loanId?: string;
  emiId?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string;
}

export interface VerifySignaturePayload {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifySignatureResponse {
  verified: boolean;
  paymentId: string;
  orderId: string;
}

export interface PayEmiPayload {
  emiId: string;
  amount: number;
  paymentId: string;
}

export interface PayEmiResponse {
  success: boolean;
  message: string;
  emiId: string;
  paidAt: string;
}

export interface EmiBreakdownResponse {
  emiId: string;
  dueDate: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  status: string;
  isOverdue: boolean;
}

export interface EmiHistoryRecord {
  id: string;
  amount: number;
  paidAmount?: number;
  paidAt?: string;
  dueDate: string;
  status: string;
  method?: string;
}

export interface EmiHistoryResponse {
  history: EmiHistoryRecord[];
  totalEMIs: number;
  paidEMIs: number;
  overduEMIs: number;
}

export const paymentsAdapter = {
  /**
   * Create Razorpay order
   */
  async createOrder(payload: CreateOrderPayload): Promise<ApiResult<CreateOrderResponse>> {
    try {
      const response = await post<CreateOrderResponse>(
        ENDPOINTS.PAYMENTS.RAZORPAY_CREATE_ORDER,
        payload
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to create payment order',
        },
      };
    }
  },

  /**
   * Verify Razorpay payment signature
   */
  async verifySignature(payload: VerifySignaturePayload): Promise<ApiResult<VerifySignatureResponse>> {
    try {
      const response = await post<VerifySignatureResponse>(
        ENDPOINTS.PAYMENTS.RAZORPAY_VERIFY,
        payload
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Payment verification failed',
        },
      };
    }
  },

  /**
   * Pay EMI
   */
  async payEmi(payload: PayEmiPayload): Promise<ApiResult<PayEmiResponse>> {
    try {
      const response = await post<PayEmiResponse>(ENDPOINTS.PAYMENTS.EMI_PAY, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to process EMI payment',
        },
      };
    }
  },

  /**
   * Get EMI breakdown
   */
  async getEmiBreakdown(emiId: string): Promise<ApiResult<EmiBreakdownResponse>> {
    try {
      const response = await get<EmiBreakdownResponse>(
        ENDPOINTS.PAYMENTS.EMI_BREAKDOWN(emiId)
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch EMI breakdown',
        },
      };
    }
  },

  /**
   * Get EMI payment history
   */
  async getEmiHistory(emiId: string): Promise<ApiResult<EmiHistoryResponse>> {
    try {
      const response = await get<EmiHistoryResponse>(
        ENDPOINTS.PAYMENTS.EMI_HISTORY(emiId)
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch EMI history',
        },
      };
    }
  },
};

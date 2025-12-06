/**
 * Loans Adapter
 *
 * Abstraction layer for loans API calls.
 *
 * @module lib/adapters/loans
 */

import { getWithResult, postWithResult } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';
import type { LoanType, EMIScheduleType, PaymentType } from '@fundifyhub/types';

/**
 * Loan list filters
 */
export interface LoanListFilters {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Loan list response
 */
export interface LoanListResponse {
  loans: LoanType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * EMI payment payload
 */
export interface EmiPaymentPayload {
  emiScheduleId: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
}

/**
 * EMI breakdown response
 */
export interface EmiBreakdownResponse {
  emiScheduleId: string;
  principalAmount: number;
  interestAmount: number;
  lateFee: number;
  totalAmount: number;
  dueDate: Date;
  status: string;
}

export const loansAdapter = {
  /**
   * Get list of loans with filters
   */
  async list(filters?: LoanListFilters) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const url = `${BACKEND_API_CONFIG.ENDPOINTS.USER.LIST_REQUESTS}?${params.toString()}`;
    return getWithResult<LoanListResponse>(url);
  },

  /**
   * Get loan by ID
   */
  async getById(id: string) {
    return getWithResult<LoanType>(
      BACKEND_API_CONFIG.ENDPOINTS.USER.GET_REQUEST_BY_IDENTIFIER(id)
    );
  },

  /**
   * Get EMI schedule for a loan
   */
  async getEmiSchedule(loanId: string) {
    return getWithResult<EMIScheduleType[]>(
      `${BACKEND_API_CONFIG.BASE_URL}/api/v1/loans/${loanId}/emi-schedule`
    );
  },

  /**
   * Get EMI breakdown by EMI ID
   */
  async getEmiBreakdown(emiId: string) {
    return getWithResult<EmiBreakdownResponse>(
      BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.EMI_BREAKDOWN(emiId)
    );
  },

  /**
   * Get payment history for EMI
   */
  async getEmiPaymentHistory(emiId: string) {
    return getWithResult<PaymentType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.EMI_HISTORY(emiId)
    );
  },

  /**
   * Pay EMI
   */
  async payEmi(payload: EmiPaymentPayload) {
    return postWithResult<PaymentType, EmiPaymentPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.PAYMENTS.EMI_PAY,
      payload
    );
  },

  /**
   * Get dashboard stats for user
   */
  async getDashboardStats() {
    return getWithResult<{
      activeLoansCount: number;
      pendingLoansCount: number;
      totalBorrow: number;
    }>(BACKEND_API_CONFIG.ENDPOINTS.USER.DASHBOARD_STATS);
  },

  /**
   * Get active loans count
   */
  async getActiveLoansCount() {
    return getWithResult<{ count: number }>(
      BACKEND_API_CONFIG.ENDPOINTS.USER.ACTIVE_LOANS_COUNT
    );
  },

  /**
   * Get pending loans count
   */
  async getPendingLoansCount() {
    return getWithResult<{ count: number }>(
      BACKEND_API_CONFIG.ENDPOINTS.USER.PENDING_LOANS_COUNT
    );
  },

  /**
   * Get total borrowed amount
   */
  async getTotalBorrow() {
    return getWithResult<{ amount: number }>(
      BACKEND_API_CONFIG.ENDPOINTS.USER.TOTAL_BORROW
    );
  },
};

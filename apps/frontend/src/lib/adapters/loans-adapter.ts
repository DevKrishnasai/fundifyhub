/**
 * Loans Adapter
 * 
 * Handles all loan-related API calls:
 * - List loans
 * - Get loan details
 * - EMI schedule
 * - Payment history
 * 
 * @module lib/adapters/loans
 */

import { get, post, patch, type ApiResult } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import type { LoanType, EMIScheduleType } from '@fundifyhub/types';

const { ENDPOINTS } = BACKEND_API_CONFIG;

export interface LoansListFilters {
  page?: number;
  limit?: number;
  status?: string;
  districtId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LoansListResponse {
  loans: LoanType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LoanDetailResponse {
  loan: LoanType;
  emiSchedule?: EMIScheduleType[];
}

export interface EMIScheduleResponse {
  schedule: EMIScheduleType[];
  totalEMIs: number;
  paidEMIs: number;
  pendingEMIs: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: string;
  transactionId: string;
  emiId: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const loansAdapter = {
  /**
   * List loans with filters
   */
  async list(filters: LoansListFilters = {}): Promise<ApiResult<LoansListResponse>> {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.status) params.append('status', filters.status);
      if (filters.districtId) params.append('districtId', filters.districtId);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await get<LoansListResponse>(
        `${ENDPOINTS.LOANS.LIST}?${params.toString()}`
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch loans',
        },
      };
    }
  },

  /**
   * Get loan by ID
   */
  async getById(loanId: string): Promise<ApiResult<LoanType>> {
    try {
      const response = await get<LoanType>(ENDPOINTS.LOANS.GET_BY_ID(loanId));
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch loan',
        },
      };
    }
  },

  /**
   * Get EMI schedule for a loan
   */
  async getEmiSchedule(loanId: string): Promise<ApiResult<EMIScheduleResponse>> {
    try {
      const response = await get<EMIScheduleResponse>(
        ENDPOINTS.LOANS.EMI_SCHEDULE(loanId)
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch EMI schedule',
        },
      };
    }
  },

  /**
   * Get payment history for a loan
   */
  async getPaymentHistory(loanId: string, page?: number, limit?: number): Promise<ApiResult<PaymentHistoryResponse>> {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', String(page));
      if (limit) params.append('limit', String(limit));

      const response = await get<PaymentHistoryResponse>(
        `${ENDPOINTS.LOANS.PAYMENTS(loanId)}?${params.toString()}`
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch payment history',
        },
      };
    }
  },
};

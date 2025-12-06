/**
 * React Query hooks for Loan management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { 
  loanSchema, 
  loanListResponseSchema, 
  emiScheduleSchema,
  paymentSchema,
  type LoanSchema, 
  type LoanListResponse,
  type EMIScheduleSchema,
  type PaymentSchema,
  type RecordPaymentPayload
} from '@fundifyhub/types'
import { getWithResult, postWithResult } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'

// ============================================================================
// Query Keys Factory
// ============================================================================

export const loanKeys = {
  all: ['loans'] as const,
  lists: () => [...loanKeys.all, 'list'] as const,
  list: (filters: LoanListFilters) => [...loanKeys.lists(), filters] as const,
  details: () => [...loanKeys.all, 'detail'] as const,
  detail: (id: string) => [...loanKeys.details(), id] as const,
  emiSchedule: (id: string) => [...loanKeys.detail(id), 'emi-schedule'] as const,
  payments: (id: string) => [...loanKeys.detail(id), 'payments'] as const,
}

// ============================================================================
// Types
// ============================================================================

export interface LoanListFilters {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Query Hooks
// ============================================================================

export function useLoans(
  filters: LoanListFilters = {},
  options?: Omit<UseQueryOptions<LoanListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: loanKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.status) params.append('status', filters.status);
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const url = `${BACKEND_API_CONFIG.ENDPOINTS.LOANS.LIST}?${params.toString()}`;
      const result = await getWithResult<LoanListResponse>(url);
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch loans');
      }
      
      return result.data;
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useLoan(
  id: string,
  options?: Omit<UseQueryOptions<LoanSchema, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: loanKeys.detail(id),
    queryFn: async () => {
      const result = await getWithResult<{ loan: LoanSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.LOANS.GET_BY_ID(id)
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch loan');
      }
      
      return loanSchema.parse(result.data.loan);
    },
    enabled: !!id,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useLoanEmiSchedule(
  id: string,
  options?: Omit<UseQueryOptions<EMIScheduleSchema[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: loanKeys.emiSchedule(id),
    queryFn: async () => {
      const result = await getWithResult<{ schedule: EMIScheduleSchema[] }>(
        BACKEND_API_CONFIG.ENDPOINTS.LOANS.EMI_SCHEDULE(id)
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch EMI schedule');
      }
      
      return result.data.schedule;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useLoanPayments(
  id: string,
  options?: Omit<UseQueryOptions<PaymentSchema[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: loanKeys.payments(id),
    queryFn: async () => {
      const result = await getWithResult<{ payments: PaymentSchema[] }>(
        BACKEND_API_CONFIG.ENDPOINTS.LOANS.PAYMENTS(id)
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch payments');
      }
      
      return result.data.payments;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
    ...options,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useRecordPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ loanId, data }: { loanId: string; data: RecordPaymentPayload }) => {
      const result = await postWithResult<{ payment: PaymentSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.LOANS.PAYMENTS(loanId),
        data
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to record payment');
      }
      
      return paymentSchema.parse(result.data.payment);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: loanKeys.detail(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanKeys.payments(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanKeys.emiSchedule(variables.loanId) });
      queryClient.invalidateQueries({ queryKey: loanKeys.lists() });
    },
  });
}

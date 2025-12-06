/**
 * React Query hooks for Payments
 * 
 * Provides:
 * - Create Razorpay orders
 * - Verify payment signatures
 * - Pay EMI
 * - Get EMI breakdowns and history
 * 
 * @module hooks/queries/usePayments
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsAdapter, type CreateOrderPayload, type VerifySignaturePayload, type PayEmiPayload } from '@/lib/adapters/payments-adapter';

// ============================================================================
// Query Keys
// ============================================================================

export const paymentKeys = {
  all: ['payments'] as const,
  orders: () => [...paymentKeys.all, 'orders'] as const,
  emiBreakdowns: () => [...paymentKeys.all, 'emi-breakdowns'] as const,
  emiBreakdown: (emiId: string) => [...paymentKeys.emiBreakdowns(), emiId] as const,
  emiHistories: () => [...paymentKeys.all, 'emi-histories'] as const,
  emiHistory: (emiId: string) => [...paymentKeys.emiHistories(), emiId] as const,
};

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create Razorpay payment order mutation
 */
export function useCreatePaymentOrder() {
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => paymentsAdapter.createOrder(payload),
  });
}

/**
 * Verify payment signature mutation
 */
export function useVerifyPaymentSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VerifySignaturePayload) => paymentsAdapter.verifySignature(payload),
    onSuccess: () => {
      // Invalidate relevant queries after payment verification
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
    },
  });
}

/**
 * Pay EMI mutation
 */
export function usePayEmi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PayEmiPayload) => paymentsAdapter.payEmi(payload),
    onSuccess: (result) => {
      if (result.ok) {
        // Invalidate EMI-related queries
        queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      }
    },
  });
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get EMI breakdown query
 */
export function useEmiBreakdown(emiId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: paymentKeys.emiBreakdown(emiId),
    queryFn: async () => {
      const result = await paymentsAdapter.getEmiBreakdown(emiId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!emiId && (options?.enabled !== false),
  });
}

/**
 * Get EMI history query
 */
export function useEmiHistory(emiId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: paymentKeys.emiHistory(emiId),
    queryFn: async () => {
      const result = await paymentsAdapter.getEmiHistory(emiId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!emiId && (options?.enabled !== false),
  });
}

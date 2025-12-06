/**
 * React Query hooks for Loan management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { loansAdapter } from '@/lib/adapters'
import type { LoanType, PaginatedResponse } from '@fundifyhub/types'

// ============================================================================
// Query Keys Factory
// ============================================================================

export const loanKeys = {
  all: ['loans'] as const,
  lists: () => [...loanKeys.all, 'list'] as const,
  list: (filters: any) => [...loanKeys.lists(), filters] as const,
  details: () => [...loanKeys.all, 'detail'] as const,
  detail: (id: string) => [...loanKeys.details(), id] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

export function useLoans(filters: any = {}) {
  return useQuery({
    queryKey: loanKeys.list(filters),
    queryFn: async () => {
      const result = await loansAdapter.list(filters)
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch loans')
      }
      return result.data
    },
  })
}

export function useLoan(id: string) {
  return useQuery({
    queryKey: loanKeys.detail(id),
    queryFn: async () => {
      const result = await loansAdapter.getById(id)
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch loan')
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * React Query hooks for Dashboard data
 * Provides data fetching and caching for dashboard stats and widgets
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getWithResult } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'
import type { RequestType } from '@fundifyhub/types'

const { ENDPOINTS } = BACKEND_API_CONFIG
const { USER, ADMIN } = ENDPOINTS

// ============================================================================
// Query Keys Factory
// ============================================================================

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  userStats: () => [...dashboardKeys.all, 'userStats'] as const,
  recentRequests: () => [...dashboardKeys.all, 'recentRequests'] as const,
  activeLoans: () => [...dashboardKeys.all, 'activeLoans'] as const,
  pendingRequests: () => [...dashboardKeys.all, 'pendingRequests'] as const,
}

// ============================================================================
// Types
// ============================================================================

export interface DashboardStats {
  totalRequests: number
  activeLoans: number
  pendingRequests: number
  totalBorrowed: number
  totalRepaid: number
  overdueEMIs: number
  completedLoans: number
  todayCollections: number
}

export interface UserDashboardStats {
  activeLoansCount: number
  pendingLoansCount: number
  totalBorrowed: number
  totalRepaid: number
  nextEMIDue?: {
    amount: number
    dueDate: string
    loanNumber: string
  }
}

export interface LoanSummary {
  id: string
  loanNumber: string
  approvedAmount: number
  status: string
  tenureMonths: number
  interestRate: number
  nextEMIDate?: string
  nextEMIAmount?: number
  totalPaid: number
  outstandingAmount: number
  request: {
    id: string
    requestNumber: string
    customer: {
      id: string
      firstName: string
      lastName: string
    }
  }
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch user's dashboard stats (for customer view)
 */
export function useUserDashboardStats(
  options?: Omit<UseQueryOptions<UserDashboardStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.userStats(),
    queryFn: async () => {
      const result = await getWithResult<UserDashboardStats>(USER.DASHBOARD_STATS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch dashboard stats')
      }
      return result.data
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    ...options,
  })
}

/**
 * Fetch active loans count
 */
export function useActiveLoansCount(
  options?: Omit<UseQueryOptions<{ count: number }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['user', 'activeLoansCount'],
    queryFn: async () => {
      const result = await getWithResult<{ count: number }>(USER.ACTIVE_LOANS_COUNT)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch active loans count')
      }
      return result.data
    },
    staleTime: 60 * 1000,
    ...options,
  })
}

/**
 * Fetch pending loans count
 */
export function usePendingLoansCount(
  options?: Omit<UseQueryOptions<{ count: number }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['user', 'pendingLoansCount'],
    queryFn: async () => {
      const result = await getWithResult<{ count: number }>(USER.PENDING_LOANS_COUNT)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch pending loans count')
      }
      return result.data
    },
    staleTime: 60 * 1000,
    ...options,
  })
}

/**
 * Fetch total borrowed amount
 */
export function useTotalBorrowed(
  options?: Omit<UseQueryOptions<{ amount: number }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['user', 'totalBorrowed'],
    queryFn: async () => {
      const result = await getWithResult<{ amount: number }>(USER.TOTAL_BORROW)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch total borrowed')
      }
      return result.data
    },
    staleTime: 60 * 1000,
    ...options,
  })
}

/**
 * Fetch active loans for admin dashboard
 */
export function useAdminActiveLoans(
  options?: Omit<UseQueryOptions<LoanSummary[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.activeLoans(),
    queryFn: async () => {
      const result = await getWithResult<LoanSummary[]>(ADMIN.GET_ACTIVE_LOANS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch active loans')
      }
      return result.data
    },
    staleTime: 60 * 1000,
    ...options,
  })
}

/**
 * Fetch pending requests for admin dashboard
 */
export function useAdminPendingRequests(
  options?: Omit<UseQueryOptions<RequestType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.pendingRequests(),
    queryFn: async () => {
      const result = await getWithResult<RequestType[]>(ADMIN.GET_PENDING_REQUESTS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch pending requests')
      }
      return result.data
    },
    staleTime: 30 * 1000, // 30 seconds for pending requests
    refetchInterval: 60 * 1000, // Auto-refetch every minute
    ...options,
  })
}

/**
 * Combined hook for customer dashboard
 * Fetches all stats in parallel
 */
export function useCustomerDashboard() {
  const statsQuery = useUserDashboardStats()
  
  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    isError: statsQuery.isError,
    error: statsQuery.error,
    refetch: statsQuery.refetch,
  }
}

/**
 * Combined hook for admin dashboard
 * Fetches active loans and pending requests
 */
export function useAdminDashboard() {
  const activeLoansQuery = useAdminActiveLoans()
  const pendingRequestsQuery = useAdminPendingRequests()

  return {
    activeLoans: activeLoansQuery.data ?? [],
    pendingRequests: pendingRequestsQuery.data ?? [],
    isLoading: activeLoansQuery.isLoading || pendingRequestsQuery.isLoading,
    isError: activeLoansQuery.isError || pendingRequestsQuery.isError,
    error: activeLoansQuery.error || pendingRequestsQuery.error,
    refetch: () => {
      activeLoansQuery.refetch()
      pendingRequestsQuery.refetch()
    },
  }
}

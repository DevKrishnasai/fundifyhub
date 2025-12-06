/**
 * React Query hooks for Analytics data
 * Provides data fetching and caching for analytics dashboards
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getWithResult } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'

const { ENDPOINTS } = BACKEND_API_CONFIG
const { ADMIN } = ENDPOINTS

// ============================================================================
// Query Keys Factory
// ============================================================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
  trends: (params?: TrendsParams) => [...analyticsKeys.all, 'trends', params] as const,
  districtBreakdown: () => [...analyticsKeys.all, 'districtBreakdown'] as const,
  requestStatus: () => [...analyticsKeys.all, 'requestStatus'] as const,
}

// ============================================================================
// Types
// ============================================================================

export interface TrendsParams {
  startDate?: string
  endDate?: string
  interval?: 'day' | 'week' | 'month'
}

export interface AnalyticsSummary {
  totalRequests: number
  activeLoans: number
  completedLoans: number
  totalDisbursed: number
  totalRepaid: number
  overdueAmount: number
  averageLoanAmount: number
  averageTenure: number
  approvalRate: number
  defaultRate: number
  
  // Comparison with previous period
  comparison?: {
    totalRequests: { change: number; trend: 'up' | 'down' | 'same' }
    activeLoans: { change: number; trend: 'up' | 'down' | 'same' }
    totalDisbursed: { change: number; trend: 'up' | 'down' | 'same' }
    approvalRate: { change: number; trend: 'up' | 'down' | 'same' }
  }
}

export interface TrendData {
  date: string
  requests: number
  approvals: number
  disbursements: number
  repayments: number
  collections: number
}

export interface DistrictBreakdown {
  districtId: string
  districtName: string
  stateName: string
  totalRequests: number
  activeLoans: number
  totalDisbursed: number
  collectionRate: number
  overdueAmount: number
}

export interface RequestStatusBreakdown {
  status: string
  count: number
  percentage: number
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch analytics summary
 */
export function useAnalyticsSummary(
  options?: Omit<UseQueryOptions<AnalyticsSummary, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.summary(),
    queryFn: async () => {
      const result = await getWithResult<AnalyticsSummary>(ADMIN.ANALYTICS_SUMMARY)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch analytics summary')
      }
      return result.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Fetch trend data over time
 */
export function useAnalyticsTrends(
  params: TrendsParams = {},
  options?: Omit<UseQueryOptions<TrendData[], Error>, 'queryKey' | 'queryFn'>
) {
  const queryParams = new URLSearchParams()
  
  if (params.startDate) queryParams.set('startDate', params.startDate)
  if (params.endDate) queryParams.set('endDate', params.endDate)
  if (params.interval) queryParams.set('interval', params.interval)

  const queryString = queryParams.toString()
  const url = `${ADMIN.ANALYTICS_TRENDS}${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: analyticsKeys.trends(params),
    queryFn: async () => {
      const result = await getWithResult<TrendData[]>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch analytics trends')
      }
      return result.data
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Fetch district breakdown
 */
export function useDistrictBreakdown(
  options?: Omit<UseQueryOptions<DistrictBreakdown[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.districtBreakdown(),
    queryFn: async () => {
      const result = await getWithResult<DistrictBreakdown[]>(ADMIN.ANALYTICS_DISTRICT_BREAKDOWN)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch district breakdown')
      }
      return result.data
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Fetch request status breakdown
 */
export function useRequestStatusBreakdown(
  options?: Omit<UseQueryOptions<RequestStatusBreakdown[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: analyticsKeys.requestStatus(),
    queryFn: async () => {
      const result = await getWithResult<RequestStatusBreakdown[]>(ADMIN.ANALYTICS_REQUEST_STATUS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch request status breakdown')
      }
      return result.data
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Combined analytics hook
 * Fetches all analytics data in parallel
 */
export function useAnalyticsDashboard(trendParams?: TrendsParams) {
  const summaryQuery = useAnalyticsSummary()
  const trendsQuery = useAnalyticsTrends(trendParams)
  const districtQuery = useDistrictBreakdown()
  const statusQuery = useRequestStatusBreakdown()

  const isLoading = 
    summaryQuery.isLoading || 
    trendsQuery.isLoading || 
    districtQuery.isLoading || 
    statusQuery.isLoading

  const isError = 
    summaryQuery.isError || 
    trendsQuery.isError || 
    districtQuery.isError || 
    statusQuery.isError

  return {
    summary: summaryQuery.data,
    trends: trendsQuery.data ?? [],
    districtBreakdown: districtQuery.data ?? [],
    statusBreakdown: statusQuery.data ?? [],
    isLoading,
    isError,
    error: summaryQuery.error || trendsQuery.error || districtQuery.error || statusQuery.error,
    refetch: () => {
      summaryQuery.refetch()
      trendsQuery.refetch()
      districtQuery.refetch()
      statusQuery.refetch()
    },
  }
}

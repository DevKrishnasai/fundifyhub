/**
 * React Query hooks for Request management
 * Provides data fetching, caching, and mutations for loan requests
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { getWithResult, postWithResult, patch } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'
import type { RequestType, PaginatedResponse } from '@fundifyhub/types'

const { ENDPOINTS } = BACKEND_API_CONFIG
const { REQUESTS, ADMIN, USER } = ENDPOINTS

// ============================================================================
// Query Keys Factory
// ============================================================================

export const requestKeys = {
  all: ['requests'] as const,
  lists: () => [...requestKeys.all, 'list'] as const,
  list: (filters: RequestListFilters) => [...requestKeys.lists(), filters] as const,
  details: () => [...requestKeys.all, 'detail'] as const,
  detail: (id: string) => [...requestKeys.details(), id] as const,
  assigned: () => [...requestKeys.all, 'assigned'] as const,
  userRequests: () => [...requestKeys.all, 'user'] as const,
}

// ============================================================================
// Types
// ============================================================================

export interface RequestListFilters {
  page?: number
  limit?: number
  status?: string
  district?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

interface RequestListResponse {
  requests: RequestType[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface AssignAgentPayload {
  agentId: string
}

interface UpdateStatusPayload {
  status: string
  reason?: string
}

interface CreateOfferPayload {
  loanAmount: number
  tenureMonths: number
  interestRate: number
  processingFee?: number
  notes?: string
}

interface CommentPayload {
  content: string
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch paginated request list (admin view)
 */
export function useRequests(
  filters: RequestListFilters = {},
  options?: Omit<UseQueryOptions<RequestListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const queryParams = new URLSearchParams()
  
  if (filters.page) queryParams.set('page', String(filters.page))
  if (filters.limit) queryParams.set('limit', String(filters.limit))
  if (filters.status) queryParams.set('status', filters.status)
  if (filters.district) queryParams.set('district', filters.district)
  if (filters.search) queryParams.set('search', filters.search)
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy)
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder)
  if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) queryParams.set('dateTo', filters.dateTo)

  const queryString = queryParams.toString()
  const url = `${ADMIN.REQUESTS_LIST}${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: requestKeys.list(filters),
    queryFn: async () => {
      const result = await getWithResult<RequestListResponse>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch requests')
      }
      return result.data
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

/**
 * Fetch single request by ID
 */
export function useRequest(
  id: string,
  options?: Omit<UseQueryOptions<RequestType, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: async () => {
      const result = await getWithResult<RequestType>(REQUESTS.GET_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch request')
      }
      return result.data
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  })
}

export function useUserRequests(
  options?: Omit<UseQueryOptions<RequestType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: requestKeys.userRequests(),
    queryFn: async () => {
      const result = await getWithResult<{requests: RequestType[], pagination: PaginatedResponse<unknown>}>(USER.LIST_REQUESTS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch your requests')
      }
      return result.data.requests
    },
    staleTime: 30 * 1000,
    ...options,
  })
}

/**
 * Fetch assigned requests (agent view)
 */
export function useAssignedRequests(
  options?: Omit<UseQueryOptions<RequestType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: requestKeys.assigned(),
    queryFn: async () => {
      const result = await getWithResult<{items: RequestType[], total: number, page: number, pageSize: number}>(REQUESTS.ASSIGNED_REQUESTS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch assigned requests')
      }
      return result.data.items
    },
    staleTime: 30 * 1000,
    ...options,
  })
}

/**
 * Fetch request by identifier (request number or ID) - for customer view
 */
export function useRequestByIdentifier(
  identifier: string,
  options?: Omit<UseQueryOptions<RequestType, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['request', 'identifier', identifier],
    queryFn: async () => {
      const result = await getWithResult<RequestType>(USER.GET_REQUEST_BY_IDENTIFIER(identifier))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch request')
      }
      return result.data
    },
    enabled: !!identifier,
    staleTime: 60 * 1000,
    ...options,
  })
}

/**
 * Fetch available agents for a district
 */
export function useAgentsByDistrict(
  district: string,
  options?: Omit<UseQueryOptions<Array<{ id: string; firstName: string; lastName: string; email: string }>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['agents', 'district', district],
    queryFn: async () => {
      const result = await getWithResult<Array<{ id: string; firstName: string; lastName: string; email: string }>>(
        REQUESTS.GET_AGENTS_BY_DISTRICT(district)
      )
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch agents')
      }
      return result.data
    },
    enabled: !!district,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Fetch current offer for a request
 */
export function useCurrentOffer(
  requestId: string,
  options?: Omit<UseQueryOptions<{
    loanAmount: number
    tenureMonths: number
    interestRate: number
    processingFee: number
    monthlyEmi: number
    totalPayable: number
  } | null, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['request', requestId, 'offer'],
    queryFn: async () => {
      const result = await getWithResult<{
        loanAmount: number
        tenureMonths: number
        interestRate: number
        processingFee: number
        monthlyEmi: number
        totalPayable: number
      } | null>(REQUESTS.CURRENT_OFFER(requestId))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch offer')
      }
      return result.data
    },
    enabled: !!requestId,
    staleTime: 60 * 1000,
    ...options,
  })
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Assign agent to request
 */
export function useAssignAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, agentId }: { requestId: string; agentId: string }) => {
      const result = await postWithResult<RequestType>(REQUESTS.ASSIGN_AGENT(requestId), { agentId })
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to assign agent')
      }
      return result.data
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() })
    },
  })
}

/**
 * Self-assign as admin
 */
export function useSelfAssignAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      const result = await postWithResult<RequestType>(REQUESTS.SELF_ASSIGN_ADMIN(requestId), {})
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to self-assign')
      }
      return result.data
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() })
    },
  })
}

/**
 * Update request status
 */
export function useUpdateRequestStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, status, reason }: { requestId: string; status: string; reason?: string }) => {
      const result = await patch(REQUESTS.UPDATE_STATUS(requestId), { status, reason })
      return result
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() })
      queryClient.invalidateQueries({ queryKey: requestKeys.assigned() })
      queryClient.invalidateQueries({ queryKey: requestKeys.userRequests() })
    },
  })
}

/**
 * Create loan offer
 */
export function useCreateOffer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, ...offerData }: CreateOfferPayload & { requestId: string }) => {
      const result = await postWithResult(REQUESTS.CREATE_OFFER(requestId), offerData)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to create offer')
      }
      return result.data
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: ['request', requestId, 'offer'] })
    },
  })
}

/**
 * Confirm/accept offer (admin)
 */
export function useConfirmOffer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      const result = await postWithResult(REQUESTS.CONFIRM_OFFER(requestId), {})
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to confirm offer')
      }
      return result.data
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() })
    },
  })
}

/**
 * Generate loan agreement
 */
export function useGenerateAgreement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      const result = await postWithResult<{ agreementUrl: string }>(REQUESTS.GENERATE_AGREEMENT(requestId), {})
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to generate agreement')
      }
      return result.data
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
    },
  })
}

/**
 * Sign agreement (customer)
 */
export function useSignAgreement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, signatureData }: { requestId: string; signatureData: string }) => {
      const result = await postWithResult(REQUESTS.SIGN_AGREEMENT(requestId), { signatureData })
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to sign agreement')
      }
      return result.data
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
    },
  })
}

/**
 * Complete inspection
 */
export function useCompleteInspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, inspectionData }: { requestId: string; inspectionData: Record<string, unknown> }) => {
      const result = await postWithResult(REQUESTS.COMPLETE_INSPECTION(requestId), inspectionData)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to complete inspection')
      }
      return result.data
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
      queryClient.invalidateQueries({ queryKey: requestKeys.assigned() })
    },
  })
}

/**
 * Add comment to request
 */
export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, content }: { requestId: string; content: string }) => {
      const result = await postWithResult(REQUESTS.ADD_COMMENT(requestId), { content })
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to add comment')
      }
      return result.data
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
    },
  })
}

/**
 * Update bank details for request
 */
export function useUpdateBankDetails() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      bankDetails 
    }: { 
      requestId: string
      bankDetails: {
        accountHolderName: string
        accountNumber: string
        ifscCode: string
        bankName: string
        branchName?: string
      }
    }) => {
      const result = await patch(REQUESTS.UPDATE_BANK_DETAILS(requestId), bankDetails)
      return result
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
    },
  })
}

/**
 * Toggle comments enabled for request
 */
export function useToggleCommentsEnabled() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, enabled }: { requestId: string; enabled: boolean }) => {
      const result = await patch(REQUESTS.UPDATE_COMMENTS_ENABLED(requestId), { commentsEnabled: enabled })
      return result
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
    },
  })
}

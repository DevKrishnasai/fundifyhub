/**
 * React Query hooks for Request management
 * Provides data fetching, caching, and mutations for loan requests
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { requestsAdapter, type RequestListFilters as AdapterFilters, type RequestListResponse as AdapterResponse, type CreateOfferPayload } from '../../lib/adapters/requests-adapter'
import type { RequestType } from '@fundifyhub/types'
import { BACKEND_API_CONFIG } from '@/lib/urls'

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

// Re-export adapter types for convenience
export type RequestListFilters = AdapterFilters;
export type RequestListResponse = AdapterResponse;

interface AssignAgentPayload {
  agentId: string
}

interface UpdateStatusPayload {
  status: string
  reason?: string
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
  return useQuery({
    queryKey: requestKeys.list(filters),
    queryFn: async () => {
      const result = await requestsAdapter.list(filters);
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch requests');
      }
      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
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
      const result = await requestsAdapter.getById(id);
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch request');
      }
      return result.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

export function useUserRequests(
  options?: Omit<UseQueryOptions<RequestType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: requestKeys.userRequests(),
    queryFn: async () => {
      const result = await requestsAdapter.list({ isUser: true });
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch your requests');
      }
      return result.data.requests;
    },
    staleTime: 30 * 1000,
    ...options,
  });
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
      const result = await requestsAdapter.getAssigned();
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch assigned requests');
      }
      return result.data.requests;
    },
    staleTime: 30 * 1000,
    ...options,
  });
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
      const result = await requestsAdapter.getByIdentifier(identifier);
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch request');
      }
      return result.data;
    },
    enabled: !!identifier,
    staleTime: 60 * 1000,
    ...options,
  });
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
      // TODO: (agent) Add getAgentsByDistrict to requestsAdapter
      const result = { success: true, data: [] } // Placeholder
      if (!result.success) {
        throw new Error('Failed to fetch agents')
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
      // TODO: (agent) Add getCurrentOffer to requestsAdapter
      const result = { success: true, data: null } // Placeholder
      if (!result.success) {
        throw new Error('Failed to fetch offer')
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
      // TODO: (agent) Add assignAgent to requestsAdapter
      const result = { success: true, data: {} } // Placeholder
      if (!result.success) {
        throw new Error('Failed to assign agent')
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
      // TODO: (agent) Add selfAssignAdmin to requestsAdapter
      const result = { success: true, data: {} } // Placeholder
      if (!result.success) {
        throw new Error('Failed to self-assign')
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
      const result = await requestsAdapter.updateStatus(requestId, { status, reason })
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to update request status')
      }
      return result.data
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
    mutationFn: async (params: { requestId: string; offerData: CreateOfferPayload }) => {
      const { requestId, offerData } = params
      const result = await requestsAdapter.createOffer(requestId, offerData)
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to create offer')
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
      const result = await requestsAdapter.confirmOffer(requestId)
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to confirm offer')
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
      // TODO: (agent) Add generateAgreement to requestsAdapter
      const result = { success: true, data: { agreementUrl: '' } } // Placeholder
      if (!result.success) {
        throw new Error('Failed to generate agreement')
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
      // TODO: (agent) Add signAgreement to requestsAdapter
      const result = { success: true, data: {} } // Placeholder
      if (!result.success) {
        throw new Error('Failed to sign agreement')
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
      // TODO: (agent) Add completeInspection to requestsAdapter
      const result = { success: true, data: {} } // Placeholder
      if (!result.success) {
        throw new Error('Failed to complete inspection')
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
      // TODO: (agent) Add addComment to requestsAdapter
      const result = { success: true, data: {} } // Placeholder
      if (!result.success) {
        throw new Error('Failed to add comment')
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
      // TODO: (agent) Add updateBankDetails to requestsAdapter
      const result = { success: true, data: {} } // Placeholder
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
      // TODO: (agent) Add toggleCommentsEnabled to requestsAdapter
      const result = { success: true, data: {} } // Placeholder
      return result
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) })
    },
  })
}

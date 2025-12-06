/**
 * React Query hooks for Request management
 * Provides data fetching, caching, and mutations for loan requests
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { 
  requestSchema, 
  requestListResponseSchema, 
  createRequestSchema,
  type RequestSchema, 
  type RequestListResponse,
  type CreateRequestPayload,
  type UpdateStatusPayload,
  type AssignAgentPayload,
  type AddCommentPayload
} from '@fundifyhub/types'
import { getWithResult, postWithResult, putWithResult, type ApiResult } from '@/lib/api-client'
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
  detailByIdentifier: (identifier: string) => [...requestKeys.details(), 'identifier', identifier] as const,
  assigned: () => [...requestKeys.all, 'assigned'] as const,
  userRequests: () => [...requestKeys.all, 'user'] as const,
  agents: (district: string) => ['agents', district] as const,
  offer: (requestId: string) => [...requestKeys.detail(requestId), 'offer'] as const,
}

// ============================================================================
// Types
// ============================================================================

export interface RequestListFilters {
  page?: number;
  limit?: number;
  status?: string;
  stage?: string;
  district?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  isUser?: boolean;
  assigned?: boolean;
}

// TODO: Move to @fundifyhub/types
export interface CreateOfferPayload {
  offeredAmount: number;
  tenureMonths: number;
  interestRate: number;
  processingFee?: number;
  penaltyPercentage?: number;
  lateFeePercentage?: number;
  adminRequestedInfo?: string;
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
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.status) params.append('status', filters.status);
      if (filters.stage) params.append('stage', filters.stage);
      if (filters.district) params.append('district', filters.district);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.isUser) params.append('isUser', String(filters.isUser));
      if (filters.assigned) params.append('assigned', String(filters.assigned));

      const url = `${BACKEND_API_CONFIG.ENDPOINTS.USER.LIST_REQUESTS}?${params.toString()}`;
      const result = await getWithResult<RequestListResponse>(url);
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch requests');
      }
      
      // Validate with Zod
      // Note: We might need to relax validation if backend returns extra fields or slightly different structure
      // For now, we cast to unknown then to schema type if validation passes
      // return requestListResponseSchema.parse(result.data) as unknown as RequestListResponse;
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
  options?: Omit<UseQueryOptions<RequestSchema, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: async () => {
      const result = await getWithResult<{ request: RequestSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_BY_ID(id)
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch request');
      }
      
      return requestSchema.parse(result.data.request);
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Fetch request by identifier (request number or ID) - for customer view
 */
export function useRequestByIdentifier(
  identifier: string,
  options?: Omit<UseQueryOptions<RequestSchema, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: requestKeys.detailByIdentifier(identifier),
    queryFn: async () => {
      const result = await getWithResult<{ request: RequestSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.USER.GET_REQUEST_BY_IDENTIFIER(identifier)
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch request');
      }
      
      return requestSchema.parse(result.data.request);
    },
    enabled: !!identifier,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useUserRequests(
  options?: Omit<UseQueryOptions<RequestSchema[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: requestKeys.userRequests(),
    queryFn: async () => {
      // Reusing list endpoint with isUser=true implicitly handled by backend or we filter
      // Assuming there's a specific endpoint or we use list
      const result = await getWithResult<RequestListResponse>(
        `${BACKEND_API_CONFIG.ENDPOINTS.USER.LIST_REQUESTS}?isUser=true`
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch user requests');
      }
      
      return requestListResponseSchema.parse(result.data).requests;
    },
    ...options,
  });
}

export function useAssignedRequests(
  options?: Omit<UseQueryOptions<RequestSchema[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: requestKeys.assigned(),
    queryFn: async () => {
      const result = await getWithResult<RequestListResponse>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ASSIGNED_REQUESTS
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch assigned requests');
      }
      
      return requestListResponseSchema.parse(result.data).requests;
    },
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
    queryKey: requestKeys.agents(district),
    queryFn: async () => {
      const result = await getWithResult<{ agents: Array<{ id: string; firstName: string; lastName: string; email: string }> }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_AGENTS_BY_DISTRICT(district)
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch agents');
      }
      
      return result.data.agents;
    },
    enabled: !!district,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
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
    queryKey: requestKeys.offer(requestId),
    queryFn: async () => {
      const result = await getWithResult<{ offer: any }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.CURRENT_OFFER(requestId)
      );
      
      if (!result.ok) {
        // If 404, it might mean no offer exists, which is valid
        if (result.error.status === 404) return null;
        throw new Error(result.error.message || 'Failed to fetch offer');
      }
      
      return result.data.offer;
    },
    enabled: !!requestId,
    staleTime: 60 * 1000,
    ...options,
  });
}

// ============================================================================
// Mutations
// ============================================================================

export function useCreateRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateRequestPayload) => {
      const result = await postWithResult<{ request: RequestSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.USER.LIST_REQUESTS,
        data
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to create request');
      }
      
      return requestSchema.parse(result.data.request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.userRequests() });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStatusPayload }) => {
      const result = await putWithResult<{ request: RequestSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_STATUS(id),
        data
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to update status');
      }
      
      return requestSchema.parse(result.data.request);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.assigned() });
      queryClient.invalidateQueries({ queryKey: requestKeys.userRequests() });
    },
  });
}

export function useAssignAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssignAgentPayload }) => {
      const result = await postWithResult<{ request: RequestSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ASSIGN_AGENT(id),
        data
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to assign agent');
      }
      
      return requestSchema.parse(result.data.request);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

export function useSelfAssignAdmin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await postWithResult<{ request: RequestSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.SELF_ASSIGN_ADMIN(id),
        {}
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to self-assign');
      }
      
      return requestSchema.parse(result.data.request);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddCommentPayload }) => {
      const result = await postWithResult<void>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ADD_COMMENT(id),
        data
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to add comment');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(variables.id) });
    },
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, offerData }: { requestId: string; offerData: CreateOfferPayload }) => {
      const result = await postWithResult<{ offer: any }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.CREATE_OFFER(requestId),
        offerData
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to create offer');
      }
      
      return result.data.offer;
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) });
      queryClient.invalidateQueries({ queryKey: requestKeys.offer(requestId) });
    },
  });
}

export function useConfirmOffer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const result = await postWithResult<{ request: RequestSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.CONFIRM_OFFER(requestId),
        {}
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to confirm offer');
      }
      
      return requestSchema.parse(result.data.request);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

export function useGenerateAgreement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const result = await postWithResult<{ agreementUrl: string }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GENERATE_AGREEMENT(requestId),
        {}
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to generate agreement');
      }
      
      return result.data;
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) });
    },
  });
}

export function useSignAgreement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, signatureData }: { requestId: string; signatureData: string }) => {
      const result = await postWithResult<void>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.SIGN_AGREEMENT(requestId),
        { signatureData }
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to sign agreement');
      }
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) });
    },
  });
}

export function useCompleteInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, inspectionData }: { requestId: string; inspectionData: Record<string, unknown> }) => {
      const result = await postWithResult<{ request: RequestSchema }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.COMPLETE_INSPECTION(requestId),
        inspectionData
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to complete inspection');
      }
      
      return requestSchema.parse(result.data.request);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.assigned() });
    },
  });
}

export function useUpdateBankDetails() {
  const queryClient = useQueryClient();
  
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
      const result = await putWithResult<void>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_BANK_DETAILS(requestId),
        bankDetails
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to update bank details');
      }
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) });
    },
  });
}

export function useToggleCommentsEnabled() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ requestId, enabled }: { requestId: string; enabled: boolean }) => {
      const result = await putWithResult<void>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPDATE_COMMENTS_ENABLED(requestId),
        { enabled }
      );
      
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to toggle comments');
      }
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(requestId) });
    },
  });
}

/**
 * React Query hooks for asset management
 * Uses @tanstack/react-query for caching, background refetch, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { getWithResult, postWithResult, patch } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'

const { ASSETS } = BACKEND_API_CONFIG.ENDPOINTS

// ============================================================================
// Types
// ============================================================================

export interface AssetCustomer {
  id: string
  firstName: string
  lastName: string
  phoneNumber?: string
  email?: string
}

export interface AssetRequest {
  id: string
  requestNumber: string
  currentStatus: string
  requestedAmount?: number
  adminOfferedAmount?: number
  customer: AssetCustomer
  loan?: {
    id: string
    loanNumber: string
    status: string
    approvedAmount: number
  } | null
}

export interface AssetWarehouse {
  id: string
  name: string
  code: string
  address?: string
  district?: {
    id: string
    name: string
    state?: {
      id: string
      name: string
    }
  }
}

export interface Asset {
  id: string
  requestId: string
  assetType: string
  brand?: string
  model?: string
  description?: string
  condition: string
  status: string
  inspectedValue?: number
  currentMarketValue?: number
  depreciationRate?: number
  lastValuationDate?: string
  warehouseId?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  request?: AssetRequest
  warehouse?: AssetWarehouse | null
  movements?: AssetMovement[]
  auctionListings?: AssetAuctionListing[]
  _count?: {
    movements: number
    auctionListings: number
  }
}

export interface AssetMovement {
  id: string
  assetId: string
  movementType: string
  fromWarehouseId?: string
  toWarehouseId?: string
  movedBy: string
  movementDate: string
  notes?: string
  fromWarehouse?: {
    id: string
    name: string
    code: string
    district?: { name: string }
  } | null
  toWarehouse?: {
    id: string
    name: string
    code: string
    district?: { name: string }
  } | null
}

export interface AssetAuctionListing {
  id: string
  listingNumber: string
  status: string
  startTime: string
  endTime?: string
  currentHighBid?: number
}

export interface AssetStats {
  totalAssets: number
  totalInspectedValue: number
  totalMarketValue: number
  byStatus: Array<{ status: string; count: number }>
  byCondition: Array<{ condition: string; count: number }>
  byType: Array<{ type: string; count: number }>
}

export interface AssetListParams {
  status?: string
  condition?: string
  assetType?: string
  warehouseId?: string
  districtId?: string
  search?: string
  page?: number
  limit?: number
}

export interface AssetListResponse {
  assets: Asset[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface WarehouseInventoryResponse {
  warehouse: {
    id: string
    name: string
    code: string
    capacity?: number
    currentCount: number
    district?: {
      id: string
      name: string
      state?: { id: string; name: string }
    }
  }
  stats: Record<string, number>
  assets: Asset[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// Query Keys
// ============================================================================

export const assetKeys = {
  all: ['assets'] as const,
  list: (params?: AssetListParams) => [...assetKeys.all, 'list', params ?? {}] as const,
  stats: (districtId?: string, warehouseId?: string) => [...assetKeys.all, 'stats', { districtId, warehouseId }] as const,
  detail: (id: string) => [...assetKeys.all, 'detail', id] as const,
  byRequest: (requestId: string) => [...assetKeys.all, 'byRequest', requestId] as const,
  movements: (assetId: string, page?: number) => [...assetKeys.all, 'movements', assetId, page ?? 1] as const,
  warehouseInventory: (warehouseId: string, params?: AssetListParams) => 
    [...assetKeys.all, 'warehouse', warehouseId, params ?? {}] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch list of assets with filtering and pagination
 */
export function useAssets(
  params?: AssetListParams,
  options?: Omit<UseQueryOptions<AssetListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.status) searchParams.set('status', params.status)
      if (params?.condition) searchParams.set('condition', params.condition)
      if (params?.assetType) searchParams.set('assetType', params.assetType)
      if (params?.warehouseId) searchParams.set('warehouseId', params.warehouseId)
      if (params?.districtId) searchParams.set('districtId', params.districtId)
      if (params?.search) searchParams.set('search', params.search)
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.limit) searchParams.set('limit', String(params.limit))

      const url = `${ASSETS.LIST}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      const result = await getWithResult<AssetListResponse>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch assets')
      }
      return result.data
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    ...options,
  })
}

/**
 * Fetch asset statistics
 */
export function useAssetStats(
  districtId?: string,
  warehouseId?: string,
  options?: Omit<UseQueryOptions<AssetStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.stats(districtId, warehouseId),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (districtId) searchParams.set('districtId', districtId)
      if (warehouseId) searchParams.set('warehouseId', warehouseId)
      
      const url = `${ASSETS.STATS}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      const result = await getWithResult<AssetStats>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch asset stats')
      }
      return result.data
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  })
}

/**
 * Fetch a single asset by ID
 */
export function useAsset(
  id: string,
  options?: Omit<UseQueryOptions<Asset, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: async () => {
      const result = await getWithResult<Asset>(ASSETS.GET_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch asset')
      }
      return result.data
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    ...options,
  })
}

/**
 * Fetch asset by request ID
 */
export function useAssetByRequest(
  requestId: string,
  options?: Omit<UseQueryOptions<Asset, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.byRequest(requestId),
    queryFn: async () => {
      const result = await getWithResult<Asset>(ASSETS.BY_REQUEST(requestId))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'No asset found for this request')
      }
      return result.data
    },
    enabled: !!requestId,
    staleTime: 2 * 60 * 1000,
    ...options,
  })
}

/**
 * Fetch asset movement history
 */
export function useAssetMovements(
  assetId: string,
  page?: number,
  options?: Omit<UseQueryOptions<{ movements: AssetMovement[]; pagination: { page: number; limit: number; total: number; totalPages: number } }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: assetKeys.movements(assetId, page),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (page) searchParams.set('page', String(page))
      
      const url = `${ASSETS.MOVEMENTS(assetId)}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      const result = await getWithResult<{ movements: AssetMovement[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch asset movements')
      }
      return result.data
    },
    enabled: !!assetId,
    staleTime: 2 * 60 * 1000,
    ...options,
  })
}

// Note: useWarehouseInventory is exported from useGeography.ts as it uses the geography API

// ============================================================================
// Mutation Hooks
// ============================================================================

interface UpdateAssetInput {
  condition?: string
  inspectedValue?: number
  currentMarketValue?: number
  description?: string
  depreciationRate?: number
}

interface UpdateAssetStatusInput {
  status: string
}

interface CreateMovementInput {
  movementType: string
  toWarehouseId?: string
  notes?: string
}

/**
 * Update asset details
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAssetInput }) => {
      return await patch<Asset, UpdateAssetInput>(ASSETS.UPDATE(id), data)
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch asset data
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
    },
  })
}

/**
 * Update asset status
 */
export function useUpdateAssetStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAssetStatusInput }) => {
      return await patch<Asset, UpdateAssetStatusInput>(ASSETS.UPDATE_STATUS(id), data)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
    },
  })
}

/**
 * Create asset movement (transfer, intake, release, etc.)
 */
export function useCreateAssetMovement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ assetId, data }: { assetId: string; data: CreateMovementInput }) => {
      const result = await postWithResult<{ movement: AssetMovement; asset: Asset }>(
        ASSETS.CREATE_MOVEMENT(assetId),
        data
      )
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to create asset movement')
      }
      return result.data
    },
    onSuccess: (data, variables) => {
      // Invalidate asset and movement queries
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) })
      queryClient.invalidateQueries({ queryKey: assetKeys.movements(variables.assetId) })
      queryClient.invalidateQueries({ queryKey: assetKeys.all })
    },
  })
}

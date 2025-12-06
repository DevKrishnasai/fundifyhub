/**
 * React Query hooks for Assets
 * 
 * Provides:
 * - List and fetch assets
 * - Asset status management
 * - Asset movements tracking
 * - Warehouse inventory
 * 
 * @module hooks/queries/useAssets
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assetsAdapter, type UpdateAssetStatusPayload, type CreateAssetMovementPayload, type AssetsListFilters } from '@/lib/adapters/assets-adapter';
import type { AssetType } from '@fundifyhub/types';

// ============================================================================
// Query Keys
// ============================================================================

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: AssetsListFilters) => [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  byRequest: (requestId: string) => [...assetKeys.all, 'byRequest', requestId] as const,
  stats: () => [...assetKeys.all, 'stats'] as const,
  movements: (assetId: string) => [...assetKeys.detail(assetId), 'movements'] as const,
  warehouseInventory: (warehouseId: string) => [...assetKeys.all, 'warehouse-inventory', warehouseId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * List assets with filters
 */
export function useAssets(filters: AssetsListFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: async () => {
      const result = await assetsAdapter.list(filters);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled !== false,
  });
}

/**
 * Get asset by ID
 */
export function useAssetById(assetId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: assetKeys.detail(assetId),
    queryFn: async () => {
      const result = await assetsAdapter.getById(assetId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!assetId && (options?.enabled !== false),
  });
}

/**
 * Get assets by request ID
 */
export function useAssetsByRequest(requestId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: assetKeys.byRequest(requestId),
    queryFn: async () => {
      const result = await assetsAdapter.getByRequest(requestId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!requestId && (options?.enabled !== false),
  });
}

/**
 * Get asset statistics
 */
export function useAssetStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: assetKeys.stats(),
    queryFn: async () => {
      const result = await assetsAdapter.getStats();
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: options?.enabled !== false,
  });
}

/**
 * Get asset movements
 */
export function useAssetMovements(assetId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: assetKeys.movements(assetId),
    queryFn: async () => {
      const result = await assetsAdapter.getMovements(assetId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!assetId && (options?.enabled !== false),
  });
}

/**
 * Get warehouse inventory
 */
export function useWarehouseInventory(warehouseId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: assetKeys.warehouseInventory(warehouseId),
    queryFn: async () => {
      const result = await assetsAdapter.getWarehouseInventory(warehouseId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    enabled: !!warehouseId && (options?.enabled !== false),
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update asset status mutation
 */
export function useUpdateAssetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { assetId: string; data: UpdateAssetStatusPayload }) =>
      assetsAdapter.updateStatus(payload.assetId, payload.data),
    onSuccess: (result, variables) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
        queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
        queryClient.invalidateQueries({ queryKey: assetKeys.stats() });
      }
    },
  });
}

/**
 * Create asset movement mutation
 */
export function useCreateAssetMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { assetId: string; data: CreateAssetMovementPayload }) =>
      assetsAdapter.createMovement(payload.assetId, payload.data),
    onSuccess: (result, variables) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: assetKeys.movements(variables.assetId) });
        queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
      }
    },
  });
}

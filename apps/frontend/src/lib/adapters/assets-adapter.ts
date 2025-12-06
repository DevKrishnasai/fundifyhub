/**
 * Assets Adapter
 * 
 * Handles all asset-related API calls:
 * - List assets
 * - Asset details
 * - Asset status
 * - Asset movements
 * - Warehouse inventory
 * 
 * @module lib/adapters/assets
 */

import { get, post, patch, type ApiResult } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import type { AssetType, AssetMovementType } from '@fundifyhub/types';

const { ENDPOINTS } = BACKEND_API_CONFIG;

export interface AssetsListFilters {
  page?: number;
  limit?: number;
  status?: string;
  condition?: string;
  districtId?: string;
  warehouseId?: string;
  requestId?: string;
  search?: string;
}

export interface AssetsListResponse {
  assets: AssetType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AssetStatsResponse {
  total: number;
  pledged: number;
  released: number;
  inAuction: number;
  forfeited: number;
  auctioned: number;
  sold: number;
  totalValue: number;
}

export interface UpdateAssetStatusPayload {
  status: string;
  reason?: string;
  warehouseId?: string;
}

export interface CreateAssetMovementPayload {
  movementType: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  notes?: string;
  completedAt?: string;
}

export interface AssetMovementResponse {
  movement: AssetMovementType;
  asset: AssetType;
}

export interface WarehouseInventoryResponse {
  warehouseId: string;
  warehouseName: string;
  totalAssets: number;
  assetsBreakdown: {
    [key: string]: number;
  };
  totalValue: number;
}

export const assetsAdapter = {
  /**
   * List assets with filters
   */
  async list(filters: AssetsListFilters = {}): Promise<ApiResult<AssetsListResponse>> {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.status) params.append('status', filters.status);
      if (filters.condition) params.append('condition', filters.condition);
      if (filters.districtId) params.append('districtId', filters.districtId);
      if (filters.warehouseId) params.append('warehouseId', filters.warehouseId);
      if (filters.requestId) params.append('requestId', filters.requestId);
      if (filters.search) params.append('search', filters.search);

      const response = await get<AssetsListResponse>(
        `${ENDPOINTS.ASSETS.LIST}?${params.toString()}`
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch assets',
        },
      };
    }
  },

  /**
   * Get asset by ID
   */
  async getById(assetId: string): Promise<ApiResult<AssetType>> {
    try {
      const response = await get<AssetType>(ENDPOINTS.ASSETS.GET_BY_ID(assetId));
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch asset',
        },
      };
    }
  },

  /**
   * Get assets by request ID
   */
  async getByRequest(requestId: string): Promise<ApiResult<AssetType[]>> {
    try {
      const response = await get<AssetType[]>(ENDPOINTS.ASSETS.BY_REQUEST(requestId));
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch assets',
        },
      };
    }
  },

  /**
   * Get asset statistics
   */
  async getStats(): Promise<ApiResult<AssetStatsResponse>> {
    try {
      const response = await get<AssetStatsResponse>(ENDPOINTS.ASSETS.STATS);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch asset stats',
        },
      };
    }
  },

  /**
   * Update asset status
   */
  async updateStatus(assetId: string, payload: UpdateAssetStatusPayload): Promise<ApiResult<AssetType>> {
    try {
      const response = await patch<AssetType>(
        ENDPOINTS.ASSETS.UPDATE_STATUS(assetId),
        payload
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to update asset status',
        },
      };
    }
  },

  /**
   * Get asset movements
   */
  async getMovements(assetId: string): Promise<ApiResult<AssetMovementType[]>> {
    try {
      const response = await get<AssetMovementType[]>(
        ENDPOINTS.ASSETS.MOVEMENTS(assetId)
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch asset movements',
        },
      };
    }
  },

  /**
   * Create asset movement
   */
  async createMovement(assetId: string, payload: CreateAssetMovementPayload): Promise<ApiResult<AssetMovementResponse>> {
    try {
      const response = await post<AssetMovementResponse>(
        ENDPOINTS.ASSETS.CREATE_MOVEMENT(assetId),
        payload
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to create asset movement',
        },
      };
    }
  },

  /**
   * Get warehouse inventory
   */
  async getWarehouseInventory(warehouseId: string): Promise<ApiResult<WarehouseInventoryResponse>> {
    try {
      const response = await get<WarehouseInventoryResponse>(
        ENDPOINTS.ASSETS.WAREHOUSE_INVENTORY(warehouseId)
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch warehouse inventory',
        },
      };
    }
  },
};

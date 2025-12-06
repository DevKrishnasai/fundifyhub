/**
 * Geography Adapter
 * 
 * Handles all geography-related API calls:
 * - Countries, States, Districts, Warehouses
 * - Geography hierarchy management
 * 
 * @module lib/adapters/geography
 */

import { get, post, patch, delete as deleteRequest, type ApiResult } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import type { CountryType, StateType, DistrictType, WarehouseType } from '@fundifyhub/types';

const { ENDPOINTS } = BACKEND_API_CONFIG;

export interface GeographyListResponse<T> {
  items: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateCountryPayload {
  code: string;
  name: string;
  currency?: string;
}

export interface CreateStatePayload {
  code: string;
  name: string;
  countryId: string;
}

export interface CreateDistrictPayload {
  code: string;
  name: string;
  stateId: string;
  state?: StateType;
}

export interface CreateWarehousePayload {
  name: string;
  districtId: string;
  address: string;
  pinCode: string;
  phone: string;
  capacity?: number;
}

export const geographyAdapter = {
  /**
   * List all countries
   */
  async getCountries(): Promise<ApiResult<GeographyListResponse<CountryType>>> {
    try {
      const response = await get<GeographyListResponse<CountryType>>(ENDPOINTS.GEOGRAPHY.COUNTRIES);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch countries',
        },
      };
    }
  },

  /**
   * Get country by ID
   */
  async getCountryById(countryId: string): Promise<ApiResult<CountryType>> {
    try {
      const response = await get<CountryType>(ENDPOINTS.GEOGRAPHY.COUNTRY_BY_ID(countryId));
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch country',
        },
      };
    }
  },

  /**
   * List all states
   */
  async getStates(): Promise<ApiResult<GeographyListResponse<StateType>>> {
    try {
      const response = await get<GeographyListResponse<StateType>>(ENDPOINTS.GEOGRAPHY.STATES);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch states',
        },
      };
    }
  },

  /**
   * Get state by ID
   */
  async getStateById(stateId: string): Promise<ApiResult<StateType>> {
    try {
      const response = await get<StateType>(ENDPOINTS.GEOGRAPHY.STATE_BY_ID(stateId));
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch state',
        },
      };
    }
  },

  /**
   * Get states by country ID
   */
  async getStatesByCountry(countryId: string): Promise<ApiResult<GeographyListResponse<StateType>>> {
    try {
      const response = await get<GeographyListResponse<StateType>>(
        ENDPOINTS.GEOGRAPHY.STATES_BY_COUNTRY(countryId)
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch states',
        },
      };
    }
  },

  /**
   * List all districts
   */
  async getDistricts(): Promise<ApiResult<GeographyListResponse<DistrictType>>> {
    try {
      const response = await get<GeographyListResponse<DistrictType>>(ENDPOINTS.GEOGRAPHY.DISTRICTS);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch districts',
        },
      };
    }
  },

  /**
   * Get district by ID
   */
  async getDistrictById(districtId: string): Promise<ApiResult<DistrictType>> {
    try {
      const response = await get<DistrictType>(ENDPOINTS.GEOGRAPHY.DISTRICT_BY_ID(districtId));
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch district',
        },
      };
    }
  },

  /**
   * Get districts by state ID
   */
  async getDistrictsByState(stateId: string): Promise<ApiResult<GeographyListResponse<DistrictType>>> {
    try {
      const response = await get<GeographyListResponse<DistrictType>>(
        ENDPOINTS.GEOGRAPHY.DISTRICTS_BY_STATE(stateId)
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch districts',
        },
      };
    }
  },

  /**
   * List all warehouses
   */
  async getWarehouses(): Promise<ApiResult<GeographyListResponse<WarehouseType>>> {
    try {
      const response = await get<GeographyListResponse<WarehouseType>>(ENDPOINTS.GEOGRAPHY.WAREHOUSES);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch warehouses',
        },
      };
    }
  },

  /**
   * Get warehouse by ID
   */
  async getWarehouseById(warehouseId: string): Promise<ApiResult<WarehouseType>> {
    try {
      const response = await get<WarehouseType>(ENDPOINTS.GEOGRAPHY.WAREHOUSE_BY_ID(warehouseId));
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch warehouse',
        },
      };
    }
  },

  /**
   * Get warehouses by district ID
   */
  async getWarehousesByDistrict(districtId: string): Promise<ApiResult<GeographyListResponse<WarehouseType>>> {
    try {
      const response = await get<GeographyListResponse<WarehouseType>>(
        ENDPOINTS.GEOGRAPHY.WAREHOUSES_BY_DISTRICT(districtId)
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch warehouses',
        },
      };
    }
  },

  /**
   * Create country (admin only)
   */
  async createCountry(payload: CreateCountryPayload): Promise<ApiResult<CountryType>> {
    try {
      const response = await post<CountryType>(ENDPOINTS.GEOGRAPHY.COUNTRIES, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to create country',
        },
      };
    }
  },

  /**
   * Create state (admin only)
   */
  async createState(payload: CreateStatePayload): Promise<ApiResult<StateType>> {
    try {
      const response = await post<StateType>(ENDPOINTS.GEOGRAPHY.STATES, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to create state',
        },
      };
    }
  },

  /**
   * Create district (admin only)
   */
  async createDistrict(payload: CreateDistrictPayload): Promise<ApiResult<DistrictType>> {
    try {
      const response = await post<DistrictType>(ENDPOINTS.GEOGRAPHY.DISTRICTS, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to create district',
        },
      };
    }
  },

  /**
   * Create warehouse (admin only)
   */
  async createWarehouse(payload: CreateWarehousePayload): Promise<ApiResult<WarehouseType>> {
    try {
      const response = await post<WarehouseType>(ENDPOINTS.GEOGRAPHY.WAREHOUSES, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to create warehouse',
        },
      };
    }
  },
};

/**
 * Geography Adapter
 *
 * Abstraction layer for geography API calls.
 *
 * @module lib/adapters/geography
 */

import { getWithResult, postWithResult, putWithResult, deleteWithResult } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';
import type { CountryType, StateType, DistrictType, WarehouseType } from '@fundifyhub/types';

/**
 * Country creation payload
 */
export interface CreateCountryPayload {
  name: string;
  code: string;
  currency?: string;
  isActive?: boolean;
}

/**
 * State creation payload
 */
export interface CreateStatePayload {
  name: string;
  code: string;
  countryId: string;
  isActive?: boolean;
}

/**
 * District creation payload
 */
export interface CreateDistrictPayload {
  name: string;
  code: string;
  stateId: string;
  isActive?: boolean;
}

/**
 * Warehouse creation payload
 */
export interface CreateWarehousePayload {
  name: string;
  code: string;
  districtId: string;
  address?: string;
  capacity?: number;
  isActive?: boolean;
}

export const geographyAdapter = {
  // ============================================
  // COUNTRIES
  // ============================================

  /**
   * Get all countries
   */
  async getCountries() {
    return getWithResult<CountryType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRIES
    );
  },

  /**
   * Get country by ID
   */
  async getCountryById(id: string) {
    return getWithResult<CountryType>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRY_BY_ID(id)
    );
  },

  /**
   * Create country (admin only)
   */
  async createCountry(payload: CreateCountryPayload) {
    return postWithResult<CountryType, CreateCountryPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRIES,
      payload
    );
  },

  /**
   * Update country (admin only)
   */
  async updateCountry(id: string, payload: Partial<CreateCountryPayload>) {
    return putWithResult<CountryType, Partial<CreateCountryPayload>>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRY_BY_ID(id),
      payload
    );
  },

  /**
   * Delete country (admin only)
   */
  async deleteCountry(id: string) {
    return deleteWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRY_BY_ID(id)
    );
  },

  // ============================================
  // STATES
  // ============================================

  /**
   * Get all states
   */
  async getStates() {
    return getWithResult<StateType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATES
    );
  },

  /**
   * Get state by ID
   */
  async getStateById(id: string) {
    return getWithResult<StateType>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATE_BY_ID(id)
    );
  },

  /**
   * Get states by country ID
   */
  async getStatesByCountry(countryId: string) {
    return getWithResult<StateType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATES_BY_COUNTRY(countryId)
    );
  },

  /**
   * Create state (admin only)
   */
  async createState(payload: CreateStatePayload) {
    return postWithResult<StateType, CreateStatePayload>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATES,
      payload
    );
  },

  /**
   * Update state (admin only)
   */
  async updateState(id: string, payload: Partial<CreateStatePayload>) {
    return putWithResult<StateType, Partial<CreateStatePayload>>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATE_BY_ID(id),
      payload
    );
  },

  /**
   * Delete state (admin only)
   */
  async deleteState(id: string) {
    return deleteWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATE_BY_ID(id)
    );
  },

  // ============================================
  // DISTRICTS
  // ============================================

  /**
   * Get all districts
   */
  async getDistricts() {
    return getWithResult<DistrictType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICTS
    );
  },

  /**
   * Get district by ID
   */
  async getDistrictById(id: string) {
    return getWithResult<DistrictType>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICT_BY_ID(id)
    );
  },

  /**
   * Get districts by state ID
   */
  async getDistrictsByState(stateId: string) {
    return getWithResult<DistrictType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICTS_BY_STATE(stateId)
    );
  },

  /**
   * Create district (admin only)
   */
  async createDistrict(payload: CreateDistrictPayload) {
    return postWithResult<DistrictType, CreateDistrictPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICTS,
      payload
    );
  },

  /**
   * Update district (admin only)
   */
  async updateDistrict(id: string, payload: Partial<CreateDistrictPayload>) {
    return putWithResult<DistrictType, Partial<CreateDistrictPayload>>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICT_BY_ID(id),
      payload
    );
  },

  /**
   * Delete district (admin only)
   */
  async deleteDistrict(id: string) {
    return deleteWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICT_BY_ID(id)
    );
  },

  // ============================================
  // WAREHOUSES
  // ============================================

  /**
   * Get all warehouses
   */
  async getWarehouses() {
    return getWithResult<WarehouseType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSES
    );
  },

  /**
   * Get warehouse by ID
   */
  async getWarehouseById(id: string) {
    return getWithResult<WarehouseType>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSE_BY_ID(id)
    );
  },

  /**
   * Get warehouses by district ID
   */
  async getWarehousesByDistrict(districtId: string) {
    return getWithResult<WarehouseType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSES_BY_DISTRICT(districtId)
    );
  },

  /**
   * Create warehouse (admin only)
   */
  async createWarehouse(payload: CreateWarehousePayload) {
    return postWithResult<WarehouseType, CreateWarehousePayload>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSES,
      payload
    );
  },

  /**
   * Update warehouse (admin only)
   */
  async updateWarehouse(id: string, payload: Partial<CreateWarehousePayload>) {
    return putWithResult<WarehouseType, Partial<CreateWarehousePayload>>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSE_BY_ID(id),
      payload
    );
  },

  /**
   * Delete warehouse (admin only)
   */
  async deleteWarehouse(id: string) {
    return deleteWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSE_BY_ID(id)
    );
  },
};

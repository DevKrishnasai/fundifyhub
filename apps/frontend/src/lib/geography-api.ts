/**
 * Geography API Client
 * Provides functions for managing countries, states, districts, and warehouses
 */

import { getWithResult, postWithResult, patchWithResult, deleteWithResult } from './api-client';
import { BACKEND_API_CONFIG } from './urls';

// ============================================================================
// COUNTRY OPERATIONS
// ============================================================================

export interface Country {
  id: string;
  name: string;
  code: string;
  dialCode: string | null;
  _count?: {
    states: number;
  };
}

export async function getCountries() {
  return getWithResult<Country[]>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRIES);
}

export async function getCountryById(id: string) {
  return getWithResult<Country>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRY_BY_ID(id));
}

export async function createCountry(data: { name: string; code: string; dialCode?: string }) {
  return postWithResult<Country>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRIES, data);
}

export async function updateCountry(id: string, data: { name?: string; code?: string; dialCode?: string }) {
  return patchWithResult<Country>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRY_BY_ID(id), data);
}

// ============================================================================
// STATE OPERATIONS
// ============================================================================

export interface State {
  id: string;
  name: string;
  code: string | null;
  countryId: string;
  country?: {
    id: string;
    name: string;
    code: string;
  };
  _count?: {
    districts: number;
  };
}

export async function getStates(countryId?: string) {
  const url = countryId 
    ? `${BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATES}?countryId=${countryId}`
    : BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATES;
  return getWithResult<State[]>(url);
}

export async function getStateById(id: string) {
  return getWithResult<State>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATE_BY_ID(id));
}

export async function createState(data: { name: string; code?: string; countryId: string }) {
  return postWithResult<State>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATES, data);
}

export async function updateState(id: string, data: { name?: string; code?: string }) {
  return patchWithResult<State>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATE_BY_ID(id), data);
}

// ============================================================================
// DISTRICT OPERATIONS
// ============================================================================

export interface District {
  id: string;
  name: string;
  code: string;
  stateId: string;
  state?: {
    id: string;
    name: string;
    country: {
      id: string;
      name: string;
    };
  };
  _count?: {
    pins: number;
    requests: number;
    users: number;
  };
}

export async function getDistricts(stateId?: string) {
  const url = stateId 
    ? `${BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICTS}?stateId=${stateId}`
    : BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICTS;
  return getWithResult<District[]>(url);
}

export async function getDistrictById(id: string) {
  return getWithResult<District>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICT_BY_ID(id));
}

export async function createDistrict(data: { name: string; stateId: string }) {
  return postWithResult<District>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICTS, data);
}

export async function updateDistrict(id: string, data: { name: string }) {
  return patchWithResult<District>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICT_BY_ID(id), data);
}

// ============================================================================
// WAREHOUSE OPERATIONS
// ============================================================================

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  districtId: string;
  address: string | null;
  capacity: number;
  currentOccupancy: number;
  managerName: string | null;
  contactNumber: string | null;
  isActive: boolean;
  district?: {
    id: string;
    name: string;
    state: {
      id: string;
      name: string;
    };
  };
}

export async function getWarehouses(districtId?: string) {
  const url = districtId 
    ? `${BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSES}?districtId=${districtId}`
    : BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSES;
  return getWithResult<Warehouse[]>(url);
}

export async function getWarehouseById(id: string) {
  return getWithResult<Warehouse>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSE_BY_ID(id));
}

export async function createWarehouse(data: {
  name: string;
  code: string;
  districtId: string;
  address?: string;
  capacity: number;
  managerName?: string;
  contactNumber?: string;
}) {
  return postWithResult<Warehouse>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSES, data);
}

export async function updateWarehouse(id: string, data: {
  name?: string;
  address?: string;
  capacity?: number;
  managerName?: string;
  contactNumber?: string;
  isActive?: boolean;
}) {
  return patchWithResult<Warehouse>(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSE_BY_ID(id), data);
}

export async function deleteWarehouse(id: string) {
  return deleteWithResult(BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSE_BY_ID(id));
}

/**
 * React Query hooks for geography data (countries, states, districts, warehouses)
 * Uses @tanstack/react-query for caching, background refetch, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { getWithResult, postWithResult, putWithResult, deleteWithResult, type ApiResult } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'

const { GEOGRAPHY } = BACKEND_API_CONFIG.ENDPOINTS

// ============================================================================
// Types
// ============================================================================

export interface Country {
  id: string
  name: string
  code: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    states: number
  }
}

export interface State {
  id: string
  name: string
  code: string
  countryId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  country?: Country
  _count?: {
    districts: number
  }
}

export interface District {
  id: string
  name: string
  code: string
  stateId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  state?: State
  _count?: {
    warehouses: number
  }
}

export interface Warehouse {
  id: string
  name: string
  code: string
  districtId: string
  address?: string
  latitude?: number
  longitude?: number
  capacity?: number
  currentCount?: number
  contactPerson?: string
  contactPhone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  district?: District
  _count?: {
    assets: number
  }
}

export interface WarehouseWithMetrics extends Warehouse {
  capacityUsed?: number
  capacityAvailable?: number | null
  capacityPercentage?: number | null
  isOverCapacity?: boolean
  isNearCapacity?: boolean
}

export interface WarehouseAsset {
  id: string
  brand?: string
  model?: string
  description?: string
  status: string
  condition: string
  assetType: string
  estimatedValue?: number
  request?: {
    id: string
    requestNumber: string
    currentStatus: string
    customer?: {
      id: string
      firstName: string
      lastName: string
    }
  }
}

export interface WarehouseInventory {
  warehouse: WarehouseWithMetrics
  assets: WarehouseAsset[]
  statusBreakdown: Record<string, number>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface WarehouseCapacitySummary {
  summary: {
    totalWarehouses: number
    totalCapacity: number
    totalAssets: number
    overallUtilization: number | null
    overCapacityCount: number
    nearCapacityCount: number
    healthyCount: number
  }
  warehouses: WarehouseWithMetrics[]
}

export interface CreateWarehousePayload {
  name: string
  code: string
  districtId: string
  address?: string
  latitude?: number
  longitude?: number
  capacity?: number
  contactPerson?: string
  contactPhone?: string
}

export interface UpdateWarehousePayload {
  name?: string
  address?: string
  latitude?: number
  longitude?: number
  capacity?: number
  contactPerson?: string
  contactPhone?: string
  isActive?: boolean
}

// ============================================================================
// Query Keys - Centralized for easy invalidation
// ============================================================================

export const geographyKeys = {
  all: ['geography'] as const,
  countries: () => [...geographyKeys.all, 'countries'] as const,
  country: (id: string) => [...geographyKeys.countries(), id] as const,
  states: () => [...geographyKeys.all, 'states'] as const,
  statesByCountry: (countryId: string) => [...geographyKeys.states(), 'byCountry', countryId] as const,
  state: (id: string) => [...geographyKeys.states(), id] as const,
  districts: () => [...geographyKeys.all, 'districts'] as const,
  districtsByState: (stateId: string) => [...geographyKeys.districts(), 'byState', stateId] as const,
  district: (id: string) => [...geographyKeys.districts(), id] as const,
  warehouses: () => [...geographyKeys.all, 'warehouses'] as const,
  warehousesByDistrict: (districtId: string) => [...geographyKeys.warehouses(), 'byDistrict', districtId] as const,
  warehouse: (id: string) => [...geographyKeys.warehouses(), id] as const,
  warehouseInventory: (id: string, filters?: Record<string, string>) => [...geographyKeys.warehouse(id), 'inventory', filters] as const,
  warehouseCapacitySummary: (filters?: Record<string, string>) => [...geographyKeys.warehouses(), 'capacity-summary', filters] as const,
}

// ============================================================================
// Countries
// ============================================================================

/**
 * Fetch all countries
 */
export function useCountries(
  options?: Omit<UseQueryOptions<Country[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.countries(),
    queryFn: async () => {
      const result = await getWithResult<Country[]>(GEOGRAPHY.COUNTRIES)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch countries')
      }
      return result.data
    },
    staleTime: 60 * 60 * 1000, // Countries rarely change, cache for 1 hour
    ...options,
  })
}

/**
 * Fetch a single country by ID
 */
export function useCountry(
  id: string,
  options?: Omit<UseQueryOptions<Country, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.country(id),
    queryFn: async () => {
      const result = await getWithResult<Country>(GEOGRAPHY.COUNTRY_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch country')
      }
      return result.data
    },
    enabled: !!id,
    ...options,
  })
}

// ============================================================================
// States
// ============================================================================

/**
 * Fetch all states
 */
export function useStates(
  options?: Omit<UseQueryOptions<State[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.states(),
    queryFn: async () => {
      const result = await getWithResult<State[]>(GEOGRAPHY.STATES)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch states')
      }
      return result.data
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
    ...options,
  })
}

/**
 * Fetch states by country ID
 */
export function useStatesByCountry(
  countryId: string,
  options?: Omit<UseQueryOptions<State[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.statesByCountry(countryId),
    queryFn: async () => {
      const result = await getWithResult<State[]>(GEOGRAPHY.STATES_BY_COUNTRY(countryId))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch states')
      }
      return result.data
    },
    enabled: !!countryId,
    staleTime: 60 * 60 * 1000,
    ...options,
  })
}

/**
 * Fetch a single state by ID
 */
export function useState(
  id: string,
  options?: Omit<UseQueryOptions<State, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.state(id),
    queryFn: async () => {
      const result = await getWithResult<State>(GEOGRAPHY.STATE_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch state')
      }
      return result.data
    },
    enabled: !!id,
    ...options,
  })
}

// ============================================================================
// Districts
// ============================================================================

/**
 * Fetch all districts
 */
export function useDistricts(
  options?: Omit<UseQueryOptions<District[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.districts(),
    queryFn: async () => {
      const result = await getWithResult<District[]>(GEOGRAPHY.DISTRICTS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch districts')
      }
      return result.data
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    ...options,
  })
}

/**
 * Fetch districts by state ID
 */
export function useDistrictsByState(
  stateId: string,
  options?: Omit<UseQueryOptions<District[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.districtsByState(stateId),
    queryFn: async () => {
      const result = await getWithResult<District[]>(GEOGRAPHY.DISTRICTS_BY_STATE(stateId))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch districts')
      }
      return result.data
    },
    enabled: !!stateId,
    staleTime: 30 * 60 * 1000,
    ...options,
  })
}

/**
 * Fetch a single district by ID
 */
export function useDistrict(
  id: string,
  options?: Omit<UseQueryOptions<District, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.district(id),
    queryFn: async () => {
      const result = await getWithResult<District>(GEOGRAPHY.DISTRICT_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch district')
      }
      return result.data
    },
    enabled: !!id,
    ...options,
  })
}

// ============================================================================
// Warehouses
// ============================================================================

/**
 * Fetch all warehouses
 */
export function useWarehouses(
  options?: Omit<UseQueryOptions<Warehouse[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.warehouses(),
    queryFn: async () => {
      const result = await getWithResult<Warehouse[]>(GEOGRAPHY.WAREHOUSES)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch warehouses')
      }
      return result.data
    },
    staleTime: 15 * 60 * 1000, // Cache for 15 minutes (warehouses may change more often)
    ...options,
  })
}

/**
 * Fetch warehouses by district ID
 */
export function useWarehousesByDistrict(
  districtId: string,
  options?: Omit<UseQueryOptions<Warehouse[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.warehousesByDistrict(districtId),
    queryFn: async () => {
      const result = await getWithResult<Warehouse[]>(GEOGRAPHY.WAREHOUSES_BY_DISTRICT(districtId))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch warehouses')
      }
      return result.data
    },
    enabled: !!districtId,
    staleTime: 15 * 60 * 1000,
    ...options,
  })
}

/**
 * Fetch a single warehouse by ID
 */
export function useWarehouse(
  id: string,
  options?: Omit<UseQueryOptions<Warehouse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.warehouse(id),
    queryFn: async () => {
      const result = await getWithResult<Warehouse>(GEOGRAPHY.WAREHOUSE_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch warehouse')
      }
      return result.data
    },
    enabled: !!id,
    ...options,
  })
}

/**
 * Fetch warehouse inventory with assets
 */
export function useWarehouseInventory(
  id: string,
  filters?: {
    status?: string
    assetType?: string
    condition?: string
    search?: string
    page?: number
    limit?: number
  },
  options?: Omit<UseQueryOptions<WarehouseInventory, Error>, 'queryKey' | 'queryFn'>
) {
  const searchParams = new URLSearchParams()
  if (filters?.status) searchParams.set('status', filters.status)
  if (filters?.assetType) searchParams.set('assetType', filters.assetType)
  if (filters?.condition) searchParams.set('condition', filters.condition)
  if (filters?.search) searchParams.set('search', filters.search)
  if (filters?.page) searchParams.set('page', String(filters.page))
  if (filters?.limit) searchParams.set('limit', String(filters.limit))

  const queryString = searchParams.toString()
  const url = `${GEOGRAPHY.WAREHOUSE_BY_ID(id)}/inventory${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: geographyKeys.warehouseInventory(id, filters as Record<string, string>),
    queryFn: async () => {
      const result = await getWithResult<WarehouseInventory>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch warehouse inventory')
      }
      return result.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Fetch warehouse capacity summary
 */
export function useWarehouseCapacitySummary(
  filters?: {
    districtId?: string
    belowCapacityThreshold?: number
  },
  options?: Omit<UseQueryOptions<WarehouseCapacitySummary, Error>, 'queryKey' | 'queryFn'>
) {
  const searchParams = new URLSearchParams()
  if (filters?.districtId) searchParams.set('districtId', filters.districtId)
  if (filters?.belowCapacityThreshold) searchParams.set('belowCapacityThreshold', String(filters.belowCapacityThreshold))

  const queryString = searchParams.toString()
  const url = `${GEOGRAPHY.WAREHOUSES}/capacity-summary${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: geographyKeys.warehouseCapacitySummary(filters as Record<string, string>),
    queryFn: async () => {
      const result = await getWithResult<WarehouseCapacitySummary>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch warehouse capacity summary')
      }
      return result.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

// ============================================================================
// Warehouse Mutations
// ============================================================================

/**
 * Create a new warehouse
 */
export function useCreateWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateWarehousePayload) => {
      const result = await postWithResult<Warehouse>(GEOGRAPHY.WAREHOUSES, data)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to create warehouse')
      }
      return result.data
    },
    onSuccess: (data) => {
      // Invalidate warehouse lists
      queryClient.invalidateQueries({ queryKey: geographyKeys.warehouses() })
      if (data.districtId) {
        queryClient.invalidateQueries({ queryKey: geographyKeys.warehousesByDistrict(data.districtId) })
      }
    },
  })
}

/**
 * Update a warehouse
 */
export function useUpdateWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWarehousePayload }) => {
      const result = await putWithResult<Warehouse>(`${GEOGRAPHY.WAREHOUSE_BY_ID(id)}`, data)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to update warehouse')
      }
      return result.data
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: geographyKeys.warehouse(variables.id) })
      queryClient.invalidateQueries({ queryKey: geographyKeys.warehouses() })
    },
  })
}

/**
 * Update warehouse capacity
 */
export function useUpdateWarehouseCapacity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, capacity }: { id: string; capacity: number }) => {
      const result = await putWithResult<WarehouseWithMetrics>(`${GEOGRAPHY.WAREHOUSE_BY_ID(id)}/capacity`, { capacity })
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to update warehouse capacity')
      }
      return result.data
    },
    onSuccess: (data, variables) => {
      // Invalidate warehouse and capacity summary
      queryClient.invalidateQueries({ queryKey: geographyKeys.warehouse(variables.id) })
      queryClient.invalidateQueries({ queryKey: geographyKeys.warehouses() })
      queryClient.invalidateQueries({ queryKey: geographyKeys.warehouseCapacitySummary() })
    },
  })
}

/**
 * Delete a warehouse (soft delete)
 */
export function useDeleteWarehouse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteWithResult<void>(`${GEOGRAPHY.WAREHOUSE_BY_ID(id)}`)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to delete warehouse')
      }
    },
    onSuccess: () => {
      // Invalidate warehouse lists
      queryClient.invalidateQueries({ queryKey: geographyKeys.warehouses() })
    },
  })
}

// ============================================================================
// Cascading Geography Selector Hook
// ============================================================================

interface GeographySelection {
  countryId: string
  stateId: string
  districtId: string
  warehouseId?: string
}

/**
 * A convenience hook for cascading geography selection.
 * Automatically fetches states when country is selected,
 * districts when state is selected, etc.
 */
export function useGeographyCascade(selection: Partial<GeographySelection>) {
  const { countryId, stateId, districtId } = selection

  const countriesQuery = useCountries()
  const statesQuery = useStatesByCountry(countryId ?? '')
  const districtsQuery = useDistrictsByState(stateId ?? '')
  const warehousesQuery = useWarehousesByDistrict(districtId ?? '')

  return {
    countries: countriesQuery.data ?? [],
    states: statesQuery.data ?? [],
    districts: districtsQuery.data ?? [],
    warehouses: warehousesQuery.data ?? [],
    isLoading:
      countriesQuery.isLoading ||
      statesQuery.isLoading ||
      districtsQuery.isLoading ||
      warehousesQuery.isLoading,
    error:
      countriesQuery.error ||
      statesQuery.error ||
      districtsQuery.error ||
      warehousesQuery.error,
  }
}

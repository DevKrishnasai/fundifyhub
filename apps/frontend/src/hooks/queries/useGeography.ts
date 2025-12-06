/**
 * React Query hooks for geography data (countries, states, districts, warehouses)
 * Uses @tanstack/react-query for caching, background refetch, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { getWithResult, postWithResult, putWithResult, deleteWithResult, type ApiResult } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'
import {
  countriesSchema,
  countrySchema,
  statesSchema,
  stateSchema,
  districtsSchema,
  districtSchema,
  warehousesSchema,
  warehouseSchema,
  warehouseInventorySchema,
  warehouseCapacitySummarySchema,
  type CountryType,
  type StateType,
  type DistrictType,
  type WarehouseType,
  type CreateWarehousePayload,
  type UpdateWarehousePayload,
  type WarehouseWithMetrics,
  type WarehouseInventory,
  type WarehouseCapacitySummary,
  type CreateCountryPayload,
  type UpdateCountryPayload,
  type CreateStatePayload,
  type UpdateStatePayload,
  type CreateDistrictPayload,
  type UpdateDistrictPayload,
} from '@fundifyhub/types'

const { GEOGRAPHY } = BACKEND_API_CONFIG.ENDPOINTS

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
  options?: Omit<UseQueryOptions<CountryType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.countries(),
    queryFn: async () => {
      const result = await getWithResult<CountryType[]>(GEOGRAPHY.COUNTRIES)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch countries')
      }
      return countriesSchema.parse(result.data) as unknown as CountryType[]
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
  options?: Omit<UseQueryOptions<CountryType, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.country(id),
    queryFn: async () => {
      const result = await getWithResult<CountryType>(GEOGRAPHY.COUNTRY_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch country')
      }
      return countrySchema.parse(result.data) as unknown as CountryType
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
  options?: Omit<UseQueryOptions<StateType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.states(),
    queryFn: async () => {
      const result = await getWithResult<StateType[]>(GEOGRAPHY.STATES)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch states')
      }
      return statesSchema.parse(result.data) as unknown as StateType[]
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
  options?: Omit<UseQueryOptions<StateType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.statesByCountry(countryId),
    queryFn: async () => {
      const result = await getWithResult<StateType[]>(GEOGRAPHY.STATES_BY_COUNTRY(countryId))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch states')
      }
      return statesSchema.parse(result.data) as unknown as StateType[]
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
  options?: Omit<UseQueryOptions<StateType, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.state(id),
    queryFn: async () => {
      const result = await getWithResult<StateType>(GEOGRAPHY.STATE_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch state')
      }
      return stateSchema.parse(result.data) as unknown as StateType
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
  options?: Omit<UseQueryOptions<DistrictType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.districts(),
    queryFn: async () => {
      const result = await getWithResult<DistrictType[]>(GEOGRAPHY.DISTRICTS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch districts')
      }
      return districtsSchema.parse(result.data) as unknown as DistrictType[]
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
  options?: Omit<UseQueryOptions<DistrictType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.districtsByState(stateId),
    queryFn: async () => {
      const result = await getWithResult<DistrictType[]>(GEOGRAPHY.DISTRICTS_BY_STATE(stateId))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch districts')
      }
      return districtsSchema.parse(result.data) as unknown as DistrictType[]
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
  options?: Omit<UseQueryOptions<DistrictType, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.district(id),
    queryFn: async () => {
      const result = await getWithResult<DistrictType>(GEOGRAPHY.DISTRICT_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch district')
      }
      return districtSchema.parse(result.data) as unknown as DistrictType
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
  options?: Omit<UseQueryOptions<WarehouseType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.warehouses(),
    queryFn: async () => {
      const result = await getWithResult<WarehouseType[]>(GEOGRAPHY.WAREHOUSES)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch warehouses')
      }
      return warehousesSchema.parse(result.data) as unknown as WarehouseType[]
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
  options?: Omit<UseQueryOptions<WarehouseType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.warehousesByDistrict(districtId),
    queryFn: async () => {
      const result = await getWithResult<WarehouseType[]>(GEOGRAPHY.WAREHOUSES_BY_DISTRICT(districtId))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch warehouses')
      }
      return warehousesSchema.parse(result.data) as unknown as WarehouseType[]
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
  options?: Omit<UseQueryOptions<WarehouseType, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: geographyKeys.warehouse(id),
    queryFn: async () => {
      const result = await getWithResult<WarehouseType>(GEOGRAPHY.WAREHOUSE_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch warehouse')
      }
      return warehouseSchema.parse(result.data) as unknown as WarehouseType
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
    status?: string | undefined
    assetType?: string | undefined
    condition?: string | undefined
    search?: string | undefined
    page?: number | undefined
    limit?: number | undefined
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
      return warehouseInventorySchema.parse(result.data)
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
      return warehouseCapacitySummarySchema.parse(result.data)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

// ============================================================================
// Country Mutations
// ============================================================================

export function useCreateCountry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateCountryPayload) => {
      const result = await postWithResult<CountryType>(GEOGRAPHY.COUNTRIES, data)
      if (!result.ok) throw new Error(result.error.message ?? 'Failed to create country')
      return countrySchema.parse(result.data) as unknown as CountryType
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geographyKeys.countries() }),
  })
}

export function useUpdateCountry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCountryPayload }) => {
      const result = await putWithResult<CountryType>(GEOGRAPHY.COUNTRY_BY_ID(id), data)
      if (!result.ok) throw new Error(result.error.message ?? 'Failed to update country')
      return countrySchema.parse(result.data) as unknown as CountryType
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: geographyKeys.country(variables.id) })
      queryClient.invalidateQueries({ queryKey: geographyKeys.countries() })
    },
  })
}

export function useDeleteCountry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteWithResult<void>(GEOGRAPHY.COUNTRY_BY_ID(id))
      if (!result.ok) throw new Error(result.error.message ?? 'Failed to delete country')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geographyKeys.countries() }),
  })
}

// ============================================================================
// State Mutations
// ============================================================================

export function useCreateState() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateStatePayload) => {
      const result = await postWithResult<StateType>(GEOGRAPHY.STATES, data)
      if (!result.ok) throw new Error(result.error.message ?? 'Failed to create state')
      return stateSchema.parse(result.data) as unknown as StateType
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: geographyKeys.states() })
      if (data.countryId) queryClient.invalidateQueries({ queryKey: geographyKeys.statesByCountry(data.countryId) })
    },
  })
}

export function useUpdateState() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStatePayload }) => {
      const result = await putWithResult<StateType>(GEOGRAPHY.STATE_BY_ID(id), data)
      if (!result.ok) throw new Error(result.error.message ?? 'Failed to update state')
      return stateSchema.parse(result.data) as unknown as StateType
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: geographyKeys.state(variables.id) })
      queryClient.invalidateQueries({ queryKey: geographyKeys.states() })
    },
  })
}

export function useDeleteState() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteWithResult<void>(GEOGRAPHY.STATE_BY_ID(id))
      if (!result.ok) throw new Error(result.error.message ?? 'Failed to delete state')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geographyKeys.states() }),
  })
}

// ============================================================================
// District Mutations
// ============================================================================

export function useCreateDistrict() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateDistrictPayload) => {
      const result = await postWithResult<DistrictType>(GEOGRAPHY.DISTRICTS, data)
      if (!result.ok) throw new Error(result.error.message ?? 'Failed to create district')
      return districtSchema.parse(result.data) as unknown as DistrictType
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: geographyKeys.districts() })
      if (data.stateId) queryClient.invalidateQueries({ queryKey: geographyKeys.districtsByState(data.stateId) })
    },
  })
}

export function useUpdateDistrict() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDistrictPayload }) => {
      const result = await putWithResult<DistrictType>(GEOGRAPHY.DISTRICT_BY_ID(id), data)
      if (!result.ok) throw new Error(result.error.message ?? 'Failed to update district')
      return districtSchema.parse(result.data) as unknown as DistrictType
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: geographyKeys.district(variables.id) })
      queryClient.invalidateQueries({ queryKey: geographyKeys.districts() })
    },
  })
}

export function useDeleteDistrict() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteWithResult<void>(GEOGRAPHY.DISTRICT_BY_ID(id))
      if (!result.ok) throw new Error(result.error.message ?? 'Failed to delete district')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: geographyKeys.districts() }),
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
      const result = await postWithResult<WarehouseType>(GEOGRAPHY.WAREHOUSES, data)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to create warehouse')
      }
      return warehouseSchema.parse(result.data) as unknown as WarehouseType
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
      const result = await putWithResult<WarehouseType>(`${GEOGRAPHY.WAREHOUSE_BY_ID(id)}`, data)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to update warehouse')
      }
      return warehouseSchema.parse(result.data) as unknown as WarehouseType
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
      return result.data // TODO: Add schema for WarehouseWithMetrics if needed, or just return data
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

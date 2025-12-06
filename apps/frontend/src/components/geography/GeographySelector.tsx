'use client'

/**
 * GeographySelector Component
 * Provides cascading dropdowns for Country → State → District → Warehouse selection.
 * Uses React Query for data fetching with caching.
 */

import { useCallback, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCountries,
  useStatesByCountry,
  useDistrictsByState,
  useWarehousesByDistrict,
  type Country,
  type State,
  type District,
  type Warehouse,
} from '@/hooks/queries'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface GeographySelection {
  countryId: string
  stateId: string
  districtId: string
  warehouseId?: string
}

export interface GeographySelectorProps {
  /** Current selection state */
  value: Partial<GeographySelection>
  /** Callback when any selection changes */
  onChange: (selection: Partial<GeographySelection>) => void
  /** Whether to show the warehouse selector */
  showWarehouse?: boolean
  /** Whether all fields are required */
  required?: boolean
  /** Whether the selectors are disabled */
  disabled?: boolean
  /** Custom class name for the container */
  className?: string
  /** Labels for each selector */
  labels?: {
    country?: string
    state?: string
    district?: string
    warehouse?: string
  }
  /** Placeholders for each selector */
  placeholders?: {
    country?: string
    state?: string
    district?: string
    warehouse?: string
  }
  /** Show inline (horizontal) or stacked (vertical) layout */
  layout?: 'inline' | 'stacked'
  /** Error messages for each field */
  errors?: {
    countryId?: string
    stateId?: string
    districtId?: string
    warehouseId?: string
  }
}

// ============================================================================
// Component
// ============================================================================

export function GeographySelector({
  value,
  onChange,
  showWarehouse = false,
  required = false,
  disabled = false,
  className,
  labels = {},
  placeholders = {},
  layout = 'stacked',
  errors = {},
}: GeographySelectorProps) {
  const { countryId, stateId, districtId, warehouseId } = value

  // Fetch data with React Query
  const countriesQuery = useCountries()
  const statesQuery = useStatesByCountry(countryId ?? '')
  const districtsQuery = useDistrictsByState(stateId ?? '')
  const warehousesQuery = useWarehousesByDistrict(districtId ?? '')

  // Handle country change - reset dependent fields
  const handleCountryChange = useCallback(
    (newCountryId: string) => {
      onChange({
        countryId: newCountryId,
        stateId: '',
        districtId: '',
        warehouseId: '',
      })
    },
    [onChange]
  )

  // Handle state change - reset dependent fields
  const handleStateChange = useCallback(
    (newStateId: string) => {
      onChange({
        ...value,
        stateId: newStateId,
        districtId: '',
        warehouseId: '',
      })
    },
    [value, onChange]
  )

  // Handle district change - reset warehouse
  const handleDistrictChange = useCallback(
    (newDistrictId: string) => {
      onChange({
        ...value,
        districtId: newDistrictId,
        warehouseId: '',
      })
    },
    [value, onChange]
  )

  // Handle warehouse change
  const handleWarehouseChange = useCallback(
    (newWarehouseId: string) => {
      onChange({
        ...value,
        warehouseId: newWarehouseId,
      })
    },
    [value, onChange]
  )

  // Merge with default labels and placeholders
  const mergedLabels = {
    country: labels.country ?? 'Country',
    state: labels.state ?? 'State',
    district: labels.district ?? 'District',
    warehouse: labels.warehouse ?? 'Warehouse',
  }

  const mergedPlaceholders = {
    country: placeholders.country ?? 'Select a country',
    state: placeholders.state ?? 'Select a state',
    district: placeholders.district ?? 'Select a district',
    warehouse: placeholders.warehouse ?? 'Select a warehouse',
  }

  const isInline = layout === 'inline'
  const containerClass = isInline
    ? 'flex flex-wrap gap-4 items-end'
    : 'space-y-4'
  const fieldClass = isInline ? 'flex-1 min-w-[200px]' : ''

  return (
    <div className={cn(containerClass, className)}>
      {/* Country Selector */}
      <div className={cn('space-y-2', fieldClass)}>
        <Label htmlFor="country-select">
          {mergedLabels.country}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {countriesQuery.isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={countryId ?? ''}
            onValueChange={handleCountryChange}
            disabled={disabled}
          >
            <SelectTrigger
              id="country-select"
              className={cn(errors.countryId && 'border-destructive')}
            >
              <SelectValue placeholder={mergedPlaceholders.country} />
            </SelectTrigger>
            <SelectContent>
              {countriesQuery.data?.map((country: Country) => (
                <SelectItem key={country.id} value={country.id}>
                  {country.name} ({country.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.countryId && (
          <p className="text-sm text-destructive">{errors.countryId}</p>
        )}
      </div>

      {/* State Selector */}
      <div className={cn('space-y-2', fieldClass)}>
        <Label htmlFor="state-select">
          {mergedLabels.state}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {statesQuery.isLoading && countryId ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={stateId ?? ''}
            onValueChange={handleStateChange}
            disabled={disabled || !countryId}
          >
            <SelectTrigger
              id="state-select"
              className={cn(errors.stateId && 'border-destructive')}
            >
              <SelectValue
                placeholder={
                  !countryId
                    ? 'Select a country first'
                    : mergedPlaceholders.state
                }
              />
            </SelectTrigger>
            <SelectContent>
              {statesQuery.data?.map((state: State) => (
                <SelectItem key={state.id} value={state.id}>
                  {state.name} ({state.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.stateId && (
          <p className="text-sm text-destructive">{errors.stateId}</p>
        )}
      </div>

      {/* District Selector */}
      <div className={cn('space-y-2', fieldClass)}>
        <Label htmlFor="district-select">
          {mergedLabels.district}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {districtsQuery.isLoading && stateId ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select
            value={districtId ?? ''}
            onValueChange={handleDistrictChange}
            disabled={disabled || !stateId}
          >
            <SelectTrigger
              id="district-select"
              className={cn(errors.districtId && 'border-destructive')}
            >
              <SelectValue
                placeholder={
                  !stateId
                    ? 'Select a state first'
                    : mergedPlaceholders.district
                }
              />
            </SelectTrigger>
            <SelectContent>
              {districtsQuery.data?.map((district: District) => (
                <SelectItem key={district.id} value={district.id}>
                  {district.name} ({district.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.districtId && (
          <p className="text-sm text-destructive">{errors.districtId}</p>
        )}
      </div>

      {/* Warehouse Selector (optional) */}
      {showWarehouse && (
        <div className={cn('space-y-2', fieldClass)}>
          <Label htmlFor="warehouse-select">
            {mergedLabels.warehouse}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {warehousesQuery.isLoading && districtId ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select
              value={warehouseId ?? ''}
              onValueChange={handleWarehouseChange}
              disabled={disabled || !districtId}
            >
              <SelectTrigger
                id="warehouse-select"
                className={cn(errors.warehouseId && 'border-destructive')}
              >
                <SelectValue
                  placeholder={
                    !districtId
                      ? 'Select a district first'
                      : mergedPlaceholders.warehouse
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {warehousesQuery.data?.map((warehouse: Warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.warehouseId && (
            <p className="text-sm text-destructive">{errors.warehouseId}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Individual Selector Components (for more granular control)
// ============================================================================

interface BaseSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  label?: string
  placeholder?: string
  error?: string
  className?: string
}

export function CountrySelect({
  value,
  onChange,
  disabled = false,
  required = false,
  label = 'Country',
  placeholder = 'Select a country',
  error,
  className,
}: BaseSelectorProps) {
  const { data: countries, isLoading } = useCountries()

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && <Label>{label}</Label>}
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn(error && 'border-destructive')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {countries?.map((country) => (
            <SelectItem key={country.id} value={country.id}>
              {country.name} ({country.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface StateSelectProps extends BaseSelectorProps {
  countryId: string
}

export function StateSelect({
  value,
  onChange,
  countryId,
  disabled = false,
  required = false,
  label = 'State',
  placeholder = 'Select a state',
  error,
  className,
}: StateSelectProps) {
  const { data: states, isLoading } = useStatesByCountry(countryId)

  if (isLoading && countryId) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && <Label>{label}</Label>}
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || !countryId}
      >
        <SelectTrigger className={cn(error && 'border-destructive')}>
          <SelectValue
            placeholder={!countryId ? 'Select a country first' : placeholder}
          />
        </SelectTrigger>
        <SelectContent>
          {states?.map((state) => (
            <SelectItem key={state.id} value={state.id}>
              {state.name} ({state.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface DistrictSelectProps extends BaseSelectorProps {
  stateId: string
}

export function DistrictSelect({
  value,
  onChange,
  stateId,
  disabled = false,
  required = false,
  label = 'District',
  placeholder = 'Select a district',
  error,
  className,
}: DistrictSelectProps) {
  const { data: districts, isLoading } = useDistrictsByState(stateId)

  if (isLoading && stateId) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && <Label>{label}</Label>}
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || !stateId}
      >
        <SelectTrigger className={cn(error && 'border-destructive')}>
          <SelectValue
            placeholder={!stateId ? 'Select a state first' : placeholder}
          />
        </SelectTrigger>
        <SelectContent>
          {districts?.map((district) => (
            <SelectItem key={district.id} value={district.id}>
              {district.name} ({district.code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface WarehouseSelectProps extends BaseSelectorProps {
  districtId: string
}

export function WarehouseSelect({
  value,
  onChange,
  districtId,
  disabled = false,
  required = false,
  label = 'Warehouse',
  placeholder = 'Select a warehouse',
  error,
  className,
}: WarehouseSelectProps) {
  const { data: warehouses, isLoading } = useWarehousesByDistrict(districtId)

  if (isLoading && districtId) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && <Label>{label}</Label>}
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || !districtId}
      >
        <SelectTrigger className={cn(error && 'border-destructive')}>
          <SelectValue
            placeholder={!districtId ? 'Select a district first' : placeholder}
          />
        </SelectTrigger>
        <SelectContent>
          {warehouses?.map((warehouse) => (
            <SelectItem key={warehouse.id} value={warehouse.id}>
              {warehouse.name} ({warehouse.code})
              {warehouse.capacity && ` - Capacity: ${warehouse.capacity}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

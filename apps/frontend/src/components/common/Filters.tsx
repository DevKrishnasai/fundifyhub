"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "lucide-react"
import { Search, Filter, X, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  DISTRICTS, 
  REQUEST_STAGE, 
  STAGE_LABELS 
} from "@fundifyhub/types"

// Special value for "All" option since Radix Select doesn't allow empty strings
const ALL_VALUE = "__all__"

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  /** Enable search input */
  showSearch?: boolean
  /** Search placeholder text */
  searchPlaceholder?: string
  /** Enable date range filter */
  showDateRange?: boolean
  /** Enable status filter */
  showStatus?: boolean
  /** Custom status options (defaults to REQUEST_STATUS) */
  statusOptions?: FilterOption[]
  /** Enable district filter */
  showDistrict?: boolean
  /** Custom district options (defaults to DISTRICTS) */
  districtOptions?: FilterOption[]
  /** Custom filters */
  customFilters?: Array<{
    key: string
    label: string
    options: FilterOption[]
    placeholder?: string
  }>
}

export interface FilterValues {
  search?: string
  startDate?: string
  endDate?: string
  status?: string
  district?: string
  [key: string]: string | undefined
}

export interface FiltersProps {
  config: FilterConfig
  values: FilterValues
  onChange: (values: FilterValues) => void
  onReset?: () => void
  className?: string
}

// Default status options from constants (using stage-based system)
const defaultStatusOptions: FilterOption[] = Object.entries(STAGE_LABELS).map(
  ([value, label]) => ({ value, label })
)

// Default district options from constants
const defaultDistrictOptions: FilterOption[] = DISTRICTS.map((d) => ({
  value: d,
  label: d,
}))

// Helper to convert internal value to select value
const toSelectValue = (value: string | undefined): string => {
  return value || ALL_VALUE
}

// Helper to convert select value to internal value
const fromSelectValue = (value: string): string | undefined => {
  return value === ALL_VALUE ? undefined : value
}

export function Filters({
  config,
  values,
  onChange,
  onReset,
  className,
}: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const {
    showSearch = true,
    searchPlaceholder = "Search...",
    showDateRange = false,
    showStatus = true,
    statusOptions = defaultStatusOptions,
    showDistrict = false,
    districtOptions = defaultDistrictOptions,
    customFilters = [],
  } = config

  const handleChange = (key: string, value: string | undefined) => {
    onChange({ ...values, [key]: value })
  }

  const handleSelectChange = (key: string, selectValue: string) => {
    handleChange(key, fromSelectValue(selectValue))
  }

  const handleReset = () => {
    const resetValues: FilterValues = {}
    if (showSearch) resetValues.search = ""
    if (showDateRange) {
      resetValues.startDate = ""
      resetValues.endDate = ""
    }
    if (showStatus) resetValues.status = ""
    if (showDistrict) resetValues.district = ""
    customFilters.forEach((f) => {
      resetValues[f.key] = ""
    })
    onChange(resetValues)
    onReset?.()
  }

  const activeFilterCount = Object.values(values).filter(
    (v) => v && v !== ""
  ).length

  // Check if we have any dropdown filters
  const hasDropdownFilters = showStatus || showDistrict || showDateRange || customFilters.length > 0

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        {showSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={values.search || ""}
              onChange={(e) => handleChange("search", e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Filter dropdowns (shown inline on desktop, popover on mobile) */}
        {hasDropdownFilters && (
          <>
            {/* Desktop inline filters */}
            <div className="hidden md:flex items-center gap-3">
              {showStatus && (
                <Select
                  value={toSelectValue(values.status)}
                  onValueChange={(v) => handleSelectChange("status", v)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {showDistrict && (
                <Select
                  value={toSelectValue(values.district)}
                  onValueChange={(v) => handleSelectChange("district", v)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Districts</SelectItem>
                    {districtOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {customFilters.map((filter) => (
                <Select
                  key={filter.key}
                  value={toSelectValue(values[filter.key])}
                  onValueChange={(v) => handleSelectChange(filter.key, v)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={filter.placeholder || `All ${filter.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>{filter.placeholder || `All ${filter.label}`}</SelectItem>
                    {filter.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}

              {showDateRange && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={values.startDate || ""}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                    className="w-[140px]"
                    placeholder="Start date"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={values.endDate || ""}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    className="w-[140px]"
                    placeholder="End date"
                  />
                </div>
              )}
            </div>

            {/* Mobile filter popover */}
            <div className="md:hidden">
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="ml-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filters</h4>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleReset}
                          className="h-auto p-1 text-xs"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>

                    {showStatus && (
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={toSelectValue(values.status)}
                          onValueChange={(v) => handleSelectChange("status", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
                            {statusOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {showDistrict && (
                      <div className="space-y-2">
                        <Label>District</Label>
                        <Select
                          value={toSelectValue(values.district)}
                          onValueChange={(v) => handleSelectChange("district", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Districts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_VALUE}>All Districts</SelectItem>
                            {districtOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {customFilters.map((filter) => (
                      <div key={filter.key} className="space-y-2">
                        <Label>{filter.label}</Label>
                        <Select
                          value={toSelectValue(values[filter.key])}
                          onValueChange={(v) => handleSelectChange(filter.key, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={filter.placeholder || `All ${filter.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ALL_VALUE}>{filter.placeholder || `All ${filter.label}`}</SelectItem>
                            {filter.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}

                    {showDateRange && (
                      <div className="space-y-2">
                        <Label>Date Range</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={values.startDate || ""}
                            onChange={(e) => handleChange("startDate", e.target.value)}
                            className="flex-1"
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <Input
                            type="date"
                            value={values.endDate || ""}
                            onChange={(e) => handleChange("endDate", e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    )}

                    <Button onClick={() => setIsOpen(false)} className="w-full">
                      Apply Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        {/* Reset button (desktop) */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="hidden md:flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.search && (
            <FilterTag
              label={`Search: "${values.search}"`}
              onRemove={() => handleChange("search", undefined)}
            />
          )}
          {values.status && (
            <FilterTag
              label={`Status: ${STAGE_LABELS[values.status as REQUEST_STAGE] || values.status}`}
              onRemove={() => handleChange("status", undefined)}
            />
          )}
          {values.district && (
            <FilterTag
              label={`District: ${values.district}`}
              onRemove={() => handleChange("district", undefined)}
            />
          )}
          {values.startDate && (
            <FilterTag
              label={`From: ${values.startDate}`}
              onRemove={() => handleChange("startDate", undefined)}
            />
          )}
          {values.endDate && (
            <FilterTag
              label={`To: ${values.endDate}`}
              onRemove={() => handleChange("endDate", undefined)}
            />
          )}
          {customFilters.map((filter) => {
            const value = values[filter.key]
            if (!value) return null
            const option = filter.options.find((o) => o.value === value)
            return (
              <FilterTag
                key={filter.key}
                label={`${filter.label}: ${option?.label || value}`}
                onRemove={() => handleChange(filter.key, undefined)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

/**
 * Zod schemas for geography entities.
 */
import { z } from 'zod'

export const countrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  isActive: z.boolean(),
  deletedAt: z.union([z.string(), z.date(), z.null()]),
  deletedBy: z.union([z.string(), z.null()]),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
})

export const stateSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  countryId: z.string(),
  isActive: z.boolean(),
  deletedAt: z.union([z.string(), z.date(), z.null()]),
  deletedBy: z.union([z.string(), z.null()]),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
})

export const districtSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  stateId: z.string(),
  isActive: z.boolean(),
  deletedAt: z.union([z.string(), z.date(), z.null()]),
  deletedBy: z.union([z.string(), z.null()]),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
})

export const warehouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  districtId: z.string(),
  address: z.union([z.string(), z.null()]),
  latitude: z.union([z.number(), z.null()]),
  longitude: z.union([z.number(), z.null()]),
  contactPerson: z.union([z.string(), z.null()]),
  contactPhone: z.union([z.string(), z.null()]),
  capacity: z.union([z.number(), z.null()]),
  currentCount: z.number(),
  isActive: z.boolean(),
  deletedAt: z.union([z.string(), z.date(), z.null()]),
  deletedBy: z.union([z.string(), z.null()]),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
})

export const countriesSchema = z.array(countrySchema)
export const statesSchema = z.array(stateSchema)
export const districtsSchema = z.array(districtSchema)
export const warehousesSchema = z.array(warehouseSchema)

export type CountrySchema = z.infer<typeof countrySchema>
export type StateSchema = z.infer<typeof stateSchema>
export type DistrictSchema = z.infer<typeof districtSchema>
export type WarehouseSchema = z.infer<typeof warehouseSchema>

export const createWarehouseSchema = warehouseSchema.pick({
  name: true,
  code: true,
  districtId: true,
  address: true,
  latitude: true,
  longitude: true,
  contactPerson: true,
  contactPhone: true,
  capacity: true,
}).extend({
  isActive: z.boolean().optional(),
})

export const updateWarehouseSchema = createWarehouseSchema.partial()

export const warehouseWithMetricsSchema = warehouseSchema.extend({
  utilizationPercentage: z.number().optional(),
  assetCount: z.number().optional(),
})

export const warehouseInventorySchema = z.object({
  warehouseId: z.string(),
  assets: z.array(z.any()), // Placeholder for Asset schema
  totalCount: z.number(),
  page: z.number(),
  limit: z.number(),
})

export const warehouseCapacitySummarySchema = z.object({
  totalCapacity: z.number(),
  totalUsed: z.number(),
  utilizationRate: z.number(),
  warehousesAtRisk: z.number(),
})

export type CreateWarehousePayload = z.infer<typeof createWarehouseSchema>
export type UpdateWarehousePayload = z.infer<typeof updateWarehouseSchema>
export type WarehouseWithMetrics = z.infer<typeof warehouseWithMetricsSchema>
export type WarehouseInventory = z.infer<typeof warehouseInventorySchema>
export type WarehouseCapacitySummary = z.infer<typeof warehouseCapacitySummarySchema>

// Country Payloads
export const createCountrySchema = countrySchema.pick({
  name: true,
  code: true,
}).extend({
  isActive: z.boolean().optional(),
})
export const updateCountrySchema = createCountrySchema.partial()

// State Payloads
export const createStateSchema = stateSchema.pick({
  name: true,
  code: true,
  countryId: true,
}).extend({
  isActive: z.boolean().optional(),
})
export const updateStateSchema = createStateSchema.partial()

// District Payloads
export const createDistrictSchema = districtSchema.pick({
  name: true,
  code: true,
  stateId: true,
}).extend({
  isActive: z.boolean().optional(),
})
export const updateDistrictSchema = createDistrictSchema.partial()

export type CreateCountryPayload = z.infer<typeof createCountrySchema>
export type UpdateCountryPayload = z.infer<typeof updateCountrySchema>
export type CreateStatePayload = z.infer<typeof createStateSchema>
export type UpdateStatePayload = z.infer<typeof updateStateSchema>
export type CreateDistrictPayload = z.infer<typeof createDistrictSchema>
export type UpdateDistrictPayload = z.infer<typeof updateDistrictSchema>

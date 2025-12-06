/**
 * Query hooks for React Query
 * Re-export all query hooks from this file for easy imports
 */

// Authentication hooks
export * from './useAuthMutations'

// Geography hooks (countries, states, districts, warehouses)
export * from './useGeography'
export type { CountryType as Country, StateType as State, DistrictType as District, WarehouseType as Warehouse, WarehouseInventory, WarehouseCapacitySummary, WarehouseWithMetrics } from '@fundifyhub/types'

// Asset management hooks
export * from './useAssets'

// Auction system hooks
export * from './useAuctions'

// Request/Loan management hooks
export * from './useRequests'
export * from './useLoans'

// Payment hooks (new)
export * from './usePayments'

// User management hooks
export * from './useUsers'

// Settings hooks
export * from './useSettings'

// Dashboard hooks
export * from './useDashboard'

// Notification hooks
export * from './useNotifications'

// Analytics hooks
export * from './useAnalytics'

// Audit logs hooks
export * from './useAuditLogs'

// Audit log hooks
export * from './useAuditLogs'

// Analytics hooks
export * from './useAnalytics'

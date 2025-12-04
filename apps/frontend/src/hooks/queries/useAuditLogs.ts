/**
 * React Query hooks for Audit Logs
 * Provides data fetching and caching for audit log viewing
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { getWithResult } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'

const { ENDPOINTS } = BACKEND_API_CONFIG
const { ADMIN } = ENDPOINTS

// ============================================================================
// Query Keys Factory
// ============================================================================

export const auditLogKeys = {
  all: ['auditLogs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: AuditLogFilters) => [...auditLogKeys.lists(), filters] as const,
  details: () => [...auditLogKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditLogKeys.details(), id] as const,
  stats: () => [...auditLogKeys.all, 'stats'] as const,
  byEntity: (entityType: string, entityId: string) => [...auditLogKeys.all, 'entity', entityType, entityId] as const,
}

// ============================================================================
// Types
// ============================================================================

export interface AuditLogFilters {
  page?: number
  limit?: number
  action?: string
  entityType?: string
  actorId?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface AuditLog {
  id: string
  actorId: string
  actorEmail?: string
  actorName?: string
  action: string
  entityType: string
  entityId: string
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  }
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

interface AuditLogListResponse {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface AuditLogStats {
  totalLogs: number
  logsByAction: Record<string, number>
  logsByEntityType: Record<string, number>
  recentActivity: {
    date: string
    count: number
  }[]
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch paginated audit log list
 */
export function useAuditLogs(
  filters: AuditLogFilters = {},
  options?: Omit<UseQueryOptions<AuditLogListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const queryParams = new URLSearchParams()
  
  if (filters.page) queryParams.set('page', String(filters.page))
  if (filters.limit) queryParams.set('limit', String(filters.limit))
  if (filters.action) queryParams.set('action', filters.action)
  if (filters.entityType) queryParams.set('entityType', filters.entityType)
  if (filters.actorId) queryParams.set('actorId', filters.actorId)
  if (filters.startDate) queryParams.set('startDate', filters.startDate)
  if (filters.endDate) queryParams.set('endDate', filters.endDate)
  if (filters.search) queryParams.set('search', filters.search)

  const queryString = queryParams.toString()
  const url = `${ADMIN.AUDIT_LOGS}${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: async () => {
      const result = await getWithResult<AuditLogListResponse>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch audit logs')
      }
      return result.data
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

/**
 * Fetch single audit log by ID
 */
export function useAuditLog(
  id: string,
  options?: Omit<UseQueryOptions<AuditLog, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: auditLogKeys.detail(id),
    queryFn: async () => {
      const result = await getWithResult<AuditLog>(ADMIN.AUDIT_LOG_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch audit log')
      }
      return result.data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes (audit logs don't change)
    ...options,
  })
}

/**
 * Fetch audit log stats
 */
export function useAuditLogStats(
  options?: Omit<UseQueryOptions<AuditLogStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: auditLogKeys.stats(),
    queryFn: async () => {
      const result = await getWithResult<AuditLogStats>(ADMIN.AUDIT_LOGS_STATS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch audit log stats')
      }
      return result.data
    },
    staleTime: 60 * 1000, // 1 minute
    ...options,
  })
}

/**
 * Fetch audit logs for a specific entity
 */
export function useEntityAuditLogs(
  entityType: string,
  entityId: string,
  options?: Omit<UseQueryOptions<AuditLog[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: auditLogKeys.byEntity(entityType, entityId),
    queryFn: async () => {
      const result = await getWithResult<AuditLog[]>(ADMIN.AUDIT_LOGS_ENTITY(entityType, entityId))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch entity audit logs')
      }
      return result.data
    },
    enabled: !!entityType && !!entityId,
    staleTime: 30 * 1000,
    ...options,
  })
}

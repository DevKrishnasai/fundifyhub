/**
 * React Query hooks for Notification management
 * Provides data fetching, caching, and mutations for notifications
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { getWithResult, postWithResult, del } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'

const { ENDPOINTS } = BACKEND_API_CONFIG
const { NOTIFICATIONS } = ENDPOINTS

// ============================================================================
// Query Keys Factory
// ============================================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: NotificationFilters) => [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
}

// ============================================================================
// Types
// ============================================================================

export interface NotificationFilters {
  page?: number
  limit?: number
  type?: string
  read?: boolean
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
}

interface NotificationListResponse {
  notifications: Notification[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch paginated notification list
 */
export function useNotifications(
  filters: NotificationFilters = {},
  options?: Omit<UseQueryOptions<NotificationListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const queryParams = new URLSearchParams()
  
  if (filters.page) queryParams.set('page', String(filters.page))
  if (filters.limit) queryParams.set('limit', String(filters.limit))
  if (filters.type) queryParams.set('type', filters.type)
  if (filters.read !== undefined) queryParams.set('read', String(filters.read))

  const queryString = queryParams.toString()
  const url = `${NOTIFICATIONS.LIST}${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: async () => {
      const result = await getWithResult<NotificationListResponse>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch notifications')
      }
      return result.data
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

/**
 * Fetch unread notification count
 */
export function useUnreadNotificationCount(
  options?: Omit<UseQueryOptions<{ count: number }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await getWithResult<{ count: number }>(NOTIFICATIONS.UNREAD_COUNT)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch unread count')
      }
      return result.data
    },
    staleTime: 15 * 1000, // 15 seconds for count
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    ...options,
  })
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await postWithResult(NOTIFICATIONS.MARK_READ(notificationId), {})
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to mark as read')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await postWithResult(NOTIFICATIONS.MARK_ALL_READ, {})
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to mark all as read')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

/**
 * Archive notification
 */
export function useArchiveNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await postWithResult(NOTIFICATIONS.ARCHIVE(notificationId), {})
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to archive notification')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}

/**
 * Delete notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const result = await del(NOTIFICATIONS.DELETE(notificationId))
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

/**
 * React Query hooks for Notification management
 * Provides data fetching, caching, and mutations for notifications
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { notificationsAdapter } from '../../lib/adapters'
import type { NotificationList, NotificationUnreadCount } from '@fundifyhub/types'

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

import type { NotificationFilters } from '@/lib/adapters/notifications-adapter'

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch paginated notification list
 */
export function useNotifications(
  filters: NotificationFilters = {},
  options?: Omit<UseQueryOptions<NotificationList, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: async () => {
      const result = await notificationsAdapter.getNotifications(filters)
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch notifications')
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
  options?: Omit<UseQueryOptions<NotificationUnreadCount, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await notificationsAdapter.getUnreadCount()
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch unread count')
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
      const result = await notificationsAdapter.markAsRead(notificationId)
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to mark as read')
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
      const result = await notificationsAdapter.markAllAsRead()
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to mark all as read')
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
      const result = await notificationsAdapter.archive(notificationId)
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to archive notification')
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
      const result = await notificationsAdapter.delete(notificationId)
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to delete notification')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

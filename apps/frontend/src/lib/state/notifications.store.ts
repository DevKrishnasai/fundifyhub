/**
 * Notifications Store (Zustand)
 *
 * Manages notifications state.
 *
 * @module lib/state/notifications
 */
import { create } from 'zustand'
import type { Notification } from '@/hooks/queries/useNotifications'

interface NotificationsState {
  unreadCount: number
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  markAsRead: (id: string) => void
  setNotifications: (notifications: Notification[], unreadCount: number) => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: state.unreadCount > 0 ? state.unreadCount - 1 : 0,
    })),
  setNotifications: (notifications, unreadCount) =>
    set({ notifications, unreadCount }),
}))

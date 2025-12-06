/**
 * Notifications Adapter
 *
 * Abstraction layer for notifications API calls.
 *
 * @module lib/adapters/notifications
 */

import { getWithResult, postWithResult, putWithResult, deleteWithResult } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';

/**
 * Notification filters
 */
export interface NotificationFilters {
  page?: number;
  limit?: number;
  type?: string;
  read?: boolean;
  channel?: string;
}

/**
 * Notification type
 */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: Date | null;
  archived: boolean;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification list response
 */
export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  whatsapp: boolean;
}

export const notificationsAdapter = {
  /**
   * Get notifications with filters
   */
  async getNotifications(filters?: NotificationFilters) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.type) params.append('type', filters.type);
    if (filters?.read !== undefined) params.append('read', String(filters.read));
    if (filters?.channel) params.append('channel', filters.channel);

    const url = `${BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.LIST}?${params.toString()}`;
    return getWithResult<NotificationListResponse>(url);
  },

  /**
   * Get unread count
   */
  async getUnreadCount() {
    return getWithResult<{ count: number }>(
      BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT
    );
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: string) {
    return putWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ(id)
    );
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    return putWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ
    );
  },

  /**
   * Archive notification
   */
  async archive(id: string) {
    return putWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.ARCHIVE(id)
    );
  },

  /**
   * Delete notification
   */
  async delete(id: string) {
    return deleteWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.NOTIFICATIONS.DELETE(id)
    );
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: NotificationPreferences) {
    return putWithResult<{ success: boolean }, NotificationPreferences>(
      `${BACKEND_API_CONFIG.BASE_URL}/api/v1/notifications/preferences`,
      preferences
    );
  },

  /**
   * Get notification preferences
   */
  async getPreferences() {
    return getWithResult<NotificationPreferences>(
      `${BACKEND_API_CONFIG.BASE_URL}/api/v1/notifications/preferences`
    );
  },
};

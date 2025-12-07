/**
 * Notifications API Functions
 * API calls for notifications using apiClient
 */

import { apiClient } from '@/lib/api-client';

export const notificationsApi = {
  getAll: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.post('/notifications/mark-all-read');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },
};

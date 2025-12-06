import { api, BackendEnvelope } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';
import type { NotificationList, NotificationUnreadCount } from '@fundifyhub/types';

const { NOTIFICATIONS } = BACKEND_API_CONFIG.ENDPOINTS;

export interface NotificationFilters {
  read?: boolean;
  page?: number;
  limit?: number;
}

type AdapterResponse<T> = 
  | { ok: true; data: T; error?: never }
  | { ok: false; data?: never; error: { message: string } };

async function safeApiCall<T>(promise: Promise<any>): Promise<AdapterResponse<T>> {
  try {
    const response = await promise;
    const body = response.data as BackendEnvelope<T>;
    if (body.success) {
      return { ok: true, data: body.data as T };
    } else {
      return { ok: false, error: { message: body.message || 'Unknown error' } };
    }
  } catch (e: any) {
    const msg = e.response?.data?.message || e.message || 'Network error';
    return { ok: false, error: { message: msg } };
  }
}

export const notificationsAdapter = {
  getNotifications: (filters: NotificationFilters) => 
    safeApiCall<NotificationList>(api.get(NOTIFICATIONS.LIST, { params: filters })),

  getUnreadCount: () => 
    safeApiCall<NotificationUnreadCount>(api.get(NOTIFICATIONS.UNREAD_COUNT)),

  markAsRead: (id: string) => 
    safeApiCall<void>(api.put(NOTIFICATIONS.MARK_READ(id))),

  markAllAsRead: () => 
    safeApiCall<void>(api.put(NOTIFICATIONS.MARK_ALL_READ)),
};

/**
 * Requests API Functions
 * API calls for loan requests using apiClient
 */

import { apiClient } from '@/lib/api-client';

export const requestsApi = {
  getAll: async (params?: any) => {
    const response = await apiClient.get('/requests', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/requests/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/requests', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/requests/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.post(`/requests/${id}/status`, { status });
    return response.data;
  },
};

/**
 * Users Adapter
 * 
 * Handles all user-related API calls:
 * - User profile
 * - User management (admin)
 * - User assignments
 * - Dashboard stats
 * 
 * @module lib/adapters/users
 */

import { get, post, patch, type ApiResult } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import type { UserType } from '@fundifyhub/types';

const { ENDPOINTS } = BACKEND_API_CONFIG;

export interface UserListFilters {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  districtId?: string;
  stateId?: string;
}

export interface UserListResponse {
  users: UserType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
}

export interface DashboardStatsResponse {
  totalRequests?: number;
  activeLoans?: number;
  pendingRequests?: number;
  totalDisbursed?: number;
  pendingCount?: number;
  completedToday?: number;
  overdueEMIs?: number;
  pendingInspections?: number;
  completedInspections?: number;
  totalUsers?: number;
  totalCollected?: number;
  totalBorrowed?: number;
  totalRepaid?: number;
}

export const usersAdapter = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResult<UserType>> {
    try {
      const response = await get<UserType>(ENDPOINTS.USER.PROFILE);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch profile',
        },
      };
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<ApiResult<UserType>> {
    try {
      const response = await patch<UserType>(ENDPOINTS.USER.UPDATE_PROFILE, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to update profile',
        },
      };
    }
  },

  /**
   * Get user dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResult<DashboardStatsResponse>> {
    try {
      const response = await get<DashboardStatsResponse>(ENDPOINTS.USER.DASHBOARD_STATS);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch dashboard stats',
        },
      };
    }
  },

  /**
   * Get active loans count
   */
  async getActiveLoansCount(): Promise<ApiResult<{ count: number }>> {
    try {
      const response = await get<{ count: number }>(ENDPOINTS.USER.ACTIVE_LOANS_COUNT);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch active loans count',
        },
      };
    }
  },

  /**
   * Get pending loans count
   */
  async getPendingLoansCount(): Promise<ApiResult<{ count: number }>> {
    try {
      const response = await get<{ count: number }>(ENDPOINTS.USER.PENDING_LOANS_COUNT);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch pending loans count',
        },
      };
    }
  },

  /**
   * Get total borrowed amount
   */
  async getTotalBorrowed(): Promise<ApiResult<{ amount: number }>> {
    try {
      const response = await get<{ amount: number }>(ENDPOINTS.USER.TOTAL_BORROW);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch total borrowed amount',
        },
      };
    }
  },

  /**
   * List all users (admin only)
   */
  async listUsers(filters: UserListFilters = {}): Promise<ApiResult<UserListResponse>> {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.role) params.append('role', filters.role);
      if (filters.search) params.append('search', filters.search);
      if (filters.districtId) params.append('districtId', filters.districtId);
      if (filters.stateId) params.append('stateId', filters.stateId);

      const response = await get<UserListResponse>(
        `${ENDPOINTS.ADMIN.USERS}?${params.toString()}`
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch users',
        },
      };
    }
  },

  /**
   * Get user by ID (admin only)
   */
  async getUserById(userId: string): Promise<ApiResult<UserType>> {
    try {
      const response = await get<UserType>(ENDPOINTS.ADMIN.USER_BY_ID(userId));
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to fetch user',
        },
      };
    }
  },
};

/**
 * React Query hooks for Users
 * 
 * Provides:
 * - User profile management
 * - Dashboard statistics
 * - User list (admin)
 * - Loan/request counts
 * 
 * @module hooks/queries/useUsersQuery
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersAdapter, type UpdateProfilePayload, type UserListFilters } from '@/lib/adapters/users-adapter';
import type { UserType } from '@fundifyhub/types';

// ============================================================================
// Query Keys
// ============================================================================

export const userKeys = {
  all: ['users'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  dashboardStats: () => [...userKeys.all, 'dashboard-stats'] as const,
  activeLoansCount: () => [...userKeys.all, 'active-loans-count'] as const,
  pendingLoansCount: () => [...userKeys.all, 'pending-loans-count'] as const,
  totalBorrowed: () => [...userKeys.all, 'total-borrowed'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserListFilters) => [...userKeys.lists(), filters] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Get current user profile
 */
export function useUserProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: async () => {
      const result = await usersAdapter.getProfile();
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled !== false,
  });
}

/**
 * Get dashboard statistics for current user
 */
export function useDashboardStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.dashboardStats(),
    queryFn: async () => {
      const result = await usersAdapter.getDashboardStats();
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent updates)
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled !== false,
  });
}

/**
 * Get active loans count for current user
 */
export function useActiveLoansCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.activeLoansCount(),
    queryFn: async () => {
      const result = await usersAdapter.getActiveLoansCount();
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data.count;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
}

/**
 * Get pending loans count for current user
 */
export function usePendingLoansCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.pendingLoansCount(),
    queryFn: async () => {
      const result = await usersAdapter.getPendingLoansCount();
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data.count;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
}

/**
 * Get total borrowed amount for current user
 */
export function useTotalBorrowed(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.totalBorrowed(),
    queryFn: async () => {
      const result = await usersAdapter.getTotalBorrowed();
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data.amount;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
}

/**
 * List users (admin only)
 */
export function useUsersList(filters: UserListFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => {
      const result = await usersAdapter.listUsers(filters);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
}

/**
 * Get user by ID (admin only)
 */
export function useUserById(userId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      const result = await usersAdapter.getUserById(userId);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!userId && (options?.enabled !== false),
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update user profile mutation
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => usersAdapter.updateProfile(payload),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      }
    },
  });
}

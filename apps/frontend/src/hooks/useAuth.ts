/**
 * Auth Hook
 *
 * Provides authentication state and actions.
 *
 * @module hooks/useAuth
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAdapter, type LoginPayload, type RegisterPayload, type ChangePasswordPayload } from '../lib/adapters';
import type { UserType } from '@fundifyhub/types';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, ...query } = useQuery<UserType | null>({
    queryKey: ['user'],
    queryFn: async () => {
      const result = await authAdapter.getCurrentUser();
      if (!result.ok) {
        return null;
      }
      return result.data;
    },
    staleTime: Infinity,
    retry: false,
  });

  const login = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const result = await authAdapter.login(payload);
      if (!result.ok) {
        throw new Error(result.error.message || 'Login failed');
      }
      return result.data.user;
    },
    onSuccess: (userData: UserType) => {
      queryClient.setQueryData(['user'], userData);
    },
  });

  const register = useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const result = await authAdapter.register(payload);
      if (!result.ok) {
        throw new Error(result.error.message || 'Registration failed');
      }
      return result.data.user;
    },
    onSuccess: (userData: UserType) => {
      queryClient.setQueryData(['user'], userData);
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      const result = await authAdapter.logout();
      if (!result.ok) {
        throw new Error(result.error.message || 'Logout failed');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      queryClient.clear(); // Clear all queries on logout
    },
  });

  const changePassword = useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const result = await authAdapter.changePassword(payload);
      if (!result.ok) {
        throw new Error(result.error.message || 'Password change failed');
      }
      return result.data;
    },
  });

  return {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    changePassword,
    ...query,
  };
}

/**
 * Auth Hooks
 * React Query hooks for authentication
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type LoginPayload, type RegisterPayload } from '../api';
import { useRouter } from 'next/navigation';

export function useAuth() {
  return useQuery({
    queryKey: ['auth', 'current-user'],
    queryFn: authApi.getCurrentUser,
    retry: false,
  });
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/dashboard');
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: () => {
      router.push('/auth/login');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      router.push('/auth/login');
    },
  });
}

/**
 * React Query hooks for Authentication
 * 
 * Provides:
 * - Login/Register mutations
 * - Session validation
 * - OTP verification
 * - Password reset flows
 * 
 * @module hooks/queries/useAuth
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAdapter, type LoginPayload, type RegisterPayload, type ChangePasswordPayload } from '@/lib/adapters/auth-adapter';
import type { UserType } from '@fundifyhub/types';

// ============================================================================
// Query Keys
// ============================================================================

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  validate: () => [...authKeys.all, 'validate'] as const,
};

// ============================================================================
// Mutations
// ============================================================================

/**
 * Login mutation hook
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authAdapter.login(payload),
    onSuccess: (result) => {
      if (result.ok && result.data) {
        // Invalidate auth queries to refetch user data
        queryClient.invalidateQueries({ queryKey: authKeys.session() });
        queryClient.invalidateQueries({ queryKey: authKeys.validate() });
      }
    },
  });
}

/**
 * Register mutation hook
 */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authAdapter.register(payload),
    onSuccess: (result) => {
      if (result.ok && result.data) {
        // Invalidate auth queries to refetch user data
        queryClient.invalidateQueries({ queryKey: authKeys.session() });
      }
    },
  });
}

/**
 * Logout mutation hook
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authAdapter.logout(),
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.removeQueries();
    },
  });
}

/**
 * Check email/phone availability mutation hook
 */
export function useCheckAvailability() {
  return useMutation({
    mutationFn: (payload: { email?: string; phone?: string }) =>
      authAdapter.checkAvailability(payload),
  });
}

/**
 * Send OTP mutation hook
 */
export function useSendOtp() {
  return useMutation({
    mutationFn: (payload: { email?: string; phone?: string; purpose?: 'verification' | 'password-reset' }) =>
      authAdapter.sendOtp(payload),
  });
}

/**
 * Verify OTP mutation hook
 */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: (payload: { email?: string; phone?: string; otp: string }) =>
      authAdapter.verifyOtp(payload),
  });
}

/**
 * Resend OTP mutation hook
 */
export function useResendOtp() {
  return useMutation({
    mutationFn: (payload: { email?: string; phone?: string }) =>
      authAdapter.resendOtp(payload),
  });
}

/**
 * Change password mutation hook
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      authAdapter.changePassword(payload),
  });
}

/**
 * Forgot password mutation hook
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: { email: string }) =>
      authAdapter.forgotPassword(payload),
  });
}

/**
 * Reset password mutation hook
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: { token: string; newPassword: string }) =>
      authAdapter.resetPassword(payload),
  });
}

/**
 * Validate session query hook
 */
export function useValidateSession(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: authKeys.validate(),
    queryFn: async () => {
      const result = await authAdapter.validate();
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled !== false,
    retry: false,
  });
}

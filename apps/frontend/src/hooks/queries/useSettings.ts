/**
 * React Query hooks for Settings (Profile, Security, Services)
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { 
  profileUpdateSchema, 
  changePasswordSchema, 
  emailConfigSchema,
  type ProfileUpdatePayload,
  type ChangePasswordPayload,
  type EmailConfigPayload,
  type ServiceConfigType,
  type ServiceStatusType
} from '@fundifyhub/types'
import { getWithResult, postWithResult, putWithResult, patchWithResult, type ApiResult } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'

const { AUTH, SERVICES } = BACKEND_API_CONFIG.ENDPOINTS

export const settingsKeys = {
  all: ['settings'] as const,
  services: () => [...settingsKeys.all, 'services'] as const,
  service: (name: string) => [...settingsKeys.services(), name] as const,
}

// ============================================================================
// Profile & Security
// ============================================================================

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: ProfileUpdatePayload) => {
      const result = await patchWithResult<any>(AUTH.PROFILE, data)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to update profile')
      }
      return result.data
    },
    onSuccess: () => {
      // Invalidate user query if it exists (usually handled by AuthContext, but good to have)
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
    }
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordPayload) => {
      const result = await postWithResult<void>(AUTH.CHANGE_PASSWORD, data)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to change password')
      }
      return result.data
    }
  })
}

// ============================================================================
// Services (Email, WhatsApp, etc.)
// ============================================================================

export function useServiceStatus(
  options?: Omit<UseQueryOptions<ServiceConfigType[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: settingsKeys.services(),
    queryFn: async () => {
      const result = await getWithResult<ServiceConfigType[]>(SERVICES.STATUS)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch service status')
      }
      return result.data
    },
    refetchInterval: 10000, // Poll every 10s for status updates (QR codes, connection status)
    ...options,
  })
}

export function useUpdateServiceConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceName, config }: { serviceName: string; config: EmailConfigPayload | Record<string, unknown> }) => {
      const result = await putWithResult<ServiceConfigType>(SERVICES.CONFIG(serviceName), config)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to update service config')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.services() })
    }
  })
}

export function useToggleService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ serviceName, enabled }: { serviceName: string; enabled: boolean }) => {
      const result = await postWithResult<ServiceConfigType>(SERVICES.TOGGLE(serviceName), { enabled })
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to toggle service')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.services() })
    }
  })
}

export function useTestService() {
  return useMutation({
    mutationFn: async ({ serviceName, payload }: { serviceName: string; payload: Record<string, unknown> }) => {
      const result = await postWithResult<void>(SERVICES.TEST(serviceName), payload)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to test service')
      }
      return result.data
    }
  })
}

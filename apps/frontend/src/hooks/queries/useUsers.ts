/**
 * React Query hooks for User management
 * Provides data fetching, caching, and mutations for users
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { getWithResult, postWithResult, patch, del } from '@/lib/api-client'
import { BACKEND_API_CONFIG } from '@/lib/urls'
import type { UserType } from '@fundifyhub/types'

const { ENDPOINTS } = BACKEND_API_CONFIG
const { ADMIN, USER } = ENDPOINTS

// ============================================================================
// Query Keys Factory
// ============================================================================

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserListFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  profile: () => ['profile'] as const,
}

// ============================================================================
// Types
// ============================================================================

export interface UserListFilters {
  page?: number | undefined
  limit?: number | undefined
  role?: string | undefined
  status?: string | undefined
  search?: string | undefined
  district?: string | undefined
  state?: string | undefined
  sortBy?: string | undefined
  sortOrder?: 'asc' | 'desc' | undefined
}

interface UserListResponse {
  users: UserType[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface CreateUserPayload {
  email: string
  phoneNumber: string
  firstName: string
  lastName: string
  roles: string[]
  password?: string
  homeDistrictId?: string
}

interface UpdateUserPayload {
  firstName?: string | undefined
  lastName?: string | undefined
  phoneNumber?: string | undefined
  roles?: string[] | undefined
  accountStatus?: string | undefined
  homeDistrictId?: string | undefined
}

interface UpdateProfilePayload {
  firstName?: string | undefined
  lastName?: string | undefined
  phoneNumber?: string | undefined
  address?: string | undefined
  dateOfBirth?: string | undefined
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch paginated user list (admin view)
 */
export function useUsers(
  filters: UserListFilters = {},
  options?: Omit<UseQueryOptions<UserListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const queryParams = new URLSearchParams()
  
  if (filters.page) queryParams.set('page', String(filters.page))
  if (filters.limit) queryParams.set('limit', String(filters.limit))
  if (filters.role) queryParams.set('role', filters.role)
  if (filters.status) queryParams.set('status', filters.status)
  if (filters.search) queryParams.set('search', filters.search)
  if (filters.district) queryParams.set('district', filters.district)
  if (filters.state) queryParams.set('state', filters.state)
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy)
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder)

  const queryString = queryParams.toString()
  const url = `${ADMIN.USERS}${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => {
      const result = await getWithResult<UserListResponse>(url)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch users')
      }
      return result.data
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

/**
 * Fetch single user by ID
 */
export function useUser(
  id: string,
  options?: Omit<UseQueryOptions<UserType, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const result = await getWithResult<UserType>(ADMIN.USER_BY_ID(id))
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch user')
      }
      return result.data
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  })
}

/**
 * Fetch current user profile
 */
export function useProfile(
  options?: Omit<UseQueryOptions<UserType, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: async () => {
      const result = await getWithResult<UserType>(USER.PROFILE)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to fetch profile')
      }
      return result.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create new user (admin)
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: CreateUserPayload) => {
      const result = await postWithResult<UserType>(ADMIN.USERS, userData)
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to create user')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

/**
 * Update user (admin)
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...userData }: UpdateUserPayload & { id: string }) => {
      const result = await patch(ADMIN.USER_BY_ID(id), userData)
      return result
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

/**
 * Update current user profile
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profileData: UpdateProfilePayload) => {
      const result = await patch(USER.UPDATE_PROFILE, profileData)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
    },
  })
}

/**
 * Delete user (admin)
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await del(ADMIN.USER_BY_ID(id))
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

/**
 * Suspend user (admin)
 */
export function useSuspendUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await patch(ADMIN.USER_BY_ID(id), { accountStatus: 'SUSPENDED' })
      return result
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

/**
 * Activate user (admin)
 */
export function useActivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await patch(ADMIN.USER_BY_ID(id), { accountStatus: 'ACTIVE' })
      return result
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

/**
 * Reset user password (admin)
 */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const result = await postWithResult(`${ADMIN.USER_BY_ID(id)}/reset-password`, { newPassword })
      if (!result.ok) {
        throw new Error(result.error.message ?? 'Failed to reset password')
      }
      return result.data
    },
  })
}

/**
 * User Store (Zustand)
 *
 * Manages user authentication state.
 *
 * @module lib/state/user
 */
import { create } from 'zustand'
import type { UserType } from '@fundifyhub/types'

interface UserState {
  user: UserType | null
  isAuthenticated: boolean
  setUser: (user: UserType | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserState>((set ) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user: UserType | null) => set({ user, isAuthenticated: !!user }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
}))

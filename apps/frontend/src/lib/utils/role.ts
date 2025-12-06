/**
 * Role Utilities
 *
 * Provides utility functions for working with user roles.
 *
 * @module lib/utils/role
 */
import type { UserType } from '@fundifyhub/types'

export function isCustomer(user?: UserType) {
  return user?.roles.includes('CUSTOMER')
}

export function isAgent(user?: UserType) {
  return user?.roles.includes('AGENT')
}

export function isDistrictAdmin(user?: UserType) {
  return user?.roles.includes('DISTRICT_ADMIN')
}

export function isStateAdmin(user?: UserType) {
  return user?.roles.includes('STATE_ADMIN')
}

export function isSuperAdmin(user?: UserType) {
  return user?.roles.includes('SUPER_ADMIN')
}

export function isAnyAdmin(user?: UserType) {
  return isDistrictAdmin(user) || isStateAdmin(user) || isSuperAdmin(user)
}

export function canManageRequests(user?: UserType) {
  return isAnyAdmin(user)
}

export function canManageLoans(user?: UserType) {
  return isAnyAdmin(user)
}

export function canManageAuctions(user?: UserType) {
  return isSuperAdmin(user)
}

export function getDefaultDashboard(user?: UserType) {
  if (isSuperAdmin(user)) {
    return '/admin/dashboard'
  }
  if (isStateAdmin(user)) {
    return '/admin/dashboard'
  }
  if (isDistrictAdmin(user)) {
    return '/admin/dashboard'
  }
  if (isAgent(user)) {
    return '/agent/dashboard'
  }
  if (isCustomer(user)) {
    return '/customer/dashboard'
  }
  return '/'
}

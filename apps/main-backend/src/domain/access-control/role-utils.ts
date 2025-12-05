/**
 * Role Utilities
 *
 * Helper functions for role checking and display.
 * These are convenience wrappers around the main RBAC layer.
 */

import { ROLES } from '@fundifyhub/types';
import type { RBACUser } from './rbac';

/**
 * Check if user is a customer
 */
export function isCustomer(user: RBACUser | undefined): boolean {
  return user?.roles?.includes(ROLES.CUSTOMER) ?? false;
}

/**
 * Check if user is an agent
 */
export function isAgent(user: RBACUser | undefined): boolean {
  return user?.roles?.includes(ROLES.AGENT) ?? false;
}

/**
 * Check if user is a district admin
 */
export function isDistrictAdmin(user: RBACUser | undefined): boolean {
  return user?.roles?.includes(ROLES.DISTRICT_ADMIN) ?? false;
}

/**
 * Check if user is a state admin
 */
export function isStateAdmin(user: RBACUser | undefined): boolean {
  return user?.roles?.includes(ROLES.STATE_ADMIN) ?? false;
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(user: RBACUser | undefined): boolean {
  return user?.roles?.includes(ROLES.SUPER_ADMIN) ?? false;
}

/**
 * Check if user is any kind of admin
 */
export function isAdmin(user: RBACUser | undefined): boolean {
  const adminRoles: Array<(typeof ROLES)[keyof typeof ROLES]> = [
    ROLES.DISTRICT_ADMIN,
    ROLES.STATE_ADMIN,
    ROLES.SUPER_ADMIN,
  ];
  return user?.roles?.some((role) => adminRoles.includes(role as (typeof ROLES)[keyof typeof ROLES])) ?? false;
}

/**
 * Get primary role (first role in array)
 */
export function getPrimaryRole(user: RBACUser | undefined): string | null {
  return user?.roles?.[0] ?? null;
}

/**
 * Get role label for display
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    [ROLES.CUSTOMER]: 'Customer',
    [ROLES.AGENT]: 'Loan Agent',
    [ROLES.DISTRICT_ADMIN]: 'District Admin',
    [ROLES.STATE_ADMIN]: 'State Admin',
    [ROLES.SUPER_ADMIN]: 'Super Admin',
  };
  return labels[role] ?? role;
}

/**
 * Get all role labels for a user
 */
export function getUserRoleLabels(user: RBACUser | undefined): string[] {
  return user?.roles?.map(getRoleLabel) ?? [];
}

/**
 * Check if user has multiple roles
 */
export function hasMultipleRoles(user: RBACUser | undefined): boolean {
  return (user?.roles?.length ?? 0) > 1;
}

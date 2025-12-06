import { ROLES } from './enums';

/**
 * Permission constants for role-based access control
 */
export const PERMISSION = {
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  VIEW_ALL_USERS: 'VIEW_ALL_USERS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
} as const;

export type Permission = typeof PERMISSION[keyof typeof PERMISSION];

/**
 * Check if a user with given roles has a specific permission
 * @param roles - Array of user roles
 * @param permission - Permission to check
 * @returns boolean
 */
export const hasPermission = (roles: string[], permission: string): boolean => {
  // Super Admin has all permissions
  if (roles.includes(ROLES.SUPER_ADMIN)) {
    return true;
  }

  // State Admin permissions
  if (roles.includes(ROLES.STATE_ADMIN)) {
    if (permission === PERMISSION.VIEW_ANALYTICS) return true;
    if (permission === PERMISSION.VIEW_ALL_USERS) return true;
  }

  // District Admin permissions
  if (roles.includes(ROLES.DISTRICT_ADMIN)) {
    // Add district admin specific permissions if any
  }

  return false;
};

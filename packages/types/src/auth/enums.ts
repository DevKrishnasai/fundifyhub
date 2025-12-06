/**
 * User roles in the system
 * Ordered by hierarchy (lowest to highest privilege)
 */
export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  AGENT: 'AGENT',
  DISTRICT_ADMIN: 'DISTRICT_ADMIN',
  STATE_ADMIN: 'STATE_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
export type UserRole = Role;

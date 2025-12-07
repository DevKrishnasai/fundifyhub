/**
 * User-related constants and enums
 * Aligned with Prisma schema
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  DISTRICT_ADMIN = 'DISTRICT_ADMIN',
  STATE_ADMIN = 'STATE_ADMIN',
  COUNTRY_ADMIN = 'COUNTRY_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const USER_ROLES = Object.values(UserRole);

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CUSTOMER]: 0,
  [UserRole.AGENT]: 1,
  [UserRole.DISTRICT_ADMIN]: 2,
  [UserRole.STATE_ADMIN]: 3,
  [UserRole.COUNTRY_ADMIN]: 4,
  [UserRole.SUPER_ADMIN]: 5,
};

// Admin roles (district-level and above)
export const ADMIN_ROLES = [
  UserRole.DISTRICT_ADMIN,
  UserRole.STATE_ADMIN,
  UserRole.COUNTRY_ADMIN,
  UserRole.SUPER_ADMIN,
] as const;

// Geographic admin roles (manage specific regions)
export const GEO_ADMIN_ROLES = [
  UserRole.DISTRICT_ADMIN,
  UserRole.STATE_ADMIN,
  UserRole.COUNTRY_ADMIN,
] as const;

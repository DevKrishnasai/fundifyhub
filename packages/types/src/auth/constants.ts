import { ROLES, Role, UserRole } from './enums';

/**
 * Role hierarchy levels (higher = more access)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.CUSTOMER]: 1,
  [ROLES.AGENT]: 2,
  [ROLES.DISTRICT_ADMIN]: 3,
  [ROLES.STATE_ADMIN]: 4,
  [ROLES.SUPER_ADMIN]: 5,
};

/**
 * Role display labels
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.AGENT]: 'Agent',
  [ROLES.DISTRICT_ADMIN]: 'District Admin',
  [ROLES.STATE_ADMIN]: 'State Admin',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
};

/**
 * Roles that have admin or agent privileges
 */
export const ADMIN_AGENT_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.STATE_ADMIN,
  ROLES.DISTRICT_ADMIN,
  ROLES.AGENT,
] as const;

/**
 * Admin-only roles (no AGENT or CUSTOMER)
 */
export const ADMIN_ROLES = [
  ROLES.DISTRICT_ADMIN,
  ROLES.STATE_ADMIN,
  ROLES.SUPER_ADMIN,
] as const;

/**
 * Roles that can manage requests
 */
export const REQUEST_MANAGER_ROLES = [
  ROLES.AGENT,
  ROLES.DISTRICT_ADMIN,
  ROLES.STATE_ADMIN,
  ROLES.SUPER_ADMIN,
] as const;


/**
 * Validation patterns for user input
 */
export const VALIDATION_PATTERNS = {
  /** Indian bank account numbers (9-18 digits) */
  ACCOUNT_NUMBER: /^\d{9,18}$/,
  /** IFSC code format: 4 letters, 0, then 6 alphanumeric */
  IFSC_CODE: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  /** Account holder name: letters, spaces, and periods */
  ACCOUNT_NAME: /^[a-zA-Z\s.]+$/,
  /** UPI ID: email-like format */
  UPI_ID: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/,
  /** Indian phone number: exactly 10 digits */
  PHONE_NUMBER: /^\d{10}$/,
} as const;

export const OTP_CONSTANTS = {
  CODE_LENGTH: 6,
  DEFAULT_EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 5,
} as const;
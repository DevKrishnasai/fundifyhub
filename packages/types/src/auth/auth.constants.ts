/**
 * Authentication and user role constants
 * @module auth/auth.constants
 */

/**
 * User roles in the system
 */
export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  DISTRICT_ADMIN: 'DISTRICT_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  AGENT: 'AGENT',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Roles that have admin or agent privileges
 */
export const ADMIN_AGENT_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.DISTRICT_ADMIN,
  ROLES.AGENT,
] as const;

/**
 * Available districts for operations
 */
export const DISTRICTS = [
  'Hyderabad',
  'Warangal',
  'Nizamabad',
  'Karimnagar',
  'Khammam',
  'Mahbubnagar',
  'Nalgonda',
  'Adilabad',
  'Medak',
  'Rangareddy',
  'Sangareddy',
  'Siddipet',
  'Jagtial',
  'Peddapalli',
  'Mancherial',
  'Kamareddy',
  'Nirmal',
  'Kumuram Bheem',
  'Rajanna Sircilla',
  'Medchal-Malkajgiri',
  'Wanaparthy',
  'Nagarkurnool',
  'Jogulamba Gadwal',
  'Suryapet',
  'Yadadri Bhuvanagiri',
  'Mahabubabad',
  'Bhadradri Kothagudem',
  'Jangaon',
  'Jayashankar Bhupalpally',
  'Mulugu',
  'Narayanpet',
  'Vikarabad',
] as const;

export type District = typeof DISTRICTS[number];

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

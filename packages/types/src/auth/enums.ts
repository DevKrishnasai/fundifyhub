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

export const OTP_CHANNELS = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
} as const;

export type OtpChannel = typeof OTP_CHANNELS[keyof typeof OTP_CHANNELS];

export const OTP_PURPOSES = {
  REGISTER_EMAIL: 'REGISTER_EMAIL',
  REGISTER_PHONE: 'REGISTER_PHONE',
  RESET_PASSWORD: 'RESET_PASSWORD',
  LOGIN_ALERT: 'LOGIN_ALERT',
} as const;

export type OtpPurpose = typeof OTP_PURPOSES[keyof typeof OTP_PURPOSES];

export const ID_PROOF_TYPES = {
  AADHAAR: 'AADHAAR',
  PAN: 'PAN',
  PASSPORT: 'PASSPORT',
  DRIVING_LICENSE: 'DRIVING_LICENSE',
  VOTER_ID: 'VOTER_ID',
} as const;

export type IDProofType = typeof ID_PROOF_TYPES[keyof typeof ID_PROOF_TYPES];

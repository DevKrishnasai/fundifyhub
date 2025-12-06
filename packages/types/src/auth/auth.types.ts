/**
 * Authentication and user types
 * @module auth/auth.types
 */

/**
 * User entity type
 */
export interface UserType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles: string[];
  /** Districts assigned to the user. Always an array. */
  districts: string[];
  isActive: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * JWT token payload extending UserType
 */
export interface JWTPayloadType extends UserType {}

/**
 * Session type for tracking user sessions
 */
export interface SessionType {
  id: string;
  userId: string;
  tokenHash: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Login activity tracking
 */
export interface LoginActivityType {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  success: boolean;
  failureReason?: string;
  createdAt: Date;
}

// ============================================
// USER GEOGRAPHIC ASSIGNMENT TYPES
// ============================================

/**
 * State-level assignment for State Admins
 * Tracks which states a user is assigned to manage
 */
export interface UserStateAssignmentType {
  id: string;
  userId: string;
  stateId: string;
  isPrimary: boolean;
  assignedAt: Date;
  assignedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  // Relations (imported types to avoid circular dependency)
  user?: any; // UserType
  state?: any; // StateType from geography
}

/**
 * District-level assignment for District Admins and Agents
 * Tracks which districts a user is assigned to manage
 */
export interface UserDistrictAssignmentType {
  id: string;
  userId: string;
  districtId: string;
  isPrimary: boolean;
  assignedAt: Date;
  assignedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  // Relations (imported types to avoid circular dependency)
  user?: any; // UserType
  district?: any; // DistrictType from geography
}

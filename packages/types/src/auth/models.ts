import { DistrictType, StateType } from '../geography';
import { UserRole } from './enums';

/**
 * User entity type
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles: UserRole[];
  
  // Geographic assignments
  homeDistrictId?: string | null;
  homeDistrict?: DistrictType | null;
  
  // Assignments
  stateAssignments?: UserStateAssignment[];
  districtAssignments?: UserDistrictAssignment[];
  
  // Legacy/Helper fields (derived or simplified)
  /** Districts assigned to the user. Always an array. */
  districts?: string[]; 
  
  isActive: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  
  // Address
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * JWT token payload
 */
export interface JWTPayload {
  id: string;
  email: string;
  roles: UserRole[];
  homeDistrictId?: string | null;
  districts?: string[];
  stateIds?: string[];
  isActive?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Session type for tracking user sessions
 */
export interface Session {
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
export interface LoginActivity {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  success: boolean;
  failureReason?: string;
  createdAt: Date;
}

/**
 * Authentication tokens response
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ============================================
// USER GEOGRAPHIC ASSIGNMENT TYPES
// ============================================

/**
 * State-level assignment for State Admins
 * Tracks which states a user is assigned to manage
 */
export interface UserStateAssignment {
  id: string;
  userId: string;
  stateId: string;
  isPrimary: boolean;
  assignedAt: Date;
  assignedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  // Relations
  user?: User;
  state?: StateType;
}

/**
 * District-level assignment for District Admins and Agents
 * Tracks which districts a user is assigned to manage
 */
export interface UserDistrictAssignment {
  id: string;
  userId: string;
  districtId: string;
  isPrimary: boolean;
  assignedAt: Date;
  assignedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  
  // Relations
  user?: User;
  district?: DistrictType;
}

// Aliases for backward compatibility (if needed, but try to use new names)
export type UserType = User;
export type JWTPayloadType = JWTPayload;
export type SessionType = Session;
export type LoginActivityType = LoginActivity;
export type UserStateAssignmentType = UserStateAssignment;
export type UserDistrictAssignmentType = UserDistrictAssignment;



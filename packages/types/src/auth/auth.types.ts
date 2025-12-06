/**
 * Authentication and user types
 * @module auth/auth.types
 */

import { UserRole } from './auth.constants';
import { DistrictType, StateType } from '../geography/geography.types';

/**
 * User entity type
 */
export interface UserType {
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
  stateAssignments?: UserStateAssignmentType[];
  districtAssignments?: UserDistrictAssignmentType[];
  
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
export interface JWTPayloadType {
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
  
  // Relations
  user?: UserType;
  state?: StateType;
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
  
  // Relations
  user?: UserType;
  district?: DistrictType;
}

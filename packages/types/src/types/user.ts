/**
 * User-related types
 */

import type { UserRole } from '../constants/user';

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  roles: UserRole[];
  isActive: boolean;
  homeDistrictId?: string | null;
}

export interface UserDetail extends UserSummary {
  emailVerified: boolean;
  phoneVerified: boolean;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserWithAssignments extends UserDetail {
  stateAssignments: Array<{
    stateId: string;
    stateName: string;
    isPrimary: boolean;
  }>;
  districtAssignments: Array<{
    districtId: string;
    districtName: string;
    isPrimary: boolean;
  }>;
}

export interface BankDetailsDTO {
  id: string;
  accountNumber: string;
  ifscCode: string;
  accountName: string;
  bankName?: string | null;
  branchName?: string | null;
  upiId?: string | null;
  isVerified: boolean;
  isPrimary: boolean;
}

export interface SessionInfo {
  id: string;
  deviceName?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  ipAddress?: string | null;
  city?: string | null;
  country?: string | null;
  lastActivityAt: Date | string;
  expiresAt: Date | string;
  isActive: boolean;
}

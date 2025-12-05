/**
 * Access Control & RBAC Domain Layer
 *
 * Defines all authorization and permission checks for the domain.
 * This is the single source of truth for "who can do what".
 *
 * All controllers MUST call these functions before allowing operations.
 */

import type { UserType } from '@fundifyhub/types';
import { ROLES } from '@fundifyhub/types';
import { ForbiddenError, ErrorCode } from '@fundifyhub/utils';

/**
 * User shape for RBAC checks - allows partials for flexibility
 */
export type RBACUser = Partial<UserType> & {
  id?: string;
  roles?: string[];
  districts?: string[];
};

/**
 * Core role checks
 */

/**
 * Check if user has a specific role
 */
export function hasRole(user: RBACUser | undefined | null, role: string): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  if (user.roles.includes(ROLES.SUPER_ADMIN)) return true;
  return user.roles.includes(role);
}

/**
 * Check if user has any of the given roles
 */
export function hasAnyRole(user: RBACUser | undefined | null, roles: string[]): boolean {
  if (!user) return false;
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  if (userRoles.includes(ROLES.SUPER_ADMIN)) return true;
  return roles.some((r) => userRoles.includes(r));
}

/**
 * Check if user has ALL given roles
 */
export function hasAllRoles(user: RBACUser | undefined | null, roles: string[]): boolean {
  if (!user) return false;
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  if (userRoles.includes(ROLES.SUPER_ADMIN)) return true;
  return roles.every((r) => userRoles.includes(r));
}

/**
 * District-level access checks
 */

/**
 * Check if user has access to a specific district
 */
export function hasDistrictAccess(user: RBACUser | undefined | null, districtId: string): boolean {
  if (!user) return false;
  if (Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN)) return true;
  if (Array.isArray(user.districts)) {
    return user.districts.some((d) => String(d).toLowerCase() === String(districtId).toLowerCase());
  }
  return false;
}

/**
 * Check if user has access to any of the given districts
 */
export function hasAnyDistrictAccess(user: RBACUser | undefined | null, districtIds: string[]): boolean {
  return districtIds.some((id) => hasDistrictAccess(user, id));
}

/**
 * Get all districts the user has access to
 */
export function getAccessibleDistrictIds(user: RBACUser | undefined | null): string[] {
  if (!user) return [];
  if (hasRole(user, ROLES.SUPER_ADMIN)) {
    // TODO: Fetch all districts from database
    return [];
  }
  return Array.isArray(user.districts) ? user.districts.map(String) : [];
}

/**
 * Request-level permissions
 */

/**
 * Can user create a request?
 * - CUSTOMER can create
 */
export function canCreateRequest(user: RBACUser | undefined): boolean {
  return hasRole(user, ROLES.CUSTOMER);
}

/**
 * Can user view a request?
 * - CUSTOMER can view their own request
 * - AGENT/ADMIN/STATE_ADMIN/SUPER_ADMIN can view requests in their district
 */
export function canViewRequest(user: RBACUser | undefined, requestCustomerId: string, requestDistrictId: string): boolean {
  if (!user) return false;

  // Customer views own request
  if (hasRole(user, ROLES.CUSTOMER) && user.id === requestCustomerId) {
    return true;
  }

  // Admin/Agent views in their district
  if (hasAnyRole(user, [ROLES.AGENT, ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN])) {
    return hasDistrictAccess(user, requestDistrictId);
  }

  return false;
}

/**
 * Can user list requests (for their view)?
 * - CUSTOMER sees only their own
 * - AGENT/ADMIN sees requests in their district
 * - STATE_ADMIN sees requests in their state (TODO)
 * - SUPER_ADMIN sees all
 */
export function canListRequests(user: RBACUser | undefined): boolean {
  if (!user) return false;
  return hasAnyRole(user, Object.values(ROLES));
}

/**
 * Can user assign an agent to a request?
 * - DISTRICT_ADMIN in that district
 * - STATE_ADMIN
 * - SUPER_ADMIN
 */
export function canAssignAgent(user: RBACUser | undefined, requestDistrictId: string): boolean {
  if (!user) return false;
  if (hasRole(user, ROLES.SUPER_ADMIN)) return true;
  if (hasRole(user, ROLES.STATE_ADMIN)) return true;
  if (hasRole(user, ROLES.DISTRICT_ADMIN) && hasDistrictAccess(user, requestDistrictId)) {
    return true;
  }
  return false;
}

/**
 * Can user assign an admin to a request?
 * - SUPER_ADMIN
 * - STATE_ADMIN
 */
export function canAssignAdmin(user: RBACUser | undefined): boolean {
  if (!user) return false;
  return hasAnyRole(user, [ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN]);
}

/**
 * Can user create an offer?
 * - DISTRICT_ADMIN in that district
 * - STATE_ADMIN
 * - SUPER_ADMIN
 */
export function canCreateOffer(user: RBACUser | undefined, requestDistrictId: string): boolean {
  return canAssignAgent(user, requestDistrictId); // Same permissions
}

/**
 * Loan-level permissions
 */

/**
 * Can user view a loan?
 * - CUSTOMER can view their own loan
 * - AGENT/ADMIN/STATE_ADMIN/SUPER_ADMIN can view loans in their district
 */
export function canViewLoan(user: RBACUser | undefined, loanCustomerId: string, loanDistrictId: string): boolean {
  if (!user) return false;

  if (hasRole(user, ROLES.CUSTOMER) && user.id === loanCustomerId) {
    return true;
  }

  if (hasAnyRole(user, [ROLES.AGENT, ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN])) {
    return hasDistrictAccess(user, loanDistrictId);
  }

  return false;
}

/**
 * Can user make a payment?
 * - CUSTOMER can pay their own loans
 * - AGENT/ADMIN can record payments in their district
 */
export function canMakePayment(user: RBACUser | undefined, loanCustomerId: string, loanDistrictId: string): boolean {
  if (!user) return false;

  // Customer pays own loan
  if (hasRole(user, ROLES.CUSTOMER) && user.id === loanCustomerId) {
    return true;
  }

  // Agent/Admin records payment in their district
  if (hasAnyRole(user, [ROLES.AGENT, ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN])) {
    return hasDistrictAccess(user, loanDistrictId);
  }

  return false;
}

/**
 * Auction-level permissions
 */

/**
 * Can user view an auction?
 * - CUSTOMER can view public auctions for defaulted loans
 * - AGENT/ADMIN/STATE_ADMIN/SUPER_ADMIN can view auctions in their district
 */
export function canViewAuction(user: RBACUser | undefined, isPublished: boolean, auctionDistrictId: string): boolean {
  if (!user) return false;

  // Customer can view published auctions
  if (hasRole(user, ROLES.CUSTOMER) && isPublished) {
    return true;
  }

  // Admin/Agent views in their district
  if (hasAnyRole(user, [ROLES.AGENT, ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN])) {
    return hasDistrictAccess(user, auctionDistrictId);
  }

  return false;
}

/**
 * Can user place a bid?
 * - CUSTOMER can place bids on published auctions
 */
export function canPlaceBid(user: RBACUser | undefined): boolean {
  return hasRole(user, ROLES.CUSTOMER);
}

/**
 * Can user manage an auction (create, extend, cancel)?
 * - DISTRICT_ADMIN in that district
 * - STATE_ADMIN
 * - SUPER_ADMIN
 */
export function canManageAuction(user: RBACUser | undefined, auctionDistrictId: string): boolean {
  if (!user) return false;
  if (hasRole(user, ROLES.SUPER_ADMIN)) return true;
  if (hasRole(user, ROLES.STATE_ADMIN)) return true;
  if (hasRole(user, ROLES.DISTRICT_ADMIN) && hasDistrictAccess(user, auctionDistrictId)) {
    return true;
  }
  return false;
}

/**
 * Admin-level permissions
 */

/**
 * Can user access admin dashboard?
 * - DISTRICT_ADMIN, STATE_ADMIN, SUPER_ADMIN
 */
export function canAccessAdminDashboard(user: RBACUser | undefined): boolean {
  if (!user) return false;
  return hasAnyRole(user, [ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN]);
}

/**
 * Can user manage users in a district?
 * - DISTRICT_ADMIN in that district
 * - STATE_ADMIN
 * - SUPER_ADMIN
 */
export function canManageUsers(user: RBACUser | undefined, districtId: string): boolean {
  if (!user) return false;
  if (hasRole(user, ROLES.SUPER_ADMIN)) return true;
  if (hasRole(user, ROLES.STATE_ADMIN)) return true;
  if (hasRole(user, ROLES.DISTRICT_ADMIN) && hasDistrictAccess(user, districtId)) {
    return true;
  }
  return false;
}

/**
 * Can user manage geography (states, districts, warehouses)?
 * - SUPER_ADMIN only
 */
export function canManageGeography(user: RBACUser | undefined): boolean {
  return hasRole(user, ROLES.SUPER_ADMIN);
}

/**
 * Assertions - throw ForbiddenError if check fails
 */

/**
 * Assert user has a role
 */
export function assertHasRole(user: RBACUser | undefined, role: string, message?: string): asserts user is RBACUser {
  if (!hasRole(user, role)) {
    throw new ForbiddenError(
      message || `User does not have role: ${role}`,
      ErrorCode.FORBIDDEN
    );
  }
}

/**
 * Assert user has any of the given roles
 */
export function assertHasAnyRole(user: RBACUser | undefined, roles: string[], message?: string): asserts user is RBACUser {
  if (!hasAnyRole(user, roles)) {
    throw new ForbiddenError(
      message || `User does not have any of the required roles`,
      ErrorCode.FORBIDDEN
    );
  }
}

/**
 * Assert user has district access
 */
export function assertHasDistrictAccess(user: RBACUser | undefined, districtId: string, message?: string): asserts user is RBACUser {
  if (!hasDistrictAccess(user, districtId)) {
    throw new ForbiddenError(
      message || `User does not have access to district: ${districtId}`,
      ErrorCode.FORBIDDEN
    );
  }
}

/**
 * Assert user can perform action
 */
export function assertCanPerformAction(
  canPerform: boolean,
  message: string = 'User does not have permission to perform this action'
): asserts canPerform is true {
  if (!canPerform) {
    throw new ForbiddenError(message, ErrorCode.FORBIDDEN);
  }
}

/**
 * Middleware factory for role-based access control
 */
export function requireRoles(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    try {
      assertHasAnyRole(req.user, roles, 'Insufficient permissions');
      next();
    } catch (error) {
      if (error instanceof ForbiddenError) {
        res.status(error.statusCode).json(error.toJSON());
      } else {
        res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Authorization check failed' });
      }
    }
  };
}

/**
 * Helper to get role hierarchy level (for comparisons)
 */
export function getRoleHierarchyLevel(role: string): number {
  const hierarchy = {
    [ROLES.CUSTOMER]: 0,
    [ROLES.AGENT]: 1,
    [ROLES.DISTRICT_ADMIN]: 2,
    [ROLES.STATE_ADMIN]: 3,
    [ROLES.SUPER_ADMIN]: 4,
  };
  return hierarchy[role as keyof typeof hierarchy] ?? -1;
}

/**
 * Check if user has hierarchy level greater than or equal to target
 */
export function hasMinimumHierarchyLevel(user: RBACUser | undefined, targetLevel: number): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.some((role) => getRoleHierarchyLevel(role) >= targetLevel);
}

/**
 * @fileoverview Workflow Guards for Stage-Based System
 * 
 * Guards are functions that check if a transition is allowed
 * based on user role, permissions, and request state.
 */

import { ROLES } from '@fundifyhub/types';
import type { WorkflowContext } from '@fundifyhub/types';

// Helper type for role strings
type RoleString = string;

// Helper arrays for role checks (using string values for comparison)
const ADMIN_ROLES: readonly RoleString[] = [ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN, ROLES.DISTRICT_ADMIN];
const HIGH_ADMIN_ROLES: readonly RoleString[] = [ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN];

// Helper function to check if user has any of the specified roles
function hasAnyRole(roles: string[], targetRoles: readonly RoleString[]): boolean {
  return roles.some(r => targetRoles.includes(r));
}

// Helper function to check if user has a specific role
function hasRole(roles: string[], targetRole: RoleString): boolean {
  return roles.includes(targetRole);
}

// Helper to get user districts (handles both districts and districtIds)
function getUserDistricts(ctx: WorkflowContext): string[] {
  return ctx.user.districts ?? ctx.user.districtIds ?? [];
}

/**
 * Guard functions for workflow transitions
 */
export const Guards = {
  // ========================================
  // ROLE CHECKS
  // ========================================
  
  /** Check if user is any admin (district, state, or super) */
  isAdmin: (ctx: WorkflowContext): boolean => 
    hasAnyRole(ctx.user.roles, ADMIN_ROLES),
  
  /** Check if user is super admin */
  isSuperAdmin: (ctx: WorkflowContext): boolean => 
    hasRole(ctx.user.roles, ROLES.SUPER_ADMIN),
  
  /** Check if user is state admin or higher */
  isStateAdminOrHigher: (ctx: WorkflowContext): boolean =>
    hasAnyRole(ctx.user.roles, HIGH_ADMIN_ROLES),
  
  /** Check if user is district admin */
  isDistrictAdmin: (ctx: WorkflowContext): boolean => 
    hasRole(ctx.user.roles, ROLES.DISTRICT_ADMIN),
  
  /** Check if user is an agent */
  isAgent: (ctx: WorkflowContext): boolean => 
    hasRole(ctx.user.roles, ROLES.AGENT),
  
  /** Check if user is a customer */
  isCustomer: (ctx: WorkflowContext): boolean => 
    hasRole(ctx.user.roles, ROLES.CUSTOMER),

  // ========================================
  // DISTRICT ACCESS CHECKS
  // ========================================

  /** Check if admin has access to request's district */
  isAdminInDistrict: (ctx: WorkflowContext): boolean => {
    // Super admin and state admin can access any district
    if (hasAnyRole(ctx.user.roles, HIGH_ADMIN_ROLES)) {
      return true;
    }
    // District admin must be in the request's district
    if (hasRole(ctx.user.roles, ROLES.DISTRICT_ADMIN)) {
      const userDistricts = getUserDistricts(ctx);
      const requestDistrict = ctx.request.districtId;
      return requestDistrict ? userDistricts.includes(requestDistrict) : false;
    }
    return false;
  },

  /** Check if request is not assigned to any admin */
  isNotAssigned: (ctx: WorkflowContext): boolean => {
    return !ctx.request.assignedAdminId;
  },

  // ========================================
  // ASSIGNMENT CHECKS
  // ========================================

  /** Check if user is the assigned admin OR super/state admin */
  isAssignedAdminOrSuperAdmin: (ctx: WorkflowContext): boolean => {
    // Super admin and state admin can always act
    if (hasAnyRole(ctx.user.roles, HIGH_ADMIN_ROLES)) {
      return true;
    }
    // District admin must be assigned
    if (hasRole(ctx.user.roles, ROLES.DISTRICT_ADMIN)) {
      return ctx.user.id === ctx.request.assignedAdminId;
    }
    return false;
  },

  /** Check if user is the assigned agent */
  isAssignedAgent: (ctx: WorkflowContext): boolean => {
    if (!hasRole(ctx.user.roles, ROLES.AGENT)) return false;
    return ctx.user.id === ctx.request.assignedAgentId;
  },

  /** Check if user is assigned agent OR has admin access */
  isAssignedAgentOrAdmin: (ctx: WorkflowContext): boolean => {
    return Guards.isAssignedAgent(ctx) || Guards.isAssignedAdminOrSuperAdmin(ctx);
  },

  // ========================================
  // OWNERSHIP CHECKS
  // ========================================

  /** Check if user is the request owner (customer) */
  isRequestOwner: (ctx: WorkflowContext): boolean => {
    return ctx.user.id === ctx.request.customerId;
  },

  // ========================================
  // COMBINED ACCESS CHECKS
  // ========================================

  /** Check if user can manage this request (admin with district access) */
  canManageRequest: (ctx: WorkflowContext): boolean => {
    // Super admin and state admin can manage any request
    if (hasAnyRole(ctx.user.roles, HIGH_ADMIN_ROLES)) {
      return true;
    }
    // District admin must have access to the district
    if (hasRole(ctx.user.roles, ROLES.DISTRICT_ADMIN)) {
      const userDistricts = getUserDistricts(ctx);
      const requestDistrict = ctx.request.districtId;
      return requestDistrict ? userDistricts.includes(requestDistrict) : false;
    }
    return false;
  },

  /** Check if user can view this request */
  canViewRequest: (ctx: WorkflowContext): boolean => {
    // Owner can view
    if (ctx.user.id === ctx.request.customerId) return true;
    // Assigned agent can view
    if (ctx.user.id === ctx.request.assignedAgentId) return true;
    // Admin with district access can view
    return Guards.canManageRequest(ctx);
  },

  // ========================================
  // LOAN CHECKS
  // ========================================

  /** Check if request has an active loan */
  hasActiveLoan: (ctx: WorkflowContext): boolean => {
    return ctx.request.loan?.status === 'ACTIVE';
  },

  /** Check if request has an accepted offer */
  hasAcceptedOffer: (ctx: WorkflowContext): boolean => {
    return !!ctx.request.activeOfferId;
  },
};

// Type for guard function
export type GuardFunction = (ctx: WorkflowContext) => boolean;

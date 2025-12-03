import { REQUEST_STATUS, ROLES } from '@fundifyhub/types';
import type { WorkflowContext } from '@fundifyhub/types';

export const Guards = {
  // Role Checks
  isAdmin: (ctx: WorkflowContext) => 
    ctx.user.roles.includes(ROLES.SUPER_ADMIN) || ctx.user.roles.includes(ROLES.DISTRICT_ADMIN),
  
  isSuperAdmin: (ctx: WorkflowContext) => 
    ctx.user.roles.includes(ROLES.SUPER_ADMIN),
  
  isDistrictAdmin: (ctx: WorkflowContext) => 
    ctx.user.roles.includes(ROLES.DISTRICT_ADMIN),
  
  isAgent: (ctx: WorkflowContext) => 
    ctx.user.roles.includes(ROLES.AGENT),
  
  isCustomer: (ctx: WorkflowContext) => 
    ctx.user.roles.includes(ROLES.CUSTOMER),

  // District Admin in the same district as the request (for self-assign)
  isDistrictAdminInDistrict: (ctx: WorkflowContext) => {
    if (!ctx.user.roles.includes(ROLES.DISTRICT_ADMIN)) return false;
    // Must be in the same district as the request
    return ctx.user.districts?.includes(ctx.request.district) ?? false;
  },

  // Request is not already assigned to any admin (for self-assign)
  isNotAssignedToAnyAdmin: (ctx: WorkflowContext) => {
    const assignedAdminId = (ctx.request as any).assignedAdminId;
    // Only allow if not assigned at all
    return !assignedAdminId;
  },

  // Admin who is assigned to handle the request OR super admin
  isAssignedAdminOrSuperAdmin: (ctx: WorkflowContext) => {
    if (ctx.user.roles.includes(ROLES.SUPER_ADMIN)) return true;
    // Check if user is the assigned admin
    const assignedAdminId = (ctx.request as any).assignedAdminId;
    if (assignedAdminId && ctx.user.id === assignedAdminId) return true;
    return false;
  },

  // Ownership Checks
  isRequestOwner: (ctx: WorkflowContext) => 
    ctx.user.id === ctx.request.customerId,
  
  isAssignedAgent: (ctx: WorkflowContext) => 
    ctx.user.id === ctx.request.assignedAgentId,

  // Access Checks
  hasDistrictAccess: (ctx: WorkflowContext) => {
    if (ctx.user.roles.includes(ROLES.SUPER_ADMIN)) return true;
    return ctx.user.districts?.includes(ctx.request.district) ?? false;
  },

  // Combined Checks
  canManageRequest: (ctx: WorkflowContext) => {
    // Super Admin OR (District Admin AND District Match)
    if (ctx.user.roles.includes(ROLES.SUPER_ADMIN)) return true;
    if (ctx.user.roles.includes(ROLES.DISTRICT_ADMIN)) {
      return ctx.user.districts?.includes(ctx.request.district) ?? false;
    }
    return false;
  },

  // Business Logic Checks
  isInspectionScheduled: (ctx: WorkflowContext) => {
    // This would check if inspection date is set and valid
    // For now, we assume if status is correct, it's valid
    return true; 
  }
};

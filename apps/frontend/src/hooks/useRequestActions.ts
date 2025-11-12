/**
 * Hook to resolve available actions for a request based on user role and permissions
 */

import { useMemo } from 'react';
import { REQUEST_STATUS, type UserRole, getAvailableActions, getPrimaryActions, getSecondaryActions, type WorkflowAction } from '@fundifyhub/types';
import { useAuth } from '@/contexts/AuthContext';

interface Request {
  id: string;
  currentStatus: REQUEST_STATUS;
  districtId: string;
  customerId: string;
  agentId?: string | null;
}

interface UseRequestActionsReturn {
  allActions: WorkflowAction[];
  primaryActions: WorkflowAction[];
  secondaryActions: WorkflowAction[];
  canAct: boolean;
}

export function useRequestActions(request: Request): UseRequestActionsReturn {
  const { user } = useAuth();

  const result = useMemo<UseRequestActionsReturn>(() => {
    // No user = no actions
    if (!user) {
      return {
        allActions: [],
        primaryActions: [],
        secondaryActions: [],
        canAct: false,
      };
    }

    // Determine user's role in context of this request
    const userRole = getUserRoleForRequest(user, request);
    
    if (!userRole) {
      return {
        allActions: [],
        primaryActions: [],
        secondaryActions: [],
        canAct: false,
      };
    }

    // Get base actions from workflow engine
    const baseActions = getAvailableActions(request.currentStatus, userRole);

    // Filter actions based on permissions
    const filteredActions = baseActions.filter(action => {
      // Check district access for admin actions
      if (action.districtCheck && !hasDistrictAccess(user, request.districtId)) {
        return false;
      }

      // Check customer ownership
      if (action.requiresCustomerOwnership && user.id !== request.customerId) {
        return false;
      }

      // Check agent assignment
      if (action.requiresAgentAssignment && user.id !== request.agentId) {
        return false;
      }

      return true;
    });

    // Split into primary and secondary
    const primary = getPrimaryActions(request.currentStatus, userRole, 2);
    const secondary = getSecondaryActions(request.currentStatus, userRole, 2);

    // Apply same filtering to primary/secondary
    const filteredPrimary = primary.filter(action =>
      filteredActions.some(a => a.id === action.id)
    );
    
    const filteredSecondary = secondary.filter(action =>
      filteredActions.some(a => a.id === action.id)
    );

    return {
      allActions: filteredActions,
      primaryActions: filteredPrimary,
      secondaryActions: filteredSecondary,
      canAct: filteredActions.length > 0,
    };
  }, [user, request]);

  return result;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

interface User {
  id: string;
  roles: string[];
  districts?: string[];
}

/**
 * Determine user's role in context of this request
 */
function getUserRoleForRequest(user: User, request: Request): UserRole | null {
  const roles = user.roles;

  // Super admin has highest priority
  if (roles.includes('SUPER_ADMIN')) {
    return 'SUPER_ADMIN';
  }

  // If user is the customer
  if (user.id === request.customerId) {
    return 'CUSTOMER';
  }

  // If user is assigned agent
  if (user.id === request.agentId && roles.includes('AGENT')) {
    return 'AGENT';
  }

  // If user is district admin with access
  if (roles.includes('DISTRICT_ADMIN') && hasDistrictAccess(user, request.districtId)) {
    return 'DISTRICT_ADMIN';
  }

  // If user is any agent (for unassigned requests)
  if (roles.includes('AGENT')) {
    return 'AGENT';
  }

  return null;
}

/**
 * Check if user has access to request's district
 */
function hasDistrictAccess(user: User, districtId: string): boolean {
  // Super admin has access to all districts
  if (user.roles.includes('SUPER_ADMIN')) {
    return true;
  }

  // Check if user's districts include this district
  if (!user.districts || user.districts.length === 0) {
    return false;
  }

  return user.districts.includes(districtId);
}

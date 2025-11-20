/**
 * Hook to resolve available actions for a request based on user role and permissions
 * Updated to support multi-role users (e.g., DISTRICT_ADMIN + AGENT)
 */

import { useMemo } from 'react';
import { REQUEST_STATUS, type UserRole, getActionsForUser, type WorkflowAction, type UserContext, type RequestContext, ROLES } from '@fundifyhub/types';
import { useAuth } from '@/contexts/AuthContext';

interface Request {
  id: string;
  currentStatus: REQUEST_STATUS;
  district: string;
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

    // Build user context with all roles
    const userContext: UserContext = {
      id: user.id,
      roles: getUserRoles(user),
      districts: user.districts,
    };

    // Build request context
    const requestContext: RequestContext = {
      customerId: request.customerId,
      district: request.district,
      agentId: request.agentId,
    };

    // Get merged actions for all user roles
    const allActions = getActionsForUser(
      request.currentStatus,
      userContext,
      requestContext
    );

    // Split into primary and secondary based on priority
    const primaryActions = allActions.slice(0, 2);
    const secondaryActions = allActions.slice(2);

    return {
      allActions,
      primaryActions,
      secondaryActions,
      canAct: allActions.length > 0,
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
 * Extract all user roles as UserRole array
 * Converts user.roles string array to typed UserRole array
 */
function getUserRoles(user: User): UserRole[] {
  const validRoles: UserRole[] = [];
  
  if (user.roles.includes(ROLES.SUPER_ADMIN)) {
    validRoles.push(ROLES.SUPER_ADMIN);
  }
  
  if (user.roles.includes(ROLES.DISTRICT_ADMIN)) {
    validRoles.push(ROLES.DISTRICT_ADMIN);
  }
  
  if (user.roles.includes(ROLES.AGENT)) {
    validRoles.push(ROLES.AGENT);
  }
  
  if (user.roles.includes(ROLES.CUSTOMER)) {
    validRoles.push(ROLES.CUSTOMER);
  }
  
  return validRoles;
}

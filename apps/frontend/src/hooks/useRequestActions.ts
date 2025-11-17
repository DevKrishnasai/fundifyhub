/**
 * Hook to resolve available actions for a request based on user role and permissions
 * Updated to support multi-role users (e.g., DISTRICT_ADMIN + AGENT)
 */

import { useMemo } from 'react';
import { REQUEST_STATUS, type UserRole, getActionsForUser, type WorkflowAction, type UserContext, type RequestContext } from '@fundifyhub/types';
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

    // Build user context with all roles
    const userContext: UserContext = {
      id: user.id,
      roles: getUserRoles(user),
      districts: user.district,
    };

    // Build request context
    const requestContext: RequestContext = {
      customerId: request.customerId,
      districtId: request.districtId,
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
  district: string[];
}

/**
 * Extract all user roles as UserRole array
 * Converts user.roles string array to typed UserRole array
 */
function getUserRoles(user: User): UserRole[] {
  const validRoles: UserRole[] = [];
  
  if (user.roles.includes('SUPER_ADMIN')) {
    validRoles.push('SUPER_ADMIN');
  }
  
  if (user.roles.includes('DISTRICT_ADMIN')) {
    validRoles.push('DISTRICT_ADMIN');
  }
  
  if (user.roles.includes('AGENT')) {
    validRoles.push('AGENT');
  }
  
  if (user.roles.includes('CUSTOMER')) {
    validRoles.push('CUSTOMER');
  }
  
  return validRoles;
}

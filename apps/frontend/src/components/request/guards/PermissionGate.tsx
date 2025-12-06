'use client';

import React from 'react';
import type { RequestPermissions } from '@/hooks/useRequestDetail';

/**
 * PermissionGate - Conditionally renders children based on permissions
 * 
 * @example
 * ```tsx
 * <PermissionGate require="isAdmin" permissions={permissions}>
 *   <AdminOnlySection />
 * </PermissionGate>
 * 
 * <PermissionGate 
 *   require={(p) => p.isCustomer && p.isRequestOwner} 
 *   permissions={permissions}
 *   fallback={<p>You don't have access to this section</p>}
 * >
 *   <CustomerSection />
 * </PermissionGate>
 * ```
 */

type PermissionKey = keyof RequestPermissions;
type PermissionChecker = (permissions: RequestPermissions) => boolean;

interface PermissionGateProps {
  /** Children to render if permission check passes */
  children: React.ReactNode;
  /** Permission key to check, or a function for complex checks */
  require: PermissionKey | PermissionChecker;
  /** Current permissions object */
  permissions: RequestPermissions;
  /** Fallback to render if permission check fails (default: null) */
  fallback?: React.ReactNode;
  /** Invert the check (render if permission is FALSE) */
  invert?: boolean;
}

export function PermissionGate({
  children,
  require,
  permissions,
  fallback = null,
  invert = false,
}: PermissionGateProps) {
  // Calculate if permission is granted
  let hasPermission: boolean;
  
  if (typeof require === 'function') {
    hasPermission = require(permissions);
  } else {
    hasPermission = Boolean(permissions[require]);
  }

  // Apply inversion if needed
  if (invert) {
    hasPermission = !hasPermission;
  }

  // Render based on permission
  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Convenience components for common permission patterns
 */

interface RoleGateProps {
  children: React.ReactNode;
  permissions: RequestPermissions;
  fallback?: React.ReactNode;
}

/** Render only for admins (super admin or district admin) */
export function AdminOnly({ children, permissions, fallback }: RoleGateProps) {
  return (
    <PermissionGate require="isAdmin" permissions={permissions} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/** Render only for super admins */
export function SuperAdminOnly({ children, permissions, fallback }: RoleGateProps) {
  return (
    <PermissionGate require="isSuperAdmin" permissions={permissions} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/** Render only for customers (and only for their own request) */
export function CustomerOnly({ children, permissions, fallback }: RoleGateProps) {
  return (
    <PermissionGate 
      require={(p) => p.isCustomer && p.isRequestOwner} 
      permissions={permissions} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

/** Render only for agents assigned to this request */
export function AgentOnly({ children, permissions, fallback }: RoleGateProps) {
  return (
    <PermissionGate 
      require={(p) => p.isAgent && p.isAssignedAgent} 
      permissions={permissions} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

/** Render for anyone who can view the request */
export function ViewerOnly({ children, permissions, fallback }: RoleGateProps) {
  return (
    <PermissionGate require="canView" permissions={permissions} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/** Render for non-customers (admins and agents) */
export function StaffOnly({ children, permissions, fallback }: RoleGateProps) {
  return (
    <PermissionGate 
      require={(p) => p.isAdmin || p.isAssignedAgent} 
      permissions={permissions} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

export default PermissionGate;

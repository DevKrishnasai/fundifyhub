import { ROLES } from '@fundifyhub/types';
import type { Request, Response, NextFunction } from 'express';
import type { UserType } from '@fundifyhub/types';
import logger from './logger';

/**
 * Lightweight auth user shape used across RBAC helpers.
 * We allow partials because `req.user` may not always contain every field
 * (for example during early middleware runs). Keep this local to avoid
 * changing global request typings.
 */
type AuthUser = Partial<UserType> & {
  roles?: string[];
  district?: string[];
};

export function hasRole(user: AuthUser | undefined | null, role: string): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  // SUPER_ADMIN should be treated as having every role
  if (user.roles.includes(ROLES.SUPER_ADMIN)) return true;
  return user.roles.includes(role);
}

export function hasAnyRole(user: AuthUser | undefined | null, roles: string[]): boolean {
  if (!user) return false;
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  if (userRoles.includes(ROLES.SUPER_ADMIN)) return true;
  return roles.some((r) => userRoles.includes(r));
}

export function hasDistrictAccess(user: AuthUser | undefined | null, district: string): boolean {
  if (!user) return false;
  // SUPER_ADMIN has access to all districts
  if (Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN)) return true;

  // User.district is an array of districts. Grant access if any district matches.
  if (Array.isArray(user.district) && user.district.includes(district)) return true;

  return false;
}

export function requireRoles(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as AuthUser | undefined | null;
      if (!user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      if (hasAnyRole(user, allowedRoles)) {
        next();
        return;
      }
      res.status(403).json({ success: false, message: 'Forbidden' });
    } catch (error) {
      logger.error('requireRoles error', error as Error);
      res.status(500).json({ success: false, message: 'Authorization failure' });
    }
  };
}

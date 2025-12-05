/**
 * RBAC Middleware
 * 
 * Role-Based Access Control middleware.
 * Checks if user has required roles before accessing endpoint.
 * 
 * @module api/http/middlewares/rbac
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Require specific role(s)
 * 
 * Factory function that creates middleware to check roles.
 * User must have at least one of the specified roles.
 * 
 * @param requiredRoles - Array of required roles (OR logic)
 * 
 * @example
 * ```ts
 * // Only admins can access
 * app.delete('/requests/:id', authenticateUser, requireRole(['STATE_ADMIN', 'SUPER_ADMIN']), deleteRequestHandler)
 * 
 * // Only loan owners or admins
 * app.patch('/loans/:id', authenticateUser, requireRole(['CUSTOMER', 'STATE_ADMIN']), updateLoanHandler)
 * ```
 */
export function requireRole(...requiredRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new Error('MISSING_USER_CONTEXT');
      }

      // TODO: (agent) Use assertHasAnyRole from domain/access-control/rbac.ts
      // assertHasAnyRole(req.user, requiredRoles)

      const userRoles = (req.user as any).roles || [];
      const hasRole = requiredRoles.some((role) => userRoles.includes(role));
      if (!hasRole) {
        throw new Error('INSUFFICIENT_PERMISSIONS');
      }

      console.log('[RBAC] Role check passed:', {
        userId: (req.user as any).id,
        userRoles,
        requiredRoles,
      });

      next();
    } catch (err) {
      console.warn('[RBAC] Role check failed:', {
        userId: (req.user as any)?.id,
        error: (err as Error).message,
      });

      res.status(403).json({
        success: false,
        message: 'Forbidden - Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }
  };
}

/**
 * Check permission for specific resource
 * 
 * More granular than role checking - checks if user can perform action on specific resource.
 * Useful for ownership checks (user can only view/edit their own data).
 * 
 * @param checkFn - Function that validates if user has permission
 * 
 * @example
 * ```ts
 * // User can only view their own profile
 * app.get('/profile/:userId', authenticateUser, checkPermission(async (req) => {
 *   return req.user.id === req.params.userId || req.user.roles.includes('ADMIN')
 * }), getUserProfileHandler)
 * 
 * // User can only edit their own loan
 * app.patch('/loans/:loanId', authenticateUser, checkPermission(async (req) => {
 *   const loan = await loansService.getLoanById(req.params.loanId)
 *   return loan.customerId === req.user.id || req.user.roles.includes('STATE_ADMIN')
 * }), updateLoanHandler)
 * ```
 */
export function checkPermission(
  checkFn: (req: Request) => Promise<boolean> | boolean
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('MISSING_USER_CONTEXT');
      }

      const hasPermission = await Promise.resolve(checkFn(req));

      if (!hasPermission) {
        throw new Error('PERMISSION_DENIED');
      }

      console.log('[RBAC] Permission check passed:', {
        userId: (req.user as any).id,
        path: req.path,
      });

      next();
    } catch (err) {
      console.warn('[RBAC] Permission check failed:', {
        userId: (req.user as any)?.id,
        path: req.path,
        error: (err as Error).message,
      });

      res.status(403).json({
        success: false,
        message: 'Forbidden - Permission denied',
        code: 'FORBIDDEN',
      });
    }
  };
}

/**
 * Check if user has district access
 * 
 * Users can only access data from districts they have access to.
 * Admins can access all districts.
 * 
 * @param districtIdExtractor - Function to extract district ID from request
 * 
 * @example
 * ```ts
 * // Check query param
 * app.get('/requests', authenticateUser, requireDistrictAccess((req) => req.query.districtId), listRequestsHandler)
 * 
 * // Check route param
 * app.get('/districts/:districtId/agents', authenticateUser, requireDistrictAccess((req) => req.params.districtId), listAgentsHandler)
 * 
 * // Extract from database
 * app.get('/requests/:requestId', authenticateUser, requireDistrictAccess(async (req) => {
 *   const request = await requestsService.getById(req.params.requestId)
 *   return request.districtId
 * }), getRequestHandler)
 * ```
 */
export function requireDistrictAccess(
  districtIdExtractor: (req: Request) => Promise<string> | string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('MISSING_USER_CONTEXT');
      }

      // TODO: (agent) Extract district ID from request
      const districtId = await Promise.resolve(districtIdExtractor(req));

      // TODO: (agent) Check if user has access to this district
      // Use hasDistrictAccess() from domain/access-control/rbac.ts
      // if (!hasDistrictAccess(req.user, districtId)) throw new Error()

      // Stub: check if user has districtId or is admin
      const userRoles = (req.user as any).roles || [];
      const isAdmin = userRoles.includes('STATE_ADMIN') || userRoles.includes('SUPER_ADMIN');
      const userDistrictId = (req.user as any).districtId;
      const hasAccess = isAdmin || userDistrictId === districtId;

      if (!hasAccess) {
        throw new Error('DISTRICT_ACCESS_DENIED');
      }

      console.log('[RBAC] District access check passed:', {
        userId: (req.user as any).id,
        districtId,
      });

      next();
    } catch (err) {
      console.warn('[RBAC] District access check failed:', {
        userId: (req.user as any)?.id,
        error: (err as Error).message,
      });

      res.status(403).json({
        success: false,
        message: 'Forbidden - District access denied',
        code: 'FORBIDDEN',
      });
    }
  };
}

/**
 * Audit middleware - log access to sensitive resources
 * 
 * Records user access for compliance.
 * Use on sensitive endpoints like document downloads, admin dashboards, etc.
 * 
 * @param resourceType - Type of resource being accessed
 * @param resourceIdExtractor - Function to extract resource ID
 * 
 * @example
 * ```ts
 * app.get('/documents/:documentId/download', authenticateUser, auditAccess('Document', (req) => req.params.documentId), downloadDocumentHandler)
 * ```
 */
export function auditAccess(
  resourceType: string,
  resourceIdExtractor: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next();
        return;
      }

      const resourceId = resourceIdExtractor(req);

      // TODO: (agent) Call auditAdapter.logAccess(
      //   req.user.id,
      //   resourceType,
      //   resourceId,
      //   'VIEW',
      //   { ip: req.ip, userAgent: req.headers['user-agent'] }
      // )

      console.log('[RBAC] Access audited:', {
        userId: (req.user as any).id,
        resourceType,
        resourceId,
      });

      next();
    } catch (err) {
      // Don't fail the request if auditing fails
      console.error('[RBAC] Audit logging failed:', err);
      next();
    }
  };
}

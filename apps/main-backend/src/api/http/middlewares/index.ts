/**
 * HTTP Middlewares
 * 
 * All Express middlewares for the HTTP API layer.
 * 
 * Pattern:
 * - Auth middlewares: authenticateUser, requireAuthentication, optionalAuth
 * - RBAC middlewares: requireRole, checkPermission, requireDistrictAccess, auditAccess
 * - Error handling: errorHandler, notFoundHandler, asyncHandler
 * 
 * @module api/http/middlewares
 */

export {
  authenticateUser,
  requireAuthentication,
  optionalAuth,
  refreshAccessToken,
  logoutUser,
} from './auth.middleware';

export {
  requireRole,
  checkPermission,
  requireDistrictAccess,
  auditAccess,
} from './rbac.middleware';

export {
  errorHandler,
  notFoundHandler,
  formatValidationError,
  asyncHandler,
} from './error-handler.middleware';

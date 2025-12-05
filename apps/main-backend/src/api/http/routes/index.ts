/**
 * HTTP Routes
 * 
 * All Express route definitions for the HTTP API layer.
 * Each route file contains only route definitions with TODO markers for handlers.
 * 
 * Pattern:
 * - Each route file is independent
 * - Routes are registered in index.ts barrel export
 * - Handlers are in controllers/ directory
 * - Middlewares apply auth, RBAC, error handling
 * 
 * @module api/http/routes
 */

import authRoutes from './auth.routes';
import requestsRoutes from './requests.routes';
import loansRoutes from './loans.routes';
// TODO: (agent) add payments routes when migrated

export { default as authRoutes } from './auth.routes';
export { default as requestsRoutes } from './requests.routes';
export { default as loansRoutes } from './loans.routes';
// export { default as paymentsRoutes } from './payments.routes';

/**
 * Register all routes
 * 
 * @example
 * ```ts
 * import { registerRoutes } from './routes'
 * 
 * const app = express()
 * registerRoutes(app)
 * ```
 */
export function registerRoutes(app: any): void {
  // TODO: (agent) Register routes with appropriate base paths
  app.use('/api/auth', authRoutes);
  app.use('/api/requests', requestsRoutes);
  app.use('/api/loans', loansRoutes);
  // app.use('/api/payments', paymentsRoutes);
  // TODO: (agent) Add remaining routes: payments, auctions, admin, notifications, geography

  console.log('[Routes] All routes registered');
}

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
import paymentsRoutes from './payments.routes';
import auctionsRoutes from './auctions.routes';
import adminRoutes from './admin.routes';
import notificationsRoutes from './notifications.routes';
import geographyRoutes from './geography.routes';
import healthRoutes from './health.routes';

export { default as authRoutes } from './auth.routes';
export { default as requestsRoutes } from './requests.routes';
export { default as loansRoutes } from './loans.routes';
export { default as paymentsRoutes } from './payments.routes';
export { default as auctionsRoutes } from './auctions.routes';
export { default as adminRoutes } from './admin.routes';
export { default as notificationsRoutes } from './notifications.routes';
export { default as geographyRoutes } from './geography.routes';
export { default as healthRoutes } from './health.routes';


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
  app.use('/api/auth', authRoutes);
  app.use('/api/requests', requestsRoutes);
  app.use('/api/loans', loansRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/auctions', auctionsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/geography', geographyRoutes);
  app.use('/api/health', healthRoutes);

  console.log('[Routes] All routes registered');
}

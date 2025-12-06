/**
 * HTTP API Layer
 * 
 * Express.js HTTP API layer with routes, controllers, and middlewares.
 * 
 * Structure:
 * - routes/: Route definitions only (no handlers)
 * - controllers/: Request handlers (thin wrappers around services)
 * - middlewares/: Auth, RBAC, error handling
 * 
 * Pattern:
 * 1. Request comes in
 * 2. Auth middleware verifies user
 * 3. RBAC middleware checks permissions
 * 4. Route handler calls controller
 * 5. Controller validates input + calls service
 * 6. Service executes business logic
 * 7. Controller formats response
 * 8. Error handler catches any errors
 * 
 * @module api/http
 */

import express, { Express } from 'express';
import {
  errorHandler,
  notFoundHandler,
  authenticateUser,
} from './middlewares';
import { registerRoutes } from './routes';

/**
 * Setup HTTP API layer
 * 
 * @param app - Express app instance
 * 
 * @example
 * ```ts
 * const app = express()
 * setupHttpApi(app)
 * app.listen(3000)
 * ```
 */
export function setupHttpApi(app: Express): void {
  // TODO: (agent) Add body parser middleware
  // app.use(express.json({ limit: '10mb' }))
  // app.use(express.urlencoded({ limit: '10mb', extended: true }))

  // TODO: (agent) Add request logging middleware
  // app.use(requestLogger)

  // TODO: (agent) Add CORS middleware if needed
  // app.use(cors())

  // TODO: (agent) Add rate limiting middleware
  // app.use(rateLimit)

  // Apply authentication to all routes (optional - some routes handle optionalAuth)
  // app.use(authenticateUser)

  // Register all route handlers
  registerRoutes(app);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (MUST be last)
  app.use(errorHandler);

  console.log('[HTTP API] Setup complete');
}

export * from './routes';
export * from './controllers';
export * from './middlewares';

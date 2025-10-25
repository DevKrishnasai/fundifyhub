/**
 * User Routes
 * Defines all user endpoints
 * Controllers handle the HTTP layer
 */

import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth } from '../auth';
import { getProfileController, validateController, debugAuthController } from './controllers';

const router: ExpressRouter = Router();

/**
 * GET /user/profile
 * Get current user profile (protected)
 */
router.get('/profile', requireAuth, getProfileController);

/**
 * GET /user/validate
 * Validate authentication status (protected)
 */
router.get('/validate', requireAuth, validateController);

/**
 * GET /user/debug-auth
 * Debug authentication - shows token data vs database data (development only)
 */
router.get('/debug-auth', requireAuth, debugAuthController);

export default router;

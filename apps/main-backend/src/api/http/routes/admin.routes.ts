/**
 * Admin Routes
 *
 * Routes for admin-specific functionality.
 *
 * @module api/http/routes/admin
 */

import { Router } from 'express';
import {
  authenticateUser,
  requireAuthentication,
  requireRole,
  asyncHandler,
} from '../middlewares';

const router: Router = Router();

// Example admin route
router.get(
  '/dashboard',
  authenticateUser,
  requireAuthentication,
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Welcome to the admin dashboard',
    });
  })
);

export default router;

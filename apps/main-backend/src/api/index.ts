/**
 * Main API Router
 *
 * This file defines the main API routing structure for FundifyHub.
 * All API endpoints are prefixed with /api/v1 and organized by feature:
 *
 * - /auth - User authentication (login, register, OTP verification)
 * - /admin - Administrative operations
 * - /user - User profile and operations
 * - /health - Health check endpoint
 *
 * TODO: Add service routes for loan applications and other features
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
// import serviceRoutes from './service/routes';
import adminRoutes from './admin/routes';
import authRoutes from './auth/routes';
import userRoutes from './user/routes';

const router: ExpressRouter = Router();

// router.use('/service', serviceRoutes); //TODO: Need to clean up and add other service routes
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;
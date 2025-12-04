/**
 * Health Check Routes
 *
 * Endpoints for monitoring service health
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { getBasicHealth, getDetailedHealth, getReadinessProbe, getLivenessProbe } from './controllers';

const router: ExpressRouter = Router();

/**
 * @route   GET /api/v1/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', getBasicHealth);

/**
 * @route   GET /api/v1/health/detailed
 * @desc    Detailed health check with dependency statuses
 * @access  Public (could be restricted in production)
 */
router.get('/detailed', getDetailedHealth);

/**
 * @route   GET /api/v1/health/ready
 * @desc    Readiness probe for orchestration
 * @access  Public
 */
router.get('/ready', getReadinessProbe);

/**
 * @route   GET /api/v1/health/live
 * @desc    Liveness probe for orchestration
 * @access  Public
 */
router.get('/live', getLivenessProbe);

export default router;

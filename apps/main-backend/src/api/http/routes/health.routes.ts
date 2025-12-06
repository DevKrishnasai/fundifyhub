/**
 * Health Routes
 *
 * GET /health/live - Liveness probe
 * GET /health/ready - Readiness probe
 *
 * @module api/http/routes/health
 */

import { Router } from 'express';
import { asyncHandler } from '../middlewares';

const router: Router = Router();

/**
 * Liveness probe
 */
router.get(
  '/live',
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'OK',
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * Readiness probe
 */
router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    // TODO: (agent) Check database connection
    // TODO: (agent) Check other dependencies (Redis, etc.)
    res.status(200).json({
      success: true,
      message: 'OK',
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;

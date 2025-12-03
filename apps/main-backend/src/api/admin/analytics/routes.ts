import { Router, type Router as ExpressRouter } from 'express';
import {
  getAnalyticsSummaryController,
  getAnalyticsTrendsController,
  getAnalyticsDistrictBreakdownController,
  getAnalyticsRequestStatusController,
} from './controllers';

const router: ExpressRouter = Router();

/**
 * GET /admin/analytics/summary
 * Get overview metrics (total requests, users, disbursed amount, etc.)
 */
router.get('/summary', getAnalyticsSummaryController);

/**
 * GET /admin/analytics/trends
 * Get monthly trends data for charts
 * Query params: months (default 6)
 */
router.get('/trends', getAnalyticsTrendsController);

/**
 * GET /admin/analytics/district-breakdown
 * Get per-district statistics
 */
router.get('/district-breakdown', getAnalyticsDistrictBreakdownController);

/**
 * GET /admin/analytics/request-status
 * Get request counts by status
 */
router.get('/request-status', getAnalyticsRequestStatusController);

export default router;

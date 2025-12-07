import { Router, type Router as ExpressRouter } from 'express';
import {
  getAnalyticsSummaryController,
  getAnalyticsTrendsController,
  getAnalyticsDistrictBreakdownController,
  getAnalyticsRequestStatusController,
} from '../controllers/admin-analytics.controller';

const router: ExpressRouter = Router();

/**
 * @openapi
 * /api/v1/admin/analytics/summary:
 *   get:
 *     tags:
 *       - Admin - Analytics
 *     summary: Get analytics summary
 *     description: Returns overview metrics including total requests, users, disbursed amount, etc.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                     totalUsers:
 *                       type: integer
 *                     totalLoans:
 *                       type: integer
 *                     totalDisbursed:
 *                       type: number
 *                     activeLoans:
 *                       type: integer
 *                     pendingRequests:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/summary', getAnalyticsSummaryController);

/**
 * @openapi
 * /api/v1/admin/analytics/trends:
 *   get:
 *     tags:
 *       - Admin - Analytics
 *     summary: Get analytics trends
 *     description: Returns monthly trends data for charts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Number of months to include
 *     responses:
 *       200:
 *         description: Trends data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                       requests:
 *                         type: integer
 *                       approvals:
 *                         type: integer
 *                       disbursements:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/trends', getAnalyticsTrendsController);

/**
 * @openapi
 * /api/v1/admin/analytics/district-breakdown:
 *   get:
 *     tags:
 *       - Admin - Analytics
 *     summary: Get district breakdown
 *     description: Returns per-district statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: District breakdown data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       district:
 *                         type: string
 *                       totalRequests:
 *                         type: integer
 *                       activeLoans:
 *                         type: integer
 *                       totalDisbursed:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/district-breakdown', getAnalyticsDistrictBreakdownController);

/**
 * @openapi
 * /api/v1/admin/analytics/request-status:
 *   get:
 *     tags:
 *       - Admin - Analytics
 *     summary: Get request status breakdown
 *     description: Returns request counts grouped by status/stage
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Request status counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                       count:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/request-status', getAnalyticsRequestStatusController);

export default router;

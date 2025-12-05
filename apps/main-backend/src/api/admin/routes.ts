import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import serviceRoutes from './service/routes';
import agentsRoutes from './agents/routes';
import analyticsRoutes from './analytics/routes';
import auditLogsRoutes from './audit-logs/routes';
import {
  getActiveLoansController,
  getPendingRequestsController
} from './controllers';
import { getRequestsController } from './controllers';
import usersRoutes from './users/routes';

const router: ExpressRouter = Router();

// Admin service routes (related to service management)
router.use('/service', serviceRoutes);

// Admin user management routes
router.use('/users', usersRoutes);

// Admin agent lookup (for assignment UI)
router.use('/agents', agentsRoutes);

// Admin analytics routes
router.use('/analytics', analyticsRoutes);

// Admin audit logs routes
router.use('/audit-logs', auditLogsRoutes);

/**
 * @openapi
 * /api/v1/admin/get-active-loans:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get active loans
 *     description: Returns all active loans for admin dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active loans
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
 *                     $ref: '#/components/schemas/Loan'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/get-active-loans', getActiveLoansController);

/**
 * @openapi
 * /api/v1/admin/get-pending-requests:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get pending requests
 *     description: Returns all pending loan applications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending requests
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
 *                     $ref: '#/components/schemas/Request'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/get-pending-requests', getPendingRequestsController);

/**
 * @openapi
 * /api/v1/admin/requests:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List all requests
 *     description: Generic admin requests listing with filters and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by request stage
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *         description: Filter by district
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by request number or customer name
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Paginated list of requests
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
 *                     requests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Request'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/requests', getRequestsController);


export default router;

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  getAuditLogsController,
  getAuditLogByIdController,
  getAuditLogStatsController,
  getEntityAuditHistoryController,
} from './controllers';

const router: ExpressRouter = Router();

/**
 * @openapi
 * /api/v1/admin/audit-logs:
 *   get:
 *     tags:
 *       - Admin - Audit Logs
 *     summary: List audit logs
 *     description: Returns audit logs with filters and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type (REQUEST, LOAN, USER, etc.)
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter by specific entity ID
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: string
 *         description: Filter by actor/user ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILURE]
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter to date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated list of audit logs
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
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         offset:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/', getAuditLogsController);

/**
 * @openapi
 * /api/v1/admin/audit-logs/stats:
 *   get:
 *     tags:
 *       - Admin - Audit Logs
 *     summary: Get audit log statistics
 *     description: Returns statistics including action counts, entity counts, etc.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit log statistics
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
 *                     totalLogs:
 *                       type: integer
 *                     actionCounts:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     entityCounts:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/stats', getAuditLogStatsController);

/**
 * @openapi
 * /api/v1/admin/audit-logs/entity/{entityType}/{entityId}:
 *   get:
 *     tags:
 *       - Admin - Audit Logs
 *     summary: Get entity audit history
 *     description: Returns audit history for a specific entity (e.g., a specific request or loan)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity type (REQUEST, LOAN, USER, etc.)
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity ID
 *     responses:
 *       200:
 *         description: Audit history for the entity
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
 *                     $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Entity not found
 */
router.get('/entity/:entityType/:entityId', getEntityAuditHistoryController);

/**
 * @openapi
 * /api/v1/admin/audit-logs/{id}:
 *   get:
 *     tags:
 *       - Admin - Audit Logs
 *     summary: Get audit log by ID
 *     description: Returns a single audit log entry with full details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Audit log ID
 *     responses:
 *       200:
 *         description: Audit log entry
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuditLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Audit log not found
 */
router.get('/:id', getAuditLogByIdController);

export default router;

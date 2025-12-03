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
 * GET /admin/audit-logs
 * List audit logs with filters and pagination
 * Query params: action, entityType, entityId, actorId, status, startDate, endDate, limit, offset
 */
router.get('/', getAuditLogsController);

/**
 * GET /admin/audit-logs/stats
 * Get audit log statistics (action counts, entity counts, etc.)
 */
router.get('/stats', getAuditLogStatsController);

/**
 * GET /admin/audit-logs/entity/:entityType/:entityId
 * Get audit history for a specific entity (e.g., a specific request or loan)
 */
router.get('/entity/:entityType/:entityId', getEntityAuditHistoryController);

/**
 * GET /admin/audit-logs/:id
 * Get a single audit log entry by ID
 */
router.get('/:id', getAuditLogByIdController);

export default router;

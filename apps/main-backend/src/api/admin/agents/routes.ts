import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { getAgentsByDistrictController } from './controllers';
import { requireRoles } from '../../../utils/rbac';
import { ROLES } from '@fundifyhub/types';

const router: ExpressRouter = Router();

/**
 * @openapi
 * /api/v1/admin/agents:
 *   get:
 *     tags:
 *       - Admin - Agents
 *     summary: Get agents by district
 *     description: Returns list of agents for a specific district (used in assignment UI)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: district
 *         required: true
 *         schema:
 *           type: string
 *         description: District name to filter agents
 *     responses:
 *       200:
 *         description: List of agents
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
 *                       id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *       400:
 *         description: Missing district parameter
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/', requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]), getAgentsByDistrictController);

export default router;

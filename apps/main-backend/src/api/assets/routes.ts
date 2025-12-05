/**
 * Asset Routes
 * API routes for asset management and warehouse inventory
 *
 * @openapi
 * tags:
 *   - name: Assets
 *     description: Asset management and warehouse inventory
 */

import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import { requireRoles } from '../../utils/rbac'
import { ROLES } from '@fundifyhub/types'
import {
  listAssets,
  getAssetById,
  updateAsset,
  updateAssetStatus,
  createAssetMovement,
  getAssetMovements,
  getAssetByRequestId,
  getWarehouseInventory,
  getAssetStats,
} from './controllers'

const router: ExpressRouter = Router()

// ============================================================================
// Asset Routes
// ============================================================================

/**
 * @openapi
 * /api/v1/assets:
 *   get:
 *     summary: List all assets (admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [IN_STORAGE, RELEASED, AUCTIONED, PENDING_PICKUP]
 *       - in: query
 *         name: warehouseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of assets
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get(
  '/',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  listAssets
)

/**
 * @openapi
 * /api/v1/assets/stats:
 *   get:
 *     summary: Get asset statistics
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Asset statistics
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/stats',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  getAssetStats
)

/**
 * @openapi
 * /api/v1/assets/by-request/{requestId}:
 *   get:
 *     summary: Get asset by request ID
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset details
 *       404:
 *         description: Asset not found
 */
router.get(
  '/by-request/:requestId',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT]),
  getAssetByRequestId
)

/**
 * @openapi
 * /api/v1/assets/{id}:
 *   get:
 *     summary: Get single asset by ID
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset details
 *       404:
 *         description: Asset not found
 */
router.get(
  '/:id',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT]),
  getAssetById
)

/**
 * @openapi
 * /api/v1/assets/{id}:
 *   patch:
 *     summary: Update asset details (admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               goldWeight:
 *                 type: number
 *               goldPurity:
 *                 type: string
 *               valuationAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Asset updated successfully
 *       404:
 *         description: Asset not found
 */
router.patch(
  '/:id',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  updateAsset
)

/**
 * @openapi
 * /api/v1/assets/{id}/status:
 *   patch:
 *     summary: Update asset status (admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [IN_STORAGE, RELEASED, AUCTIONED, PENDING_PICKUP]
 *     responses:
 *       200:
 *         description: Asset status updated
 *       404:
 *         description: Asset not found
 */
router.patch(
  '/:id/status',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  updateAssetStatus
)

/**
 * @openapi
 * /api/v1/assets/{id}/movements:
 *   post:
 *     summary: Create asset movement (transfer between warehouses)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toWarehouseId, reason]
 *             properties:
 *               toWarehouseId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Movement created successfully
 *       404:
 *         description: Asset not found
 */
router.post(
  '/:id/movements',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT]),
  createAssetMovement
)

/**
 * @openapi
 * /api/v1/assets/{id}/movements:
 *   get:
 *     summary: Get asset movement history
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset movement history
 *       404:
 *         description: Asset not found
 */
router.get(
  '/:id/movements',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT]),
  getAssetMovements
)

// ============================================================================
// Warehouse Inventory Routes
// ============================================================================

/**
 * @openapi
 * /api/v1/assets/warehouses/{id}/inventory:
 *   get:
 *     summary: Get warehouse inventory
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Warehouse inventory with assets
 *       404:
 *         description: Warehouse not found
 */
router.get(
  '/warehouses/:id/inventory',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  getWarehouseInventory
)

export default router

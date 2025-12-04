/**
 * Asset Routes
 * API routes for asset management and warehouse inventory
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

// GET /assets - List all assets (admin only)
router.get(
  '/',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  listAssets
)

// GET /assets/stats - Get asset statistics
router.get(
  '/stats',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  getAssetStats
)

// GET /assets/by-request/:requestId - Get asset by request ID
router.get(
  '/by-request/:requestId',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT]),
  getAssetByRequestId
)

// GET /assets/:id - Get single asset
router.get(
  '/:id',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT]),
  getAssetById
)

// PATCH /assets/:id - Update asset details
router.patch(
  '/:id',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  updateAsset
)

// PATCH /assets/:id/status - Update asset status
router.patch(
  '/:id/status',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  updateAssetStatus
)

// POST /assets/:id/movements - Create asset movement
router.post(
  '/:id/movements',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT]),
  createAssetMovement
)

// GET /assets/:id/movements - Get asset movement history
router.get(
  '/:id/movements',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT]),
  getAssetMovements
)

// ============================================================================
// Warehouse Inventory Routes
// ============================================================================

// GET /assets/warehouses/:id/inventory - Get warehouse inventory
router.get(
  '/warehouses/:id/inventory',
  requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]),
  getWarehouseInventory
)

export default router

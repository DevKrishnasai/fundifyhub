/**
 * Asset Controllers
 * Handles CRUD and operations for physical assets pledged against loans
 */

import type { Request, Response } from 'express'
import { prisma } from '@fundifyhub/prisma'
import logger from '../../utils/logger'

// ============================================================================
// GET /assets - List assets with filters
// ============================================================================
export async function listAssets(req: Request, res: Response): Promise<void> {
  try {
    const {
      status,
      condition,
      assetType,
      warehouseId,
      districtId,
      search,
      page = '1',
      limit = '20',
    } = req.query

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: Record<string, unknown> = {
      deletedAt: null,
    }

    if (status) {
      where.status = status as string
    }

    if (condition) {
      where.condition = condition as string
    }

    if (assetType) {
      where.assetType = assetType as string
    }

    if (warehouseId) {
      where.warehouseId = warehouseId as string
    }

    if (districtId) {
      where.warehouse = {
        districtId: districtId as string,
      }
    }

    if (search) {
      where.OR = [
        { brand: { contains: search as string, mode: 'insensitive' } },
        { model: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              currentStatus: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
              district: {
                select: {
                  id: true,
                  name: true,
                  state: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          _count: {
            select: { movements: true, auctionListings: true },
          },
        },
      }),
      prisma.asset.count({ where }),
    ])

    res.status(200).json({
      success: true,
      message: 'Assets retrieved successfully',
      data: {
        assets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    logger.error('listAssets error:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assets',
    })
  }
}

// ============================================================================
// GET /assets/:id - Get single asset with full details
// ============================================================================
export async function getAssetById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const asset = await prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            currentStatus: true,
            requestedAmount: true,
            adminOfferedAmount: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              },
            },
            loan: {
              select: {
                id: true,
                loanNumber: true,
                status: true,
                approvedAmount: true,
              },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            district: {
              select: {
                id: true,
                name: true,
                state: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        movements: {
          orderBy: { movementDate: 'desc' },
          take: 10,
          include: {
            fromWarehouse: { select: { id: true, name: true, code: true } },
            toWarehouse: { select: { id: true, name: true, code: true } },
          },
        },
        auctionListings: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            listingNumber: true,
            status: true,
            startTime: true,
            endTime: true,
            currentHighBid: true,
          },
        },
      },
    })

    if (!asset) {
      res.status(404).json({
        success: false,
        message: 'Asset not found',
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Asset retrieved successfully',
      data: asset,
    })
  } catch (error) {
    logger.error('getAssetById error:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset',
    })
  }
}

// ============================================================================
// PATCH /assets/:id - Update asset details
// ============================================================================
export async function updateAsset(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { condition, inspectedValue, currentMarketValue, description, depreciationRate } = req.body

    const asset = await prisma.asset.findFirst({
      where: { id, deletedAt: null },
    })

    if (!asset) {
      res.status(404).json({
        success: false,
        message: 'Asset not found',
      })
      return
    }

    const updateData: Record<string, unknown> = {}

    if (condition) {
      updateData.condition = condition
    }

    if (inspectedValue !== undefined) {
      updateData.inspectedValue = parseFloat(inspectedValue)
    }

    if (currentMarketValue !== undefined) {
      updateData.currentMarketValue = parseFloat(currentMarketValue)
      updateData.lastValuationDate = new Date()
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (depreciationRate !== undefined) {
      updateData.depreciationRate = parseFloat(depreciationRate)
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: {
        warehouse: {
          select: { id: true, name: true, code: true },
        },
      },
    })

    res.status(200).json({
      success: true,
      message: 'Asset updated successfully',
      data: updatedAsset,
    })
  } catch (error) {
    logger.error('updateAsset error:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to update asset',
    })
  }
}

// ============================================================================
// PATCH /assets/:id/status - Update asset status
// ============================================================================
export async function updateAssetStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status) {
      res.status(400).json({
        success: false,
        message: 'Status is required',
      })
      return
    }

    const asset = await prisma.asset.findFirst({
      where: { id, deletedAt: null },
    })

    if (!asset) {
      res.status(404).json({
        success: false,
        message: 'Asset not found',
      })
      return
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      PLEDGED: ['RELEASED', 'IN_AUCTION'],
      RELEASED: [], // Terminal state for customer return
      IN_AUCTION: ['SOLD', 'PLEDGED'], // Can go back to PLEDGED if auction cancelled
      SOLD: [], // Terminal state
    }

    const currentStatus = asset.status
    const allowedNextStatuses = validTransitions[currentStatus] || []

    if (!allowedNextStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Cannot transition from ${currentStatus} to ${status}. Allowed: ${allowedNextStatuses.join(', ') || 'none'}`,
      })
      return
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: { status },
    })

    res.status(200).json({
      success: true,
      message: 'Asset status updated successfully',
      data: updatedAsset,
    })
  } catch (error) {
    logger.error('updateAssetStatus error:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to update asset status',
    })
  }
}

// ============================================================================
// POST /assets/:id/movements - Create asset movement (transfer)
// ============================================================================
export async function createAssetMovement(req: Request, res: Response): Promise<void> {
  try {
    const { id: assetId } = req.params
    const { movementType, toWarehouseId, notes } = req.body
    const userId = req.user?.id

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
      return
    }

    if (!movementType) {
      res.status(400).json({
        success: false,
        message: 'Movement type is required',
      })
      return
    }

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, deletedAt: null },
      include: {
        warehouse: { select: { id: true, name: true } },
      },
    })

    if (!asset) {
      res.status(404).json({
        success: false,
        message: 'Asset not found',
      })
      return
    }

    // Validate movement type requirements
    if (movementType === 'TRANSFER' && !toWarehouseId) {
      res.status(400).json({
        success: false,
        message: 'Destination warehouse is required for transfer',
      })
      return
    }

    // Verify destination warehouse exists
    let toWarehouse = null
    if (toWarehouseId) {
      toWarehouse = await prisma.warehouse.findFirst({
        where: { id: toWarehouseId, deletedAt: null, isActive: true },
      })

      if (!toWarehouse) {
        res.status(404).json({
          success: false,
          message: 'Destination warehouse not found or inactive',
        })
        return
      }

      // Check capacity
      if (toWarehouse.capacity && toWarehouse.currentCount >= toWarehouse.capacity) {
        res.status(400).json({
          success: false,
          message: 'Destination warehouse is at full capacity',
        })
        return
      }
    }

    // Create movement and update asset in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create movement record
      const movement = await tx.assetMovement.create({
        data: {
          assetId,
          movementType,
          fromWarehouseId: asset.warehouseId,
          toWarehouseId,
          movedBy: userId,
          notes,
        },
        include: {
          fromWarehouse: { select: { id: true, name: true, code: true } },
          toWarehouse: { select: { id: true, name: true, code: true } },
        },
      })

      // Update asset warehouse
      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: {
          warehouseId: toWarehouseId || null,
        },
      })

      // Update warehouse counts
      if (asset.warehouseId) {
        await tx.warehouse.update({
          where: { id: asset.warehouseId },
          data: { currentCount: { decrement: 1 } },
        })
      }

      if (toWarehouseId) {
        await tx.warehouse.update({
          where: { id: toWarehouseId },
          data: { currentCount: { increment: 1 } },
        })
      }

      return { movement, asset: updatedAsset }
    })

    res.status(201).json({
      success: true,
      message: 'Asset movement recorded successfully',
      data: result,
    })
  } catch (error) {
    logger.error('createAssetMovement error:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to record asset movement',
    })
  }
}

// ============================================================================
// GET /assets/:id/movements - Get asset movement history
// ============================================================================
export async function getAssetMovements(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { page = '1', limit = '20' } = req.query

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const asset = await prisma.asset.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })

    if (!asset) {
      res.status(404).json({
        success: false,
        message: 'Asset not found',
      })
      return
    }

    const [movements, total] = await Promise.all([
      prisma.assetMovement.findMany({
        where: { assetId: id },
        skip,
        take: limitNum,
        orderBy: { movementDate: 'desc' },
        include: {
          fromWarehouse: {
            select: {
              id: true,
              name: true,
              code: true,
              district: { select: { name: true } },
            },
          },
          toWarehouse: {
            select: {
              id: true,
              name: true,
              code: true,
              district: { select: { name: true } },
            },
          },
        },
      }),
      prisma.assetMovement.count({ where: { assetId: id } }),
    ])

    res.status(200).json({
      success: true,
      message: 'Asset movements retrieved successfully',
      data: {
        movements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    logger.error('getAssetMovements error:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset movements',
    })
  }
}

// ============================================================================
// GET /assets/by-request/:requestId - Get asset by request ID
// ============================================================================
export async function getAssetByRequestId(req: Request, res: Response): Promise<void> {
  try {
    const { requestId } = req.params

    const asset = await prisma.asset.findFirst({
      where: { requestId, deletedAt: null },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
            district: {
              select: { id: true, name: true },
            },
          },
        },
        movements: {
          orderBy: { movementDate: 'desc' },
          take: 5,
          include: {
            fromWarehouse: { select: { id: true, name: true } },
            toWarehouse: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!asset) {
      res.status(404).json({
        success: false,
        message: 'No asset found for this request',
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Asset retrieved successfully',
      data: asset,
    })
  } catch (error) {
    logger.error('getAssetByRequestId error:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset',
    })
  }
}

// ============================================================================
// GET /warehouses/:id/inventory - Get warehouse inventory
// ============================================================================
export async function getWarehouseInventory(req: Request, res: Response): Promise<void> {
  try {
    const { id: warehouseId } = req.params
    const { status, condition, page = '1', limit = '20' } = req.query

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    // Verify warehouse exists
    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, deletedAt: null },
      include: {
        district: {
          select: {
            id: true,
            name: true,
            state: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!warehouse) {
      res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      })
      return
    }

    // Build where clause
    const where: Record<string, unknown> = {
      warehouseId,
      deletedAt: null,
    }

    if (status) {
      where.status = status as string
    }

    if (condition) {
      where.condition = condition as string
    }

    const [assets, total, stats] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              customer: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      prisma.asset.count({ where }),
      // Get inventory stats
      prisma.asset.groupBy({
        by: ['status'],
        where: { warehouseId, deletedAt: null },
        _count: { status: true },
      }),
    ])

    // Format stats
    const statusCounts: Record<string, number> = {}
    stats.forEach((s) => {
      statusCounts[s.status] = s._count.status
    })

    res.status(200).json({
      success: true,
      message: 'Warehouse inventory retrieved successfully',
      data: {
        warehouse: {
          id: warehouse.id,
          name: warehouse.name,
          code: warehouse.code,
          capacity: warehouse.capacity,
          currentCount: warehouse.currentCount,
          district: warehouse.district,
        },
        stats: statusCounts,
        assets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    logger.error('getWarehouseInventory error:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve warehouse inventory',
    })
  }
}

// ============================================================================
// GET /assets/stats - Get asset statistics
// ============================================================================
export async function getAssetStats(req: Request, res: Response): Promise<void> {
  try {
    const { districtId, warehouseId } = req.query

    const where: Record<string, unknown> = { deletedAt: null }

    if (warehouseId) {
      where.warehouseId = warehouseId as string
    }

    if (districtId) {
      where.warehouse = { districtId: districtId as string }
    }

    const [byStatus, byCondition, byType, totalValue] = await Promise.all([
      prisma.asset.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      prisma.asset.groupBy({
        by: ['condition'],
        where,
        _count: { condition: true },
      }),
      prisma.asset.groupBy({
        by: ['assetType'],
        where,
        _count: { assetType: true },
      }),
      prisma.asset.aggregate({
        where,
        _sum: {
          inspectedValue: true,
          currentMarketValue: true,
        },
        _count: { id: true },
      }),
    ])

    res.status(200).json({
      success: true,
      message: 'Asset statistics retrieved successfully',
      data: {
        totalAssets: totalValue._count.id,
        totalInspectedValue: totalValue._sum.inspectedValue || 0,
        totalMarketValue: totalValue._sum.currentMarketValue || 0,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
        byCondition: byCondition.map((c) => ({ condition: c.condition, count: c._count.condition })),
        byType: byType.map((t) => ({ type: t.assetType, count: t._count.assetType })),
      },
    })
  } catch (error) {
    logger.error('getAssetStats error:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve asset statistics',
    })
  }
}

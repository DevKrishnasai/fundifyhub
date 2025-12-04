/**
 * Geography API Controllers
 * Handles CRUD operations for countries, states, districts, and warehouses
 */

import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import { ROLES } from '@fundifyhub/types';
import logger from '../../utils/logger';

// ============================================================================
// Countries
// ============================================================================

/**
 * GET /geography/countries
 * Get all countries
 */
export async function getCountriesController(req: Request, res: Response): Promise<void> {
  try {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { states: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Countries retrieved successfully',
      data: countries,
    });
  } catch (error) {
    logger.error('Error fetching countries:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch countries',
    });
  }
}

/**
 * GET /geography/countries/:id
 * Get a single country by ID
 */
export async function getCountryByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const country = await prisma.country.findUnique({
      where: { id },
      include: {
        states: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { states: true },
        },
      },
    });

    if (!country) {
      res.status(404).json({
        success: false,
        message: 'Country not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Country retrieved successfully',
      data: country,
    });
  } catch (error) {
    logger.error('Error fetching country:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch country',
    });
  }
}

/**
 * POST /geography/countries
 * Create a new country (Super Admin only)
 */
export async function createCountryController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.roles.includes(ROLES.SUPER_ADMIN)) {
      res.status(403).json({
        success: false,
        message: 'Only Super Admin can create countries',
      });
      return;
    }

    const { name, code } = req.body;

    if (!name || !code) {
      res.status(400).json({
        success: false,
        message: 'Name and code are required',
      });
      return;
    }

    const country = await prisma.country.create({
      data: {
        name,
        code: code.toUpperCase(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Country created successfully',
      data: country,
    });
  } catch (error) {
    logger.error('Error creating country:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create country',
    });
  }
}

// ============================================================================
// States
// ============================================================================

/**
 * GET /geography/states
 * Get all states
 */
export async function getStatesController(req: Request, res: Response): Promise<void> {
  try {
    const states = await prisma.state.findMany({
      where: { isActive: true },
      include: {
        country: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { districts: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'States retrieved successfully',
      data: states,
    });
  } catch (error) {
    logger.error('Error fetching states:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
    });
  }
}

/**
 * GET /geography/countries/:countryId/states
 * Get states by country ID
 */
export async function getStatesByCountryController(req: Request, res: Response): Promise<void> {
  try {
    const { countryId } = req.params;

    const states = await prisma.state.findMany({
      where: {
        countryId,
        isActive: true,
      },
      include: {
        _count: {
          select: { districts: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'States retrieved successfully',
      data: states,
    });
  } catch (error) {
    logger.error('Error fetching states by country:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
    });
  }
}

/**
 * GET /geography/states/:id
 * Get a single state by ID
 */
export async function getStateByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const state = await prisma.state.findUnique({
      where: { id },
      include: {
        country: {
          select: { id: true, name: true, code: true },
        },
        districts: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { districts: true },
        },
      },
    });

    if (!state) {
      res.status(404).json({
        success: false,
        message: 'State not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'State retrieved successfully',
      data: state,
    });
  } catch (error) {
    logger.error('Error fetching state:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch state',
    });
  }
}

/**
 * POST /geography/states
 * Create a new state (Super Admin only)
 */
export async function createStateController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.roles.includes(ROLES.SUPER_ADMIN)) {
      res.status(403).json({
        success: false,
        message: 'Only Super Admin can create states',
      });
      return;
    }

    const { name, code, countryId } = req.body;

    if (!name || !code || !countryId) {
      res.status(400).json({
        success: false,
        message: 'Name, code, and countryId are required',
      });
      return;
    }

    // Verify country exists
    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      res.status(404).json({
        success: false,
        message: 'Country not found',
      });
      return;
    }

    const state = await prisma.state.create({
      data: {
        name,
        code: code.toUpperCase(),
        countryId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'State created successfully',
      data: state,
    });
  } catch (error) {
    logger.error('Error creating state:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create state',
    });
  }
}

// ============================================================================
// Districts
// ============================================================================

/**
 * GET /geography/districts
 * Get all districts
 */
export async function getDistrictsController(req: Request, res: Response): Promise<void> {
  try {
    const districts = await prisma.district.findMany({
      where: { isActive: true },
      include: {
        state: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { warehouses: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Districts retrieved successfully',
      data: districts,
    });
  } catch (error) {
    logger.error('Error fetching districts:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
    });
  }
}

/**
 * GET /geography/states/:stateId/districts
 * Get districts by state ID
 */
export async function getDistrictsByStateController(req: Request, res: Response): Promise<void> {
  try {
    const { stateId } = req.params;

    const districts = await prisma.district.findMany({
      where: {
        stateId,
        isActive: true,
      },
      include: {
        _count: {
          select: { warehouses: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Districts retrieved successfully',
      data: districts,
    });
  } catch (error) {
    logger.error('Error fetching districts by state:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch districts',
    });
  }
}

/**
 * GET /geography/districts/:id
 * Get a single district by ID
 */
export async function getDistrictByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const district = await prisma.district.findUnique({
      where: { id },
      include: {
        state: {
          include: {
            country: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        warehouses: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { warehouses: true },
        },
      },
    });

    if (!district) {
      res.status(404).json({
        success: false,
        message: 'District not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'District retrieved successfully',
      data: district,
    });
  } catch (error) {
    logger.error('Error fetching district:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch district',
    });
  }
}

/**
 * POST /geography/districts
 * Create a new district (Super Admin only)
 */
export async function createDistrictController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.roles.includes(ROLES.SUPER_ADMIN)) {
      res.status(403).json({
        success: false,
        message: 'Only Super Admin can create districts',
      });
      return;
    }

    const { name, code, stateId } = req.body;

    if (!name || !code || !stateId) {
      res.status(400).json({
        success: false,
        message: 'Name, code, and stateId are required',
      });
      return;
    }

    // Verify state exists
    const state = await prisma.state.findUnique({
      where: { id: stateId },
    });

    if (!state) {
      res.status(404).json({
        success: false,
        message: 'State not found',
      });
      return;
    }

    const district = await prisma.district.create({
      data: {
        name,
        code: code.toUpperCase(),
        stateId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'District created successfully',
      data: district,
    });
  } catch (error) {
    logger.error('Error creating district:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create district',
    });
  }
}

// ============================================================================
// Warehouses
// ============================================================================

/**
 * GET /geography/warehouses
 * Get all warehouses
 */
export async function getWarehousesController(req: Request, res: Response): Promise<void> {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      include: {
        district: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Warehouses retrieved successfully',
      data: warehouses,
    });
  } catch (error) {
    logger.error('Error fetching warehouses:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouses',
    });
  }
}

/**
 * GET /geography/districts/:districtId/warehouses
 * Get warehouses by district ID
 */
export async function getWarehousesByDistrictController(req: Request, res: Response): Promise<void> {
  try {
    const { districtId } = req.params;

    const warehouses = await prisma.warehouse.findMany({
      where: {
        districtId,
        isActive: true,
      },
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      message: 'Warehouses retrieved successfully',
      data: warehouses,
    });
  } catch (error) {
    logger.error('Error fetching warehouses by district:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouses',
    });
  }
}

/**
 * GET /geography/warehouses/:id
 * Get a single warehouse by ID
 */
export async function getWarehouseByIdController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        district: {
          include: {
            state: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        _count: {
          select: { assets: true },
        },
      },
    });

    if (!warehouse) {
      res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Warehouse retrieved successfully',
      data: warehouse,
    });
  } catch (error) {
    logger.error('Error fetching warehouse:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse',
    });
  }
}

/**
 * POST /geography/warehouses
 * Create a new warehouse (Super Admin or District Admin)
 */
export async function createWarehouseController(req: Request, res: Response): Promise<void> {
  try {
    const userRoles = req.user?.roles ?? [];
    const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN);
    const isDistrictAdmin = userRoles.includes(ROLES.DISTRICT_ADMIN);

    if (!isSuperAdmin && !isDistrictAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only Super Admin or District Admin can create warehouses',
      });
      return;
    }

    const { name, code, districtId, address, latitude, longitude, capacity, contactPerson, contactPhone } = req.body;

    if (!name || !code || !districtId) {
      res.status(400).json({
        success: false,
        message: 'Name, code, and districtId are required',
      });
      return;
    }

    // Verify district exists
    const district = await prisma.district.findUnique({
      where: { id: districtId },
    });

    if (!district) {
      res.status(404).json({
        success: false,
        message: 'District not found',
      });
      return;
    }

    // District admin can only create warehouses in their districts
    if (isDistrictAdmin && !isSuperAdmin) {
      const userDistricts = req.user?.districts ?? [];
      if (!userDistricts.includes(districtId)) {
        res.status(403).json({
          success: false,
          message: 'You can only create warehouses in your assigned districts',
        });
        return;
      }
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        code: code.toUpperCase(),
        districtId,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        contactPerson,
        contactPhone,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse,
    });
  } catch (error) {
    logger.error('Error creating warehouse:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create warehouse',
    });
  }
}

/**
 * PUT /geography/warehouses/:id
 * Update a warehouse (Super Admin or District Admin)
 */
export async function updateWarehouseController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userRoles = req.user?.roles ?? [];
    const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN);
    const isDistrictAdmin = userRoles.includes(ROLES.DISTRICT_ADMIN);

    if (!isSuperAdmin && !isDistrictAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only Super Admin or District Admin can update warehouses',
      });
      return;
    }

    // Find existing warehouse
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!existingWarehouse) {
      res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
      return;
    }

    // District admin can only update warehouses in their districts
    if (isDistrictAdmin && !isSuperAdmin) {
      const userDistricts = req.user?.districts ?? [];
      if (!userDistricts.includes(existingWarehouse.districtId)) {
        res.status(403).json({
          success: false,
          message: 'You can only update warehouses in your assigned districts',
        });
        return;
      }
    }

    const { name, address, latitude, longitude, capacity, contactPerson, contactPhone, isActive } = req.body;

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(capacity !== undefined && { capacity: capacity ? parseInt(capacity, 10) : null }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        district: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { assets: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Warehouse updated successfully',
      data: warehouse,
    });
  } catch (error) {
    logger.error('Error updating warehouse:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update warehouse',
    });
  }
}

/**
 * PUT /geography/warehouses/:id/capacity
 * Update warehouse capacity (Super Admin or District Admin)
 */
export async function updateWarehouseCapacityController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { capacity } = req.body;
    const userRoles = req.user?.roles ?? [];
    const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN);
    const isDistrictAdmin = userRoles.includes(ROLES.DISTRICT_ADMIN);

    if (!isSuperAdmin && !isDistrictAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only Super Admin or District Admin can update warehouse capacity',
      });
      return;
    }

    if (capacity === undefined || capacity === null) {
      res.status(400).json({
        success: false,
        message: 'Capacity is required',
      });
      return;
    }

    const parsedCapacity = parseInt(capacity, 10);
    if (isNaN(parsedCapacity) || parsedCapacity < 0) {
      res.status(400).json({
        success: false,
        message: 'Capacity must be a valid non-negative number',
      });
      return;
    }

    // Find existing warehouse with current asset count
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });

    if (!existingWarehouse) {
      res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
      return;
    }

    // District admin can only update warehouses in their districts
    if (isDistrictAdmin && !isSuperAdmin) {
      const userDistricts = req.user?.districts ?? [];
      if (!userDistricts.includes(existingWarehouse.districtId)) {
        res.status(403).json({
          success: false,
          message: 'You can only update warehouses in your assigned districts',
        });
        return;
      }
    }

    // Validate capacity is not less than current asset count
    if (parsedCapacity < existingWarehouse._count.assets) {
      res.status(400).json({
        success: false,
        message: `Capacity cannot be less than current asset count (${existingWarehouse._count.assets})`,
      });
      return;
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: {
        capacity: parsedCapacity,
        currentCount: existingWarehouse._count.assets,
      },
      include: {
        district: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { assets: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Warehouse capacity updated successfully',
      data: {
        ...warehouse,
        capacityUsed: warehouse._count.assets,
        capacityAvailable: warehouse.capacity ? warehouse.capacity - warehouse._count.assets : null,
        capacityPercentage: warehouse.capacity
          ? Math.round((warehouse._count.assets / warehouse.capacity) * 100)
          : null,
      },
    });
  } catch (error) {
    logger.error('Error updating warehouse capacity:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update warehouse capacity',
    });
  }
}

/**
 * GET /geography/warehouses/:id/inventory
 * Get warehouse inventory with asset details
 */
export async function getWarehouseInventoryController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      status,
      assetType,
      condition,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Find warehouse first
    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        district: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!warehouse) {
      res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
      return;
    }

    // Build where clause for assets
    const where: Record<string, unknown> = {
      warehouseId: id,
      deletedAt: null,
    };

    if (status) {
      where.status = status as string;
    }

    if (assetType) {
      where.assetType = assetType as string;
    }

    if (condition) {
      where.condition = condition as string;
    }

    if (search) {
      where.OR = [
        { brand: { contains: search as string, mode: 'insensitive' } },
        { model: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [assets, total, statusStats] = await Promise.all([
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
                },
              },
            },
          },
        },
      }),
      prisma.asset.count({ where }),
      prisma.asset.groupBy({
        by: ['status'],
        where: { warehouseId: id, deletedAt: null },
        _count: true,
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Warehouse inventory retrieved successfully',
      data: {
        warehouse: {
          ...warehouse,
          capacity: warehouse.capacity,
          currentCount: total,
          capacityAvailable: warehouse.capacity ? warehouse.capacity - total : null,
          capacityPercentage: warehouse.capacity
            ? Math.round((total / warehouse.capacity) * 100)
            : null,
        },
        assets,
        statusBreakdown: statusStats.reduce(
          (acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching warehouse inventory:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse inventory',
    });
  }
}

/**
 * GET /geography/warehouses/capacity-summary
 * Get capacity summary for all warehouses
 */
export async function getWarehouseCapacitySummaryController(req: Request, res: Response): Promise<void> {
  try {
    const { districtId, belowCapacityThreshold } = req.query;

    const where: Record<string, unknown> = {
      isActive: true,
      deletedAt: null,
    };

    if (districtId) {
      where.districtId = districtId as string;
    }

    const warehouses = await prisma.warehouse.findMany({
      where,
      include: {
        district: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate capacity metrics
    const warehouseMetrics = warehouses.map((wh) => {
      const assetCount = wh._count.assets;
      const capacity = wh.capacity ?? 0;
      const capacityAvailable = capacity > 0 ? capacity - assetCount : null;
      const capacityPercentage = capacity > 0 ? Math.round((assetCount / capacity) * 100) : null;

      return {
        id: wh.id,
        name: wh.name,
        code: wh.code,
        district: wh.district,
        capacity,
        currentCount: assetCount,
        capacityAvailable,
        capacityPercentage,
        isOverCapacity: capacity > 0 && assetCount > capacity,
        isNearCapacity: capacity > 0 && capacityPercentage !== null && capacityPercentage >= 80,
      };
    });

    // Filter by capacity threshold if specified
    let filteredWarehouses = warehouseMetrics;
    if (belowCapacityThreshold) {
      const threshold = parseInt(belowCapacityThreshold as string, 10);
      if (!isNaN(threshold)) {
        filteredWarehouses = warehouseMetrics.filter(
          (wh) => wh.capacityPercentage === null || wh.capacityPercentage < threshold
        );
      }
    }

    // Summary statistics
    const totalCapacity = warehouseMetrics.reduce((sum, wh) => sum + (wh.capacity ?? 0), 0);
    const totalAssets = warehouseMetrics.reduce((sum, wh) => sum + wh.currentCount, 0);
    const overCapacityCount = warehouseMetrics.filter((wh) => wh.isOverCapacity).length;
    const nearCapacityCount = warehouseMetrics.filter((wh) => wh.isNearCapacity && !wh.isOverCapacity).length;

    res.status(200).json({
      success: true,
      message: 'Warehouse capacity summary retrieved successfully',
      data: {
        summary: {
          totalWarehouses: warehouseMetrics.length,
          totalCapacity,
          totalAssets,
          overallUtilization: totalCapacity > 0 ? Math.round((totalAssets / totalCapacity) * 100) : null,
          overCapacityCount,
          nearCapacityCount,
          healthyCount: warehouseMetrics.length - overCapacityCount - nearCapacityCount,
        },
        warehouses: filteredWarehouses,
      },
    });
  } catch (error) {
    logger.error('Error fetching warehouse capacity summary:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse capacity summary',
    });
  }
}

/**
 * DELETE /geography/warehouses/:id
 * Soft delete a warehouse (Super Admin only)
 */
export async function deleteWarehouseController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userRoles = req.user?.roles ?? [];
    const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN);

    if (!isSuperAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only Super Admin can delete warehouses',
      });
      return;
    }

    // Find existing warehouse with asset count
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });

    if (!existingWarehouse) {
      res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
      return;
    }

    // Prevent deletion if warehouse has assets
    if (existingWarehouse._count.assets > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete warehouse with ${existingWarehouse._count.assets} assets. Transfer or remove assets first.`,
      });
      return;
    }

    // Soft delete
    await prisma.warehouse.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: req.user?.id,
        isActive: false,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Warehouse deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting warehouse:', error instanceof Error ? error : { error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete warehouse',
    });
  }
}

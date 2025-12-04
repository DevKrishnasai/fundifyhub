/**
 * Geography API Routes
 * Provides endpoints for countries, states, districts, and warehouses
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  // Countries
  getCountriesController,
  getCountryByIdController,
  createCountryController,
  // States
  getStatesController,
  getStatesByCountryController,
  getStateByIdController,
  createStateController,
  // Districts
  getDistrictsController,
  getDistrictsByStateController,
  getDistrictByIdController,
  createDistrictController,
  // Warehouses
  getWarehousesController,
  getWarehousesByDistrictController,
  getWarehouseByIdController,
  createWarehouseController,
  updateWarehouseController,
  updateWarehouseCapacityController,
  getWarehouseInventoryController,
  getWarehouseCapacitySummaryController,
  deleteWarehouseController,
} from './controllers';

const router: ExpressRouter = Router();

// ============================================================================
// Countries
// ============================================================================

// GET /geography/countries - Get all countries
router.get('/countries', getCountriesController);

// GET /geography/countries/:id - Get a single country
router.get('/countries/:id', getCountryByIdController);

// POST /geography/countries - Create a new country (Super Admin only)
router.post('/countries', createCountryController);

// GET /geography/countries/:countryId/states - Get states by country
router.get('/countries/:countryId/states', getStatesByCountryController);

// ============================================================================
// States
// ============================================================================

// GET /geography/states - Get all states
router.get('/states', getStatesController);

// GET /geography/states/:id - Get a single state
router.get('/states/:id', getStateByIdController);

// POST /geography/states - Create a new state (Super Admin only)
router.post('/states', createStateController);

// GET /geography/states/:stateId/districts - Get districts by state
router.get('/states/:stateId/districts', getDistrictsByStateController);

// ============================================================================
// Districts
// ============================================================================

// GET /geography/districts - Get all districts
router.get('/districts', getDistrictsController);

// GET /geography/districts/:id - Get a single district
router.get('/districts/:id', getDistrictByIdController);

// POST /geography/districts - Create a new district (Super Admin only)
router.post('/districts', createDistrictController);

// GET /geography/districts/:districtId/warehouses - Get warehouses by district
router.get('/districts/:districtId/warehouses', getWarehousesByDistrictController);

// ============================================================================
// Warehouses
// ============================================================================

// GET /geography/warehouses/capacity-summary - Get capacity summary for all warehouses
// Note: This must come before /:id routes to avoid route conflicts
router.get('/warehouses/capacity-summary', getWarehouseCapacitySummaryController);

// GET /geography/warehouses - Get all warehouses
router.get('/warehouses', getWarehousesController);

// GET /geography/warehouses/:id - Get a single warehouse
router.get('/warehouses/:id', getWarehouseByIdController);

// GET /geography/warehouses/:id/inventory - Get warehouse inventory with assets
router.get('/warehouses/:id/inventory', getWarehouseInventoryController);

// POST /geography/warehouses - Create a new warehouse (Super Admin or District Admin)
router.post('/warehouses', createWarehouseController);

// PUT /geography/warehouses/:id - Update a warehouse (Super Admin or District Admin)
router.put('/warehouses/:id', updateWarehouseController);

// PUT /geography/warehouses/:id/capacity - Update warehouse capacity
router.put('/warehouses/:id/capacity', updateWarehouseCapacityController);

// DELETE /geography/warehouses/:id - Soft delete a warehouse (Super Admin only)
router.delete('/warehouses/:id', deleteWarehouseController);

export default router;

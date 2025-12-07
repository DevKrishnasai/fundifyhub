/**
 * Geography API Routes
 * Provides endpoints for countries, states, districts, and warehouses
 * 
 * @openapi
 * tags:
 *   - name: Geography
 *     description: Country, State, District, and Warehouse management
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
} from '../controllers/geography.controller';

const router: ExpressRouter = Router();

// ============================================================================
// Countries
// ============================================================================

/**
 * @openapi
 * /api/v1/geography/countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Geography]
 *     responses:
 *       200:
 *         description: List of countries
 */
router.get('/countries', getCountriesController);

/**
 * @openapi
 * /api/v1/geography/countries/{id}:
 *   get:
 *     summary: Get a single country by ID
 *     tags: [Geography]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Country details
 *       404:
 *         description: Country not found
 */
router.get('/countries/:id', getCountryByIdController);

/**
 * @openapi
 * /api/v1/geography/countries:
 *   post:
 *     summary: Create a new country (Super Admin only)
 *     tags: [Geography]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Country created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.post('/countries', createCountryController);

/**
 * @openapi
 * /api/v1/geography/countries/{countryId}/states:
 *   get:
 *     summary: Get states by country
 *     tags: [Geography]
 *     parameters:
 *       - in: path
 *         name: countryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of states in the country
 */
router.get('/countries/:countryId/states', getStatesByCountryController);

// ============================================================================
// States
// ============================================================================

/**
 * @openapi
 * /api/v1/geography/states:
 *   get:
 *     summary: Get all states
 *     tags: [Geography]
 *     responses:
 *       200:
 *         description: List of states
 */
router.get('/states', getStatesController);

/**
 * @openapi
 * /api/v1/geography/states/{id}:
 *   get:
 *     summary: Get a single state by ID
 *     tags: [Geography]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: State details
 *       404:
 *         description: State not found
 */
router.get('/states/:id', getStateByIdController);

/**
 * @openapi
 * /api/v1/geography/states:
 *   post:
 *     summary: Create a new state (Super Admin only)
 *     tags: [Geography]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, countryId]
 *             properties:
 *               name:
 *                 type: string
 *               countryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: State created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/states', createStateController);

/**
 * @openapi
 * /api/v1/geography/states/{stateId}/districts:
 *   get:
 *     summary: Get districts by state
 *     tags: [Geography]
 *     parameters:
 *       - in: path
 *         name: stateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of districts in the state
 */
router.get('/states/:stateId/districts', getDistrictsByStateController);

// ============================================================================
// Districts
// ============================================================================

/**
 * @openapi
 * /api/v1/geography/districts:
 *   get:
 *     summary: Get all districts
 *     tags: [Geography]
 *     responses:
 *       200:
 *         description: List of districts
 */
router.get('/districts', getDistrictsController);

/**
 * @openapi
 * /api/v1/geography/districts/{id}:
 *   get:
 *     summary: Get a single district by ID
 *     tags: [Geography]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: District details
 *       404:
 *         description: District not found
 */
router.get('/districts/:id', getDistrictByIdController);

/**
 * @openapi
 * /api/v1/geography/districts:
 *   post:
 *     summary: Create a new district (Super Admin only)
 *     tags: [Geography]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, stateId]
 *             properties:
 *               name:
 *                 type: string
 *               stateId:
 *                 type: string
 *     responses:
 *       201:
 *         description: District created successfully
 */
router.post('/districts', createDistrictController);

/**
 * @openapi
 * /api/v1/geography/districts/{districtId}/warehouses:
 *   get:
 *     summary: Get warehouses by district
 *     tags: [Geography]
 *     parameters:
 *       - in: path
 *         name: districtId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of warehouses in the district
 */
router.get('/districts/:districtId/warehouses', getWarehousesByDistrictController);

// ============================================================================
// Warehouses
// ============================================================================

/**
 * @openapi
 * /api/v1/geography/warehouses/capacity-summary:
 *   get:
 *     summary: Get capacity summary for all warehouses
 *     tags: [Geography]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Warehouse capacity summary
 */
router.get('/warehouses/capacity-summary', getWarehouseCapacitySummaryController);

/**
 * @openapi
 * /api/v1/geography/warehouses:
 *   get:
 *     summary: Get all warehouses
 *     tags: [Geography]
 *     responses:
 *       200:
 *         description: List of warehouses
 */
router.get('/warehouses', getWarehousesController);

/**
 * @openapi
 * /api/v1/geography/warehouses/{id}:
 *   get:
 *     summary: Get a single warehouse by ID
 *     tags: [Geography]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Warehouse details
 *       404:
 *         description: Warehouse not found
 */
router.get('/warehouses/:id', getWarehouseByIdController);

/**
 * @openapi
 * /api/v1/geography/warehouses/{id}/inventory:
 *   get:
 *     summary: Get warehouse inventory with assets
 *     tags: [Geography]
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
 *         description: Warehouse inventory details
 */
router.get('/warehouses/:id/inventory', getWarehouseInventoryController);

/**
 * @openapi
 * /api/v1/geography/warehouses:
 *   post:
 *     summary: Create a new warehouse (Super Admin or District Admin)
 *     tags: [Geography]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, districtId]
 *             properties:
 *               name:
 *                 type: string
 *               districtId:
 *                 type: string
 *               address:
 *                 type: string
 *               maxCapacity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Warehouse created successfully
 */
router.post('/warehouses', createWarehouseController);

/**
 * @openapi
 * /api/v1/geography/warehouses/{id}:
 *   put:
 *     summary: Update a warehouse (Super Admin or District Admin)
 *     tags: [Geography]
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
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Warehouse updated successfully
 */
router.put('/warehouses/:id', updateWarehouseController);

/**
 * @openapi
 * /api/v1/geography/warehouses/{id}/capacity:
 *   put:
 *     summary: Update warehouse capacity
 *     tags: [Geography]
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
 *             required: [maxCapacity]
 *             properties:
 *               maxCapacity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Warehouse capacity updated
 */
router.put('/warehouses/:id/capacity', updateWarehouseCapacityController);

/**
 * @openapi
 * /api/v1/geography/warehouses/{id}:
 *   delete:
 *     summary: Soft delete a warehouse (Super Admin only)
 *     tags: [Geography]
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
 *         description: Warehouse deleted successfully
 *       403:
 *         description: Forbidden - Super Admin only
 */
router.delete('/warehouses/:id', deleteWarehouseController);

export default router;

/**
 * Geography Routes
 *
 * GET /geography/countries
 * GET /geography/states
 * GET /geography/districts
 *
 * @module api/http/routes/geography
 */

import { Router } from 'express';
import { asyncHandler } from '../middlewares';
import { DISTRICTS } from '@fundifyhub/types';

const router: Router = Router();

router.get(
  '/countries',
  asyncHandler(async (req, res) => {
    // TODO: (agent) Call geographyService.getCountries()
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  })
);

router.get(
  '/states',
  asyncHandler(async (req, res) => {
    // TODO: (agent) Call geographyService.getStates()
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  })
);

router.get(
  '/districts',
  asyncHandler(async (req, res) => {
    // TODO: Query from database when geography hierarchy is set up
    // For now, return hardcoded Telangana districts for backward compatibility
    const currentDate = new Date().toISOString();
    res.status(200).json({
      success: true,
      message: 'Districts retrieved successfully',
      data: DISTRICTS.map((name, index) => ({
        id: `district-${index + 1}`,
        name,
        code: name.toLowerCase().replace(/\s+/g, '-'),
        stateId: 'telangana-state-001', // Placeholder
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        createdAt: currentDate,
        updatedAt: currentDate,
      })),
    });
  })
);

export default router;

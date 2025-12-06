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
    // TODO: (agent) Call geographyService.getDistricts()
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  })
);

export default router;

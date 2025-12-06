/**
 * Geography Controller
 *
 * Handles HTTP requests for geographical data.
 *
 * @module api/http/controllers/geography
 */
import type { Request, Response } from 'express';

export const geographyController = {
  async getCountries(req: Request, res: Response) {
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  },

  async getStates(req: Request, res: Response) {
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  },

  async getDistricts(req: Request, res: Response) {
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  },
};

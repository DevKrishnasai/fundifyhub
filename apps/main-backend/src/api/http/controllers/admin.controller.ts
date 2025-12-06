/**
 * Admin Controller
 *
 * Handles HTTP requests for admin functionality.
 *
 * @module api/http/controllers/admin
 */
import type { Request, Response } from 'express';

export const adminController = {
  async getDashboard(req: Request, res: Response) {
    res.json({
      success: true,
      message: 'Welcome to the admin dashboard',
    });
  },
};

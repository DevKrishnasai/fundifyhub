import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import serviceRoutes from './service/routes';
import {
  getActiveLoansController,
  getPendingRequestsController
} from './controllers';
import usersRoutes from './users/routes';

const router: ExpressRouter = Router();

// Admin service routes (related to service management)
router.use('/service', serviceRoutes);

// Admin user management routes
router.use('/users', usersRoutes);

/** GET /admin/getActiveLoans
 * Get all active loans
 */
router.get('/get-active-loans', getActiveLoansController);

/**
 * GET /admin/getPendingRequests
 * Get all pending loan applications
 */
router.get('/get-pending-requests', getPendingRequestsController);


export default router;

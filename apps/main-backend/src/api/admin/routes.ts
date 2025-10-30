import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import serviceRoutes from './service/routes';
import { requireAuth, requireAdmin } from '../auth';
import {
  getActiveLoansController,
  getPendingRequestsController
} from './controllers';
import usersRoutes from './users/routes';

const router: ExpressRouter = Router();

// Admin service routes (related to service management)
router.use('/service', serviceRoutes);

router.use('/users', usersRoutes);

/** GET /admin/getActiveLoans
 * Get all active loans
 */
router.get('/get-active-loans', requireAuth, requireAdmin, getActiveLoansController);


/**
 * GET /admin/getPendingRequests
 * Get all pending loan applications
 */
router.get('/get-pending-requests', requireAuth, requireAdmin, getPendingRequestsController);


export default router;

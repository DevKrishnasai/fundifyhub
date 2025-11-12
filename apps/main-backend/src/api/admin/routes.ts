import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import serviceRoutes from './service/routes';
import agentsRoutes from './agents/routes';
import {
  getActiveLoansController,
  getPendingRequestsController
} from './controllers';
import { getRequestsController } from './controllers';
import usersRoutes from './users/routes';

const router: ExpressRouter = Router();

// Admin service routes (related to service management)
router.use('/service', serviceRoutes);

// Admin user management routes
router.use('/users', usersRoutes);

// Admin agent lookup (for assignment UI)
router.use('/agents', agentsRoutes);

/** GET /admin/getActiveLoans
 * Get all active loans
 */
router.get('/get-active-loans', getActiveLoansController);

/**
 * GET /admin/getPendingRequests
 * Get all pending loan applications
 */
router.get('/get-pending-requests', getPendingRequestsController);

/**
 * Generic admin requests listing with filters
 * GET /admin/requests?status=...&district=...&limit=&offset=
 */
router.get('/requests', getRequestsController);


export default router;

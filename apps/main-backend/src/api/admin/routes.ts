import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth, requireAdmin } from '../auth';
import {
  getAllServicesController,
  enableServiceController,
  disableServiceController,
  disconnectServiceController,
  configureServiceController,
  getActiveLoansController,
  getPendingRequestsController
} from './controllers';

const router: ExpressRouter = Router();

/**
 * GET /admin/services
 * Get all service configurations (auto-create if missing)
 */
router.get('/services', requireAuth, getAllServicesController);

/**
 * POST /admin/service/:serviceName/enable
 * Enable a service
 */
router.post('/service/:serviceName/enable', requireAuth, enableServiceController);

/**
 * POST /admin/service/:serviceName/disable
 * Disable a service
 */
router.post('/service/:serviceName/disable', requireAuth, disableServiceController);

/**
 * POST /admin/service/:serviceName/disconnect
 * Disconnect and cleanup a service
 */
router.post('/service/:serviceName/disconnect', requireAuth, disconnectServiceController);

/**
 * POST /admin/service/:serviceName/configure
 * Update service configuration (e.g., email SMTP settings)
 */
router.post('/service/:serviceName/configure', requireAuth, configureServiceController);

/** GET /admin/getActiveLoans
 * Get all active loans
 */
router.get('/getactiveloans', requireAuth, requireAdmin, getActiveLoansController);


/**
 * GET /admin/getPendingRequests
 * Get all pending loan applications
 */
router.get('/getPendingRequests', requireAuth, requireAdmin, getPendingRequestsController);

export default router;

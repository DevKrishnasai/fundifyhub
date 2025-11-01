import { Router, type Router as ExpressRouter } from 'express';
import {
  getAllServicesController,
  enableServiceController,
  disableServiceController,
  disconnectServiceController,
  configureServiceController,
} from './controllers';
import { requireAuth } from '../../auth';

const router: ExpressRouter = Router();



/**
 * GET /admin/services
 * Get all service configurations (auto-create if missing)
 */
router.get('/', requireAuth, getAllServicesController);

/**
 * POST /admin/service/:serviceName/enable
 * Enable a service
 */
router.post('/:serviceName/enable', requireAuth, enableServiceController);

/**
 * POST /admin/:serviceName/disable
 * Disable a service
 */
router.post('/:serviceName/disable', requireAuth, disableServiceController);

/**
 * POST /admin/:serviceName/disconnect
 * Disconnect and cleanup a service
 */
router.post('/:serviceName/disconnect', requireAuth, disconnectServiceController);

/**
 * POST /admin/:serviceName/configure
 * Update service configuration (e.g., email SMTP settings)
 */
router.post('/:serviceName/configure', requireAuth, configureServiceController);

export default router;
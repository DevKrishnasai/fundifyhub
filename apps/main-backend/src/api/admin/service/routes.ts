import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth, requireRole } from '../../auth';
const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');
import {
  getAllServicesController,
  enableServiceController,
  disableServiceController,
  disconnectServiceController,
  configureServiceController,
} from './controllers';

const router: ExpressRouter = Router();

/**
 * GET /admin/service
 * Get all service configurations (auto-create if missing)
 */
router.get('/', requireAuth, requireAdmin, getAllServicesController);

/**
 * POST /admin/service/:serviceName/enable
 * Enable a service
 */
router.post('/:serviceName/enable', requireAuth, requireAdmin, enableServiceController);

/**
 * POST /admin/service/:serviceName/disable
 * Disable a service
 */
router.post('/:serviceName/disable', requireAuth, requireAdmin, disableServiceController);

/**
 * POST /admin/service/:serviceName/disconnect
 * Disconnect and cleanup a service
 */
router.post('/:serviceName/disconnect', requireAuth, requireAdmin, disconnectServiceController);

/**
 * POST /admin/service/:serviceName/configure
 * Update service configuration (e.g., email SMTP settings)
 */
router.post('/:serviceName/configure', requireAuth, requireAdmin, configureServiceController);

export default router;

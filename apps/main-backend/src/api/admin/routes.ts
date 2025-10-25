import { Router, type Router as ExpressRouter } from 'express';
import { requireAuth, requireAdmin } from '../auth';
import {
  getAllConfigController,
  getConfigController,
  updateConfigController,
  testConfigController,
  initializeConfigController,
} from './controllers';

const router: ExpressRouter = Router();

/**
 * GET /admin/config
 * Get all service configurations
 */
router.get('/config', requireAuth, requireAdmin, getAllConfigController);

/**
 * GET /admin/config/:serviceName
 * Get specific service configuration
 */
router.get('/config/:serviceName', requireAuth, requireAdmin, getConfigController);

/**
 * POST /admin/config/:serviceName
 * Update service configuration (enable/disable)
 */
router.post('/config/:serviceName', requireAuth, requireAdmin, updateConfigController);

/**
 * POST /admin/config/:serviceName/test
 * Test a service configuration (SMTP validation or WhatsApp test)
 */
router.post('/config/:serviceName/test', requireAuth, requireAdmin, testConfigController);

/**
 * POST /admin/init
 * Initialize default service configurations
 */
router.post('/init', requireAuth, requireAdmin, initializeConfigController);

export default router;

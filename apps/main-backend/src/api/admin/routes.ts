import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import serviceRoutes from './service/routes';
import usersRoutes from './users/routes';

const router: ExpressRouter = Router();

// Admin service routes (related to service management)
router.use('/service', serviceRoutes);

router.use('/users', usersRoutes);
// Admin user management routes


export default router;
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
// import serviceRoutes from './service/routes';
import adminRoutes from './admin/routes';
import authRoutes from './auth/routes';
import userRoutes from './user/routes';

const router: ExpressRouter = Router();

// router.use('/service', serviceRoutes); //TODO: Need to clean up and add other service routes
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/user', userRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;
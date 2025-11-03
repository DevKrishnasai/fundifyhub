import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { requireAuth } from './auth';
import adminRoutes from './admin/routes';
import authRoutes from './auth/routes';
import userRoutes from './user/routes';

const router: ExpressRouter = Router();

router.use('/auth', authRoutes);
router.use('/admin', requireAuth, adminRoutes);
router.use('/user', requireAuth, userRoutes);

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
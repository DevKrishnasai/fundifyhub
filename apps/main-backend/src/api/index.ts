import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import adminRoutes from './admin/routes';
import authRoutes from './auth/routes';
import userRoutes from './user/routes';
import documentsRoutes from './documents/routes';
import requestsRoutes from './requests/routes';
import paymentsRoutes from './payments/routes';
import { authMiddleware } from '../utils/jwt';

const router: ExpressRouter = Router();

router.use('/auth', authRoutes);
router.use('/admin', authMiddleware, adminRoutes);
router.use('/user', authMiddleware, userRoutes);
router.use('/documents', authMiddleware, documentsRoutes);
router.use('/requests', authMiddleware, requestsRoutes);
router.use('/payments', paymentsRoutes);

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
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import adminRoutes from './admin/routes';
import authRoutes from './auth/routes';
import userRoutes from './user/routes';
import documentsRoutes from './documents/routes';
import requestsRoutes from './requests/routes';
import paymentsRoutes from './payments/routes';
import notificationsRoutes from './notifications/routes';
import geographyRoutes from './geography/routes';
import assetRoutes from './assets/routes';
import auctionRoutes from './auctions/routes';
import healthRoutes from './health/routes';
import { authMiddleware } from '../utils/jwt';

const router: ExpressRouter = Router();

router.use('/auth', authRoutes);
router.use('/admin', authMiddleware, adminRoutes);
router.use('/user', authMiddleware, userRoutes);
router.use('/documents', authMiddleware, documentsRoutes);
router.use('/requests', authMiddleware, requestsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', authMiddleware, notificationsRoutes);
router.use('/geography', authMiddleware, geographyRoutes);
router.use('/assets', assetRoutes);
router.use('/auctions', auctionRoutes);
router.use('/health', healthRoutes);

export default router;
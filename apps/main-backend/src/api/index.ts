/**
 * Main API Routes
 * Consolidated router for all API endpoints
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';

// Import routes from new structure
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import documentsRoutes from './routes/documents.routes';
import requestsRoutes from './routes/requests.routes';
import paymentsRoutes from './routes/payments.routes';
import notificationsRoutes from './routes/notifications.routes';
import geographyRoutes from './routes/geography.routes';
import assetRoutes from './routes/assets.routes';
import auctionRoutes from './routes/auctions.routes';
import healthRoutes from './routes/health.routes';

// Import middleware
import { authMiddleware } from '../utils/jwt';

const router: ExpressRouter = Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

// Protected routes (require authentication)
router.use('/admin', authMiddleware, adminRoutes);
router.use('/user', authMiddleware, userRoutes);
router.use('/documents', authMiddleware, documentsRoutes);
router.use('/requests', authMiddleware, requestsRoutes);
router.use('/payments', paymentsRoutes); // Has mixed auth (webhooks are public)
router.use('/notifications', authMiddleware, notificationsRoutes);
router.use('/geography', authMiddleware, geographyRoutes);
router.use('/assets', assetRoutes); // Has mixed auth
router.use('/auctions', auctionRoutes); // Has mixed auth

export default router;
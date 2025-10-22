import { Router } from 'express';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import adminServicesRoutes from './routes/admin-services';

const router: Router = Router();

// Mount auth routes (login, register, logout - no protection needed)
router.use('/auth', authRoutes);

// Mount user routes (protected endpoints)
router.use('/user', userRoutes);

// Mount admin routes
router.use('/admin/services', adminServicesRoutes);

export default router;
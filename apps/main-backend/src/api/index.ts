import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import v1Routes from './v1';

const router: ExpressRouter = Router();

// Mount v1 routes
router.use('/v1', v1Routes);

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
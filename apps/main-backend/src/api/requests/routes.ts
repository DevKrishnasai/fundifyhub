import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { getRequestDetailController, assignAgentController, updateRequestStatusController, createOfferController, offerPreviewController, confirmOfferController, getAvailableAgentsController } from './controllers';

const router: ExpressRouter = Router();

// GET /requests/agents/:district - Get available agents for a district (must be before /:id routes)
router.get('/agents/:district', getAvailableAgentsController);

// GET /requests/:id
router.get('/:id', getRequestDetailController);

// POST /requests/:id/assign
router.post('/:id/assign', assignAgentController);

// POST /requests/:id/status
router.post('/:id/status', updateRequestStatusController);

// POST /requests/:id/offer
router.post('/:id/offer', createOfferController);

// GET /requests/:id/offer-preview
router.get('/:id/offer-preview', offerPreviewController);

// POST /requests/:id/offers/:offerId/confirm
router.post('/:id/offers/:offerId/confirm', confirmOfferController);

export default router;

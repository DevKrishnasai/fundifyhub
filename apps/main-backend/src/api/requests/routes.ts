import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { getRequestDetailController, assignAgentController, updateRequestStatusController, createOfferController, offerPreviewController, confirmOfferController, getAvailableAgentsController, generateAgreementController, uploadSignedAgreementController, updateBankDetailsController, createLoanController } from './controllers';

const router: ExpressRouter = Router();

// GET /requests/agents/:district - Get available agents for a district (must be before /:id routes)
router.get('/agents/:district', getAvailableAgentsController);

// GET /requests/:id
router.get('/:id', getRequestDetailController);

// GET /requests/:id/generate-agreement - Generate loan agreement PDF
router.get('/:id/generate-agreement', generateAgreementController);

// POST /requests/:id/upload-signed-agreement - Upload signed agreement PDF
router.post('/:id/upload-signed-agreement', uploadSignedAgreementController);

// POST /requests/:id/bank-details - Update bank details
router.post('/:id/bank-details', updateBankDetailsController);

// POST /requests/:id/create-loan - Create Loan and EMI Schedule
router.post('/:id/create-loan', createLoanController);

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

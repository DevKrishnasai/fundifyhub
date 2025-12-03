import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { 
  // CRUD
  getRequestDetailController, 
  
  // Assignment
  assignAgentController, 
  selfAssignAdminController, 
  assignAdminController, 
  getAvailableAdminsController,
  getAvailableAgentsController, 
  
  // Workflow
  updateRequestStatusController, 
  
  // Offer
  createOfferController, 
  getCurrentOfferController, 
  offerPreviewController, 
  confirmOfferController, 
  
  // Loan
  createLoanController,
  
  // Agreement
  generateAgreementController, 
  signAgreementController, 
  uploadSignedAgreementController, 
  
  // Inspection
  completeInspectionController,
  
  // Bank
  updateBankDetailsController, 
  
  // Agent
  getAgentAssignedRequestsController, 
  
  // Comments
  updateCommentsEnabledController, 
  addCommentController, 
  
  // Documents
  addDocumentController,
} from './controllers/index';

const router: ExpressRouter = Router();

// GET /requests/agents/:district - Get available agents for a district (must be before /:id routes)
router.get('/agents/:district', getAvailableAgentsController);

// GET /requests/admins/:district - Get available district admins for a district (must be before /:id routes)
router.get('/admins/:district', getAvailableAdminsController);

// GET /requests/assigned - Get requests assigned to the logged-in agent (must be before /:id routes)
router.get('/assigned', getAgentAssignedRequestsController);

// GET /requests/:id
router.get('/:id', getRequestDetailController);

// GET /requests/:id/generate-agreement - Generate loan agreement PDF
router.get('/:id/generate-agreement', generateAgreementController);

// POST /requests/:id/sign-agreement - Digitally sign agreement with customer signature
router.post('/:id/sign-agreement', signAgreementController);

// POST /requests/:id/upload-signed-agreement - Upload signed agreement PDF
router.post('/:id/upload-signed-agreement', uploadSignedAgreementController);

// POST /requests/:id/bank-details - Update bank details
router.post('/:id/bank-details', updateBankDetailsController);

// POST /requests/:id/create-loan - Create Loan and EMI Schedule
router.post('/:id/create-loan', createLoanController);

// POST /requests/:id/assign
router.post('/:id/assign', assignAgentController);

// POST /requests/:id/self-assign - Admin self-assigns to handle the request
router.post('/:id/self-assign', selfAssignAdminController);

// POST /requests/:id/assign-admin - Super admin assigns a district admin to handle the request
router.post('/:id/assign-admin', assignAdminController);

// POST /requests/:id/status
router.post('/:id/status', updateRequestStatusController);

// POST /requests/:id/comments-enabled - toggle whether customers can comment after rejection (admin only)
router.post('/:id/comments-enabled', updateCommentsEnabledController);

// POST /requests/:id/comments - Add a comment
router.post('/:id/comments', addCommentController);

// POST /requests/:id/documents - Add a document
router.post('/:id/documents', addDocumentController);

// POST /requests/:id/offer
router.post('/:id/offer', createOfferController);

// GET /requests/:id/current-offer
router.get('/:id/current-offer', getCurrentOfferController);

// GET /requests/:id/offer-preview
router.get('/:id/offer-preview', offerPreviewController);

// POST /requests/:id/offers/:offerId/confirm
router.post('/:id/offers/:offerId/confirm', confirmOfferController);

// POST /requests/:id/inspections/complete - finalize inspection and persist history
router.post('/:id/inspections/complete', completeInspectionController);

export default router;

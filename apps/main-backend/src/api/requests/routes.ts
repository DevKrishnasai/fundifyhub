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

/**
 * @openapi
 * /api/v1/requests/agents/{district}:
 *   get:
 *     tags:
 *       - Requests
 *     summary: Get available agents for assignment
 *     description: Returns list of agents available for inspection assignment in a district
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: district
 *         required: true
 *         schema:
 *           type: string
 *         description: District name to find agents
 *     responses:
 *       200:
 *         description: List of available agents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/agents/:district', getAvailableAgentsController);

/**
 * @openapi
 * /api/v1/requests/admins/{district}:
 *   get:
 *     tags:
 *       - Requests
 *     summary: Get available district admins
 *     description: Returns list of district admins for request assignment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: district
 *         required: true
 *         schema:
 *           type: string
 *         description: District name to find admins
 *     responses:
 *       200:
 *         description: List of available admins
 *       401:
 *         description: Unauthorized
 */
router.get('/admins/:district', getAvailableAdminsController);

/**
 * @openapi
 * /api/v1/requests/assigned:
 *   get:
 *     tags:
 *       - Requests
 *     summary: Get agent's assigned requests
 *     description: Returns list of requests assigned to the logged-in agent for inspection
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Request'
 *       401:
 *         description: Unauthorized
 */
router.get('/assigned', getAgentAssignedRequestsController);

/**
 * @openapi
 * /api/v1/requests/{id}:
 *   get:
 *     tags:
 *       - Requests
 *     summary: Get request details
 *     description: Returns full request details including customer, asset, loan, documents, and history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Request ID
 *     responses:
 *       200:
 *         description: Request details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     request:
 *                       $ref: '#/components/schemas/Request'
 *       404:
 *         description: Request not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', getRequestDetailController);

/**
 * @openapi
 * /api/v1/requests/{id}/generate-agreement:
 *   get:
 *     tags:
 *       - Requests
 *     summary: Generate loan agreement PDF
 *     description: Generates a loan agreement PDF document for the request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agreement generated
 *       400:
 *         description: Cannot generate agreement at current stage
 */
router.get('/:id/generate-agreement', generateAgreementController);

/**
 * @openapi
 * /api/v1/requests/{id}/sign-agreement:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Sign loan agreement
 *     description: Customer digitally signs the loan agreement with a signature image
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signature
 *             properties:
 *               signature:
 *                 type: string
 *                 description: Base64 encoded signature image
 *     responses:
 *       200:
 *         description: Agreement signed successfully
 *       400:
 *         description: Invalid signature or stage
 */
router.post('/:id/sign-agreement', signAgreementController);

/**
 * @openapi
 * /api/v1/requests/{id}/upload-signed-agreement:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Upload signed agreement
 *     description: Upload a signed agreement PDF
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Agreement uploaded
 */
router.post('/:id/upload-signed-agreement', uploadSignedAgreementController);

/**
 * @openapi
 * /api/v1/requests/{id}/bank-details:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Update bank details
 *     description: Customer submits bank details for loan disbursement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountNumber:
 *                 type: string
 *               ifscCode:
 *                 type: string
 *               accountHolderName:
 *                 type: string
 *               upiId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bank details updated
 *       400:
 *         description: Invalid bank details
 */
router.post('/:id/bank-details', updateBankDetailsController);

/**
 * @openapi
 * /api/v1/requests/{id}/create-loan:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Create loan and EMI schedule
 *     description: Admin creates a loan with EMI schedule after disbursement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Loan created with EMI schedule
 *       400:
 *         description: Cannot create loan at current stage
 */
router.post('/:id/create-loan', createLoanController);

/**
 * @openapi
 * /api/v1/requests/{id}/assign:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Assign agent to request
 *     description: Admin assigns an agent for inspection
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *             properties:
 *               agentId:
 *                 type: string
 *               inspectionDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Agent assigned
 *       400:
 *         description: Invalid agent or stage
 */
router.post('/:id/assign', assignAgentController);

/**
 * @openapi
 * /api/v1/requests/{id}/self-assign:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Self-assign as admin
 *     description: District admin self-assigns to handle the request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Self-assigned successfully
 */
router.post('/:id/self-assign', selfAssignAdminController);

/**
 * @openapi
 * /api/v1/requests/{id}/assign-admin:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Assign district admin
 *     description: Super admin assigns a district admin to handle the request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminId
 *             properties:
 *               adminId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin assigned
 */
router.post('/:id/assign-admin', assignAdminController);

/**
 * @openapi
 * /api/v1/requests/{id}/status:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Update request status
 *     description: Transition request to a new workflow status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *             properties:
 *               event:
 *                 type: string
 *                 description: Workflow event to trigger
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid transition
 */
router.post('/:id/status', updateRequestStatusController);

/**
 * @openapi
 * /api/v1/requests/{id}/comments-enabled:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Toggle comments
 *     description: Admin toggles whether customers can comment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Comments setting updated
 */
router.post('/:id/comments-enabled', updateCommentsEnabledController);

/**
 * @openapi
 * /api/v1/requests/{id}/comments:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Add comment
 *     description: Add a comment to the request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               isInternal:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Comment added
 */
router.post('/:id/comments', addCommentController);

/**
 * @openapi
 * /api/v1/requests/{id}/documents:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Add document
 *     description: Upload a document to the request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileKey
 *               - fileName
 *               - fileType
 *               - category
 *             properties:
 *               fileKey:
 *                 type: string
 *               fileName:
 *                 type: string
 *               fileType:
 *                 type: string
 *               fileSize:
 *                 type: number
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document added
 */
router.post('/:id/documents', addDocumentController);

/**
 * @openapi
 * /api/v1/requests/{id}/offer:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Create offer
 *     description: Admin creates a loan offer for the customer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - offeredAmount
 *               - tenureMonths
 *               - interestRate
 *             properties:
 *               offeredAmount:
 *                 type: number
 *               tenureMonths:
 *                 type: number
 *               interestRate:
 *                 type: number
 *               processingFee:
 *                 type: number
 *     responses:
 *       200:
 *         description: Offer created
 */
router.post('/:id/offer', createOfferController);

/**
 * @openapi
 * /api/v1/requests/{id}/current-offer:
 *   get:
 *     tags:
 *       - Requests
 *     summary: Get current offer
 *     description: Returns the current offer for the request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current offer
 */
router.get('/:id/current-offer', getCurrentOfferController);

/**
 * @openapi
 * /api/v1/requests/{id}/offer-preview:
 *   get:
 *     tags:
 *       - Requests
 *     summary: Preview EMI schedule
 *     description: Preview EMI schedule for an offer before accepting
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *       - in: query
 *         name: tenure
 *         schema:
 *           type: number
 *       - in: query
 *         name: interestRate
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: EMI preview
 */
router.get('/:id/offer-preview', offerPreviewController);

/**
 * @openapi
 * /api/v1/requests/{id}/offers/{offerId}/confirm:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Confirm offer
 *     description: Customer accepts or rejects the offer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accepted
 *             properties:
 *               accepted:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Offer confirmed
 */
router.post('/:id/offers/:offerId/confirm', confirmOfferController);

/**
 * @openapi
 * /api/v1/requests/{id}/inspections/complete:
 *   post:
 *     tags:
 *       - Requests
 *     summary: Complete inspection
 *     description: Agent completes the inspection with photos and notes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fileKey:
 *                       type: string
 *     responses:
 *       200:
 *         description: Inspection completed
 */
router.post('/:id/inspections/complete', completeInspectionController);

export default router;

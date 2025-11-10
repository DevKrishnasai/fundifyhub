import { Router, type Router as ExpressRouter } from 'express';
import { getProfileController, validateController, addAssetController, updateAssetController, activeLoansCountController, pendingLoansCountController, totalBorrowController, getUserRequestsController, getUserRequestController, postCommentController } from './controllers';

const router: ExpressRouter = Router();

/**
 * GET /user/profile
 * Get current user profile (protected)
 */
router.get('/profile', getProfileController);

/**
 * GET /user/validate
 * Validate authentication status (protected)
 */
router.get('/validate', validateController);

/**
 * POST /user/add-asset
 * Create a new asset request with inline asset details (protected)
 */
router.post('/add-asset', addAssetController);

/**
 * PUT /user/update-asset
 * Update an existing asset request (protected)
 */
router.put('/update-asset', updateAssetController);

/**
 * GET /user/active-loans-count
 * Returns number of currently active loans (protected)
 */
router.get('/active-loans-count', activeLoansCountController);

/**
 * GET /user/pending-loans-count
 * Returns number of loans currently in PENDING status (protected)
 */
router.get('/pending-loans-count', pendingLoansCountController);

/**
 * GET /user/requests
 * Paginated list of requests for the authenticated user
 */
router.get('/requests', getUserRequestsController);

/**
 * GET /user/request/:identifier
 * Fetch a single request by DB id or human-friendly requestNumber (REQxxxx)
 */
router.get('/request/:identifier', getUserRequestController);

/**
 * POST /user/request/:identifier/comment
 * Add a comment to a request
 */
router.post('/request/:identifier/comment', postCommentController);

// Note: only the active loans count endpoint is exposed here per request

/**
 * GET /user/total-borrow
 * Returns total borrowed and outstanding amounts (protected)
 */
router.get('/total-borrow', totalBorrowController);


export default router;

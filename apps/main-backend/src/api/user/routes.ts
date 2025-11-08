import { Router, type Router as ExpressRouter } from 'express';
import { getProfileController, validateController, debugAuthController, addAssetController, updateAssetController, activeLoansCountController, pendingLoansCountController, totalBorrowController } from './controllers';

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
 * GET /user/debug-auth
 * Debug authentication - shows token data vs database data (development only)
 */
router.get('/debug-auth', debugAuthController);

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

// Note: only the active loans count endpoint is exposed here per request

/**
 * GET /user/total-borrow
 * Returns total borrowed and outstanding amounts (protected)
 */
router.get('/total-borrow', totalBorrowController);


export default router;

/**
 * User Routes
 *
 * Endpoints for user profile management, sessions, and user-specific operations
 */

import { Router, type Router as ExpressRouter } from 'express';
import {
  getProfileController,
  validateController,
  addAssetController,
  updateAssetController,
  activeLoansCountController,
  pendingLoansCountController,
  totalBorrowController,
  getUserRequestsController,
  getUserRequestController,
  postCommentController,
  getDashboardStatsController,
  updateProfileController,
} from '../controllers/user.controller';
import {
  getSessionsController,
  revokeSessionController,
  revokeAllSessionsController,
} from '../controllers/user-sessions.controller';

const router: ExpressRouter = Router();

/**
 * @openapi
 * /user/profile:
 *   get:
 *     tags:
 *       - User
 *     summary: Get user profile
 *     description: Get current authenticated user's profile
 *     responses:
 *       200:
 *         description: User profile data
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
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                     districts:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Not authenticated
 */
router.get('/profile', getProfileController);

/**
 * @openapi
 * /user/profile:
 *   put:
 *     tags:
 *       - User
 *     summary: Update user profile
 *     description: Update current authenticated user's profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.put('/profile', updateProfileController);

/**
 * @openapi
 * /user/validate:
 *   get:
 *     tags:
 *       - User
 *     summary: Validate authentication
 *     description: Validate current authentication status and get user info
 *     responses:
 *       200:
 *         description: Authentication is valid
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
 *                     user:
 *                       type: object
 *                     isValid:
 *                       type: boolean
 *       401:
 *         description: Not authenticated
 */
router.get('/validate', validateController);

// ============================================
// SESSION MANAGEMENT ROUTES
// ============================================

/**
 * @openapi
 * /user/sessions:
 *   get:
 *     tags:
 *       - User
 *     summary: Get active sessions
 *     description: Get all active sessions for the current user
 *     responses:
 *       200:
 *         description: List of active sessions
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       deviceInfo:
 *                         type: string
 *                       ipAddress:
 *                         type: string
 *                       lastActive:
 *                         type: string
 *                         format: date-time
 *                       isCurrent:
 *                         type: boolean
 *       401:
 *         description: Not authenticated
 */
router.get('/sessions', getSessionsController);

/**
 * @openapi
 * /user/sessions:
 *   delete:
 *     tags:
 *       - User
 *     summary: Revoke all sessions
 *     description: Revoke all sessions except the current one (logout everywhere)
 *     responses:
 *       200:
 *         description: All other sessions revoked
 *       401:
 *         description: Not authenticated
 */
router.delete('/sessions', revokeAllSessionsController);

/**
 * @openapi
 * /user/sessions/{id}:
 *   delete:
 *     tags:
 *       - User
 *     summary: Revoke specific session
 *     description: Revoke a specific session by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Session not found
 */
router.delete('/sessions/:id', revokeSessionController);

// ============================================
// ASSET/REQUEST ROUTES
// ============================================

/**
 * @openapi
 * /user/add-asset:
 *   post:
 *     tags:
 *       - User
 *     summary: Create asset request
 *     description: Create a new loan request with asset details
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetType:
 *                 type: string
 *               assetDescription:
 *                 type: string
 *               estimatedValue:
 *                 type: number
 *               requestedAmount:
 *                 type: number
 *               districtId:
 *                 type: string
 *             required:
 *               - assetType
 *               - estimatedValue
 *               - requestedAmount
 *               - districtId
 *     responses:
 *       201:
 *         description: Asset request created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.post('/add-asset', addAssetController);

/**
 * @openapi
 * /user/update-asset:
 *   put:
 *     tags:
 *       - User
 *     summary: Update asset request
 *     description: Update an existing asset request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestId:
 *                 type: string
 *               assetType:
 *                 type: string
 *               assetDescription:
 *                 type: string
 *               estimatedValue:
 *                 type: number
 *               requestedAmount:
 *                 type: number
 *             required:
 *               - requestId
 *     responses:
 *       200:
 *         description: Asset request updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Request not found
 */
router.put('/update-asset', updateAssetController);

/**
 * @openapi
 * /user/active-loans-count:
 *   get:
 *     tags:
 *       - User
 *     summary: Get active loans count
 *     description: Returns number of currently active loans for the user
 *     responses:
 *       200:
 *         description: Active loans count
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
 *                     count:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 */
router.get('/active-loans-count', activeLoansCountController);

/**
 * @openapi
 * /user/pending-loans-count:
 *   get:
 *     tags:
 *       - User
 *     summary: Get pending loans count
 *     description: Returns number of loans in pending status for the user
 *     responses:
 *       200:
 *         description: Pending loans count
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
 *                     count:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 */
router.get('/pending-loans-count', pendingLoansCountController);

/**
 * @openapi
 * /user/requests:
 *   get:
 *     tags:
 *       - User
 *     summary: Get user requests
 *     description: Paginated list of loan requests for the authenticated user
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user requests
 *       401:
 *         description: Not authenticated
 */
router.get('/requests', getUserRequestsController);

/**
 * @openapi
 * /user/request/{identifier}:
 *   get:
 *     tags:
 *       - User
 *     summary: Get single request
 *     description: Fetch a single request by ID or request number (REQxxxx)
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID (UUID) or request number (REQxxxx)
 *     responses:
 *       200:
 *         description: Request details
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Request not found
 */
router.get('/request/:identifier', getUserRequestController);

/**
 * @openapi
 * /user/request/{identifier}/comment:
 *   post:
 *     tags:
 *       - User
 *     summary: Add comment to request
 *     description: Add a comment to a loan request
 *     parameters:
 *       - in: path
 *         name: identifier
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
 *               content:
 *                 type: string
 *             required:
 *               - content
 *     responses:
 *       201:
 *         description: Comment added
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Request not found
 */
router.post('/request/:identifier/comment', postCommentController);

/**
 * @openapi
 * /user/total-borrow:
 *   get:
 *     tags:
 *       - User
 *     summary: Get total borrowed amount
 *     description: Returns total borrowed and outstanding amounts for the user
 *     responses:
 *       200:
 *         description: Borrow statistics
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
 *                     totalBorrowed:
 *                       type: number
 *                     totalOutstanding:
 *                       type: number
 *                     totalPaid:
 *                       type: number
 *       401:
 *         description: Not authenticated
 */
router.get('/total-borrow', totalBorrowController);

/**
 * @openapi
 * /user/dashboard-stats:
 *   get:
 *     tags:
 *       - User
 *     summary: Get dashboard statistics
 *     description: Returns dashboard statistics based on user role
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Statistics vary by user role
 *       401:
 *         description: Not authenticated
 */
router.get('/dashboard-stats', getDashboardStatsController);

export default router;

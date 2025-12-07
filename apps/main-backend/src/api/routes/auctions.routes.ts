/**
 * Auction API Routes
 * Provides endpoints for auction listings, bidding, and lifecycle management
 *
 * @openapi
 * tags:
 *   - name: Auctions
 *     description: Auction listings, bidding, and lifecycle management
 */

import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import { authMiddleware } from '../middlewares/auth.middleware'
import {
  listAuctions,
  getActiveAuctions,
  getAuctionById,
  createAuction,
  placeBid,
  buyNow,
  cancelAuction,
  getAuctionBids,
  getMyBids,
  endExpiredAuctions,
} from '../controllers/auctions.controller'

const router: ExpressRouter = Router()

// ============================================================================
// Public Routes (no auth required for viewing active auctions)
// ============================================================================

/**
 * @openapi
 * /api/v1/auctions/active:
 *   get:
 *     summary: Get currently active auctions (public)
 *     tags: [Auctions]
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
 *     responses:
 *       200:
 *         description: List of active auctions
 */
router.get('/active', getActiveAuctions)

// ============================================================================
// Protected Routes
// ============================================================================

// Apply auth middleware to all routes below
router.use(authMiddleware)

/**
 * @openapi
 * /api/v1/auctions:
 *   get:
 *     summary: List all auctions (admin view with all statuses)
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, ACTIVE, ENDED, CANCELLED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of auctions
 *       401:
 *         description: Unauthorized
 */
router.get('/', listAuctions)

/**
 * @openapi
 * /api/v1/auctions/my-bids:
 *   get:
 *     summary: Get current user's bid history
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's bids
 *       401:
 *         description: Unauthorized
 */
router.get('/my-bids', getMyBids)

/**
 * @openapi
 * /api/v1/auctions/end-expired:
 *   post:
 *     summary: End expired auctions (called by cron job)
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired auctions ended
 *       401:
 *         description: Unauthorized
 */
router.post('/end-expired', endExpiredAuctions)

/**
 * @openapi
 * /api/v1/auctions/{id}:
 *   get:
 *     summary: Get auction by ID
 *     tags: [Auctions]
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
 *         description: Auction details with bids
 *       404:
 *         description: Auction not found
 */
router.get('/:id', getAuctionById)

/**
 * @openapi
 * /api/v1/auctions:
 *   post:
 *     summary: Create a new auction (Admin only)
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetId, startingBid, startDate, endDate]
 *             properties:
 *               assetId:
 *                 type: string
 *               startingBid:
 *                 type: number
 *               reservePrice:
 *                 type: number
 *               buyNowPrice:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Auction created successfully
 *       403:
 *         description: Forbidden - Admin only
 */
router.post('/', createAuction)

/**
 * @openapi
 * /api/v1/auctions/{id}/bids:
 *   get:
 *     summary: Get bid history for an auction
 *     tags: [Auctions]
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
 *         description: List of bids for the auction
 *       404:
 *         description: Auction not found
 */
router.get('/:id/bids', getAuctionBids)

/**
 * @openapi
 * /api/v1/auctions/{id}/bid:
 *   post:
 *     summary: Place a bid on an auction
 *     tags: [Auctions]
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
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bid placed successfully
 *       400:
 *         description: Invalid bid (too low, auction ended, etc.)
 *       404:
 *         description: Auction not found
 */
router.post('/:id/bid', placeBid)

/**
 * @openapi
 * /api/v1/auctions/{id}/buy-now:
 *   post:
 *     summary: Buy Now (instant purchase at buy-now price)
 *     tags: [Auctions]
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
 *         description: Item purchased successfully
 *       400:
 *         description: Buy now not available
 *       404:
 *         description: Auction not found
 */
router.post('/:id/buy-now', buyNow)

/**
 * @openapi
 * /api/v1/auctions/{id}/cancel:
 *   put:
 *     summary: Cancel an auction (Admin only)
 *     tags: [Auctions]
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
 *         description: Auction cancelled successfully
 *       400:
 *         description: Cannot cancel auction with bids
 *       403:
 *         description: Forbidden - Admin only
 */
router.put('/:id/cancel', cancelAuction)

export default router

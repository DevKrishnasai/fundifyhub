/**
 * Auction API Routes
 * Provides endpoints for auction listings, bidding, and lifecycle management
 */

import { Router } from 'express'
import type { Router as ExpressRouter } from 'express'
import { authMiddleware } from '../../utils/jwt'
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
} from './controllers'

const router: ExpressRouter = Router()

// ============================================================================
// Public Routes (no auth required for viewing active auctions)
// ============================================================================

// GET /auctions/active - Get currently active auctions (public)
router.get('/active', getActiveAuctions)

// ============================================================================
// Protected Routes
// ============================================================================

// Apply auth middleware to all routes below
router.use(authMiddleware)

// GET /auctions - List all auctions (admin view with all statuses)
router.get('/', listAuctions)

// GET /auctions/my-bids - Get current user's bid history
router.get('/my-bids', getMyBids)

// POST /auctions/end-expired - End expired auctions (called by cron job)
router.post('/end-expired', endExpiredAuctions)

// GET /auctions/:id - Get auction by ID
router.get('/:id', getAuctionById)

// POST /auctions - Create a new auction (Admin only)
router.post('/', createAuction)

// GET /auctions/:id/bids - Get bid history for an auction
router.get('/:id/bids', getAuctionBids)

// POST /auctions/:id/bid - Place a bid
router.post('/:id/bid', placeBid)

// POST /auctions/:id/buy-now - Buy Now (instant purchase)
router.post('/:id/buy-now', buyNow)

// PUT /auctions/:id/cancel - Cancel an auction (Admin only)
router.put('/:id/cancel', cancelAuction)

export default router

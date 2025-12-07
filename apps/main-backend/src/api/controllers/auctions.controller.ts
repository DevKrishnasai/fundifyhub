/**
 * Auction Controllers
 * Handles auction listing, bidding, and lifecycle management
 */

import type { Request, Response } from 'express'
import { prisma } from '@fundifyhub/prisma'
import { ROLES, AUCTION_STATUS, BID_STATUS, ASSET_STATUS } from '@fundifyhub/types'
import logger from '../../utils/logger'
import { getIO } from '../../realtime/socket-server'

// ============================================================================
// Helper: Generate Auction Number
// ============================================================================
async function generateAuctionNumber(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2)
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0')

  // Get count of auctions this month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const count = await prisma.auctionListing.count({
    where: {
      createdAt: { gte: startOfMonth },
    },
  })

  const sequence = (count + 1).toString().padStart(4, '0')
  return `AUC${year}${month}${sequence}`
}

// ============================================================================
// GET /auctions - List all auctions with filters
// ============================================================================
export async function listAuctions(req: Request, res: Response): Promise<void> {
  try {
    const {
      status,
      search,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: Record<string, unknown> = {
      deletedAt: null,
    }

    if (status) {
      where.status = status as string
    }

    if (search) {
      where.OR = [
        { listingNumber: { contains: search as string, mode: 'insensitive' } },
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const [auctions, total] = await Promise.all([
      prisma.auctionListing.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        include: {
          asset: {
            select: {
              id: true,
              assetType: true,
              brand: true,
              model: true,
              condition: true,
              currentMarketValue: true,
              warehouse: {
                select: { id: true, name: true, district: { select: { name: true } } },
              },
            },
          },
          winner: {
            select: { id: true, firstName: true, lastName: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { bids: true },
          },
        },
      }),
      prisma.auctionListing.count({ where }),
    ])

    res.status(200).json({
      success: true,
      message: 'Auctions retrieved successfully',
      data: {
        auctions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    logger.error('Error listing auctions:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to list auctions',
    })
  }
}

// ============================================================================
// GET /auctions/active - Get currently active auctions (for public/bidding)
// ============================================================================
export async function getActiveAuctions(req: Request, res: Response): Promise<void> {
  try {
    const {
      search,
      page = '1',
      limit = '20',
    } = req.query

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const now = new Date()
    const where: Record<string, unknown> = {
      deletedAt: null,
      status: { in: [AUCTION_STATUS.ACTIVE, AUCTION_STATUS.EXTENDED] },
      startTime: { lte: now },
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const [auctions, total] = await Promise.all([
      prisma.auctionListing.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { endTime: 'asc' }, // Show ending soonest first
        include: {
          asset: {
            select: {
              id: true,
              assetType: true,
              brand: true,
              model: true,
              condition: true,
              currentMarketValue: true,
            },
          },
          _count: {
            select: { bids: true },
          },
        },
      }),
      prisma.auctionListing.count({ where }),
    ])

    res.status(200).json({
      success: true,
      message: 'Active auctions retrieved successfully',
      data: {
        auctions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    logger.error('Error fetching active auctions:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active auctions',
    })
  }
}

// ============================================================================
// GET /auctions/:id - Get auction by ID
// ============================================================================
export async function getAuctionById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const auction = await prisma.auctionListing.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            request: {
              select: {
                id: true,
                requestNumber: true,
                customer: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
                address: true,
                district: { select: { name: true } },
              },
            },
          },
        },
        winner: {
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        bids: {
          orderBy: { amount: 'desc' },
          take: 10, // Top 10 bids
          include: {
            bidder: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: { bids: true },
        },
      },
    })

    if (!auction || auction.deletedAt) {
      res.status(404).json({
        success: false,
        message: 'Auction not found',
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Auction retrieved successfully',
      data: auction,
    })
  } catch (error) {
    logger.error('Error fetching auction:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch auction',
    })
  }
}

// ============================================================================
// POST /auctions - Create auction listing
// ============================================================================
export async function createAuction(req: Request, res: Response): Promise<void> {
  try {
    const userRoles = req.user?.roles ?? []
    const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN)
    const isDistrictAdmin = userRoles.includes(ROLES.DISTRICT_ADMIN)

    if (!isSuperAdmin && !isDistrictAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only Super Admin or District Admin can create auctions',
      })
      return
    }

    const {
      assetId,
      title,
      description,
      startTime,
      endTime,
      reservePrice,
      startingBid,
      bidIncrement,
      buyNowPrice,
      termsAndConditions,
      pickupLocation,
      pickupDeadline,
    } = req.body

    // Validate required fields
    if (!assetId || !title || !startTime || !endTime || !reservePrice || !startingBid || !bidIncrement) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: assetId, title, startTime, endTime, reservePrice, startingBid, bidIncrement',
      })
      return
    }

    // Validate asset exists and is forfeited
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        warehouse: {
          select: { districtId: true },
        },
        auctionListings: {
          where: {
            deletedAt: null,
            status: { notIn: [AUCTION_STATUS.CANCELLED, AUCTION_STATUS.SOLD, AUCTION_STATUS.UNSOLD] },
          },
        },
      },
    })

    if (!asset || asset.deletedAt) {
      res.status(404).json({
        success: false,
        message: 'Asset not found',
      })
      return
    }

    if (asset.status !== ASSET_STATUS.FORFEITED) {
      res.status(400).json({
        success: false,
        message: `Asset must be FORFEITED to create auction. Current status: ${asset.status}`,
      })
      return
    }

    // Check if asset already has active auction
    if (asset.auctionListings.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Asset already has an active or scheduled auction',
      })
      return
    }

    // District admin can only create auctions for assets in their districts
    if (isDistrictAdmin && !isSuperAdmin) {
      const userDistricts = req.user?.districts ?? []
      if (asset.warehouse && !userDistricts.includes(asset.warehouse.districtId)) {
        res.status(403).json({
          success: false,
          message: 'You can only create auctions for assets in your assigned districts',
        })
        return
      }
    }

    // Validate dates
    const start = new Date(startTime)
    const end = new Date(endTime)
    const now = new Date()

    if (start < now) {
      res.status(400).json({
        success: false,
        message: 'Start time must be in the future',
      })
      return
    }

    if (end <= start) {
      res.status(400).json({
        success: false,
        message: 'End time must be after start time',
      })
      return
    }

    // Validate prices
    if (startingBid <= 0 || reservePrice <= 0 || bidIncrement <= 0) {
      res.status(400).json({
        success: false,
        message: 'Prices must be positive numbers',
      })
      return
    }

    if (startingBid > reservePrice) {
      res.status(400).json({
        success: false,
        message: 'Starting bid cannot be higher than reserve price',
      })
      return
    }

    // Generate listing number
    const listingNumber = await generateAuctionNumber()

    // Create auction
    const auction = await prisma.$transaction(async (tx) => {
      // Update asset status
      await tx.asset.update({
        where: { id: assetId },
        data: { status: ASSET_STATUS.IN_AUCTION },
      })

      // Create auction listing
      return tx.auctionListing.create({
        data: {
          listingNumber,
          assetId,
          title,
          description,
          startTime: start,
          endTime: end,
          reservePrice: parseFloat(reservePrice),
          startingBid: parseFloat(startingBid),
          bidIncrement: parseFloat(bidIncrement),
          buyNowPrice: buyNowPrice ? parseFloat(buyNowPrice) : null,
          termsAndConditions,
          pickupLocation,
          pickupDeadline: pickupDeadline ? new Date(pickupDeadline) : null,
          status: start <= now ? AUCTION_STATUS.ACTIVE : AUCTION_STATUS.SCHEDULED,
          createdById: req.user!.id,
        },
        include: {
          asset: {
            select: {
              id: true,
              assetType: true,
              brand: true,
              model: true,
            },
          },
        },
      })
    })

    logger.info(`Auction ${listingNumber} created for asset ${assetId} by ${req.user!.id}`)

    res.status(201).json({
      success: true,
      message: 'Auction created successfully',
      data: auction,
    })
  } catch (error) {
    logger.error('Error creating auction:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to create auction',
    })
  }
}

// ============================================================================
// POST /auctions/:id/bid - Place a bid
// ============================================================================
export async function placeBid(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { amount, maxAutoBid } = req.body
    const userId = req.user!.id

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        message: 'Bid amount must be a positive number',
      })
      return
    }

    // Get auction with current highest bid
    const auction = await prisma.auctionListing.findUnique({
      where: { id },
      include: {
        bids: {
          where: { status: BID_STATUS.ACTIVE },
          orderBy: { amount: 'desc' },
          take: 1,
        },
        createdBy: {
          select: { id: true },
        },
      },
    })

    if (!auction || auction.deletedAt) {
      res.status(404).json({
        success: false,
        message: 'Auction not found',
      })
      return
    }

    // Check auction status
    const now = new Date()
    if (auction.status !== AUCTION_STATUS.ACTIVE && auction.status !== AUCTION_STATUS.EXTENDED) {
      res.status(400).json({
        success: false,
        message: `Auction is not active. Current status: ${auction.status}`,
      })
      return
    }

    // Check if auction has ended
    const effectiveEndTime = auction.extendedEndTime ?? auction.endTime
    if (now > effectiveEndTime) {
      res.status(400).json({
        success: false,
        message: 'Auction has ended',
      })
      return
    }

    // Check if auction has started
    if (now < auction.startTime) {
      res.status(400).json({
        success: false,
        message: 'Auction has not started yet',
      })
      return
    }

    // Creator cannot bid on own auction
    if (auction.createdById === userId) {
      res.status(400).json({
        success: false,
        message: 'You cannot bid on your own auction',
      })
      return
    }

    // Validate bid amount
    const currentHighBid = auction.currentHighBid ?? auction.startingBid
    const minimumBid = auction.bids.length > 0 
      ? currentHighBid + auction.bidIncrement 
      : auction.startingBid

    if (amount < minimumBid) {
      res.status(400).json({
        success: false,
        message: `Minimum bid amount is ${minimumBid}`,
      })
      return
    }

    // Check if user is already the highest bidder
    if (auction.bids.length > 0 && auction.bids[0].bidderId === userId) {
      res.status(400).json({
        success: false,
        message: 'You are already the highest bidder',
      })
      return
    }

    // Place bid in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark previous highest bid as outbid
      if (auction.bids.length > 0) {
        await tx.auctionBid.update({
          where: { id: auction.bids[0].id },
          data: { 
            status: BID_STATUS.OUTBID,
            outbidAt: now,
          },
        })
      }

      // Create new bid
      const bid = await tx.auctionBid.create({
        data: {
          auctionId: id,
          bidderId: userId,
          amount: parseFloat(amount.toString()),
          maxAutoBid: maxAutoBid ? parseFloat(maxAutoBid.toString()) : null,
          isAutoBid: false,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
        include: {
          bidder: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      })

      // Update auction with new high bid
      let newStatus = auction.status
      let extendedEndTime = auction.extendedEndTime

      // Auto-extend if bid placed in last 5 minutes
      const fiveMinutes = 5 * 60 * 1000
      const currentEndTime = auction.extendedEndTime ?? auction.endTime
      if (currentEndTime.getTime() - now.getTime() < fiveMinutes) {
        extendedEndTime = new Date(now.getTime() + fiveMinutes)
        newStatus = AUCTION_STATUS.EXTENDED
      }

      const updatedAuction = await tx.auctionListing.update({
        where: { id },
        data: {
          currentHighBid: parseFloat(amount.toString()),
          totalBids: { increment: 1 },
          status: newStatus,
          extendedEndTime,
        },
      })

      return { bid, auction: updatedAuction, wasExtended: newStatus === AUCTION_STATUS.EXTENDED }
    })

    // Emit socket event for real-time updates
    try {
      const io = getIO()
      if (io) {
        io.to(`auction:${id}`).emit('auction:bidPlaced', {
          auctionId: id,
          bid: {
            id: result.bid.id,
            amount: result.bid.amount,
            bidder: {
              id: result.bid.bidder.id,
              name: `${result.bid.bidder.firstName} ${result.bid.bidder.lastName}`,
            },
            placedAt: result.bid.placedAt,
          },
          currentHighBid: result.auction.currentHighBid,
          totalBids: result.auction.totalBids,
          wasExtended: result.wasExtended,
          extendedEndTime: result.auction.extendedEndTime,
        })

        // Notify outbid user
        if (auction.bids.length > 0) {
          io.to(`user:${auction.bids[0].bidderId}`).emit('auction:outbid', {
            auctionId: id,
            listingNumber: auction.listingNumber,
            newHighBid: result.bid.amount,
          })
        }
      }
    } catch (socketError) {
      logger.error('Error emitting bid socket event:', socketError instanceof Error ? socketError : { error: socketError })
    }

    logger.info(`Bid placed on auction ${id}: ${amount} by user ${userId}`)

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      data: {
        bid: result.bid,
        currentHighBid: result.auction.currentHighBid,
        totalBids: result.auction.totalBids,
        wasExtended: result.wasExtended,
        extendedEndTime: result.auction.extendedEndTime,
      },
    })
  } catch (error) {
    logger.error('Error placing bid:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to place bid',
    })
  }
}

// ============================================================================
// POST /auctions/:id/buy-now - Buy Now (instant purchase)
// ============================================================================
export async function buyNow(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const auction = await prisma.auctionListing.findUnique({
      where: { id },
      include: {
        bids: {
          where: { status: BID_STATUS.ACTIVE },
          orderBy: { amount: 'desc' },
          take: 1,
        },
      },
    })

    if (!auction || auction.deletedAt) {
      res.status(404).json({
        success: false,
        message: 'Auction not found',
      })
      return
    }

    if (!auction.buyNowPrice) {
      res.status(400).json({
        success: false,
        message: 'Buy Now is not available for this auction',
      })
      return
    }

    if (auction.status !== AUCTION_STATUS.ACTIVE && auction.status !== AUCTION_STATUS.EXTENDED) {
      res.status(400).json({
        success: false,
        message: `Auction is not active. Current status: ${auction.status}`,
      })
      return
    }

    if (auction.createdById === userId) {
      res.status(400).json({
        success: false,
        message: 'You cannot buy your own auction item',
      })
      return
    }

    // Execute Buy Now
    const result = await prisma.$transaction(async (tx) => {
      // Mark all existing bids as outbid
      await tx.auctionBid.updateMany({
        where: { auctionId: id, status: BID_STATUS.ACTIVE },
        data: { status: BID_STATUS.OUTBID, outbidAt: new Date() },
      })

      // Create winning bid
      const winningBid = await tx.auctionBid.create({
        data: {
          auctionId: id,
          bidderId: userId,
          amount: auction.buyNowPrice!,
          status: BID_STATUS.WON,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      })

      // Update auction
      const updatedAuction = await tx.auctionListing.update({
        where: { id },
        data: {
          status: AUCTION_STATUS.SOLD,
          winnerId: userId,
          winningBidId: winningBid.id,
          finalPrice: auction.buyNowPrice,
          currentHighBid: auction.buyNowPrice,
          totalBids: { increment: 1 },
        },
      })

      // Update asset status
      await tx.asset.update({
        where: { id: auction.assetId },
        data: { status: ASSET_STATUS.AUCTIONED },
      })

      return { auction: updatedAuction, bid: winningBid }
    })

    // Emit socket event
    try {
      const io = getIO()
      if (io) {
        io.to(`auction:${id}`).emit('auction:ended', {
          auctionId: id,
          status: AUCTION_STATUS.SOLD,
          winnerId: userId,
          finalPrice: auction.buyNowPrice,
          endedBy: 'BUY_NOW',
        })
      }
    } catch (socketError) {
      logger.error('Error emitting buy-now socket event:', socketError instanceof Error ? socketError : { error: socketError })
    }

    logger.info(`Buy Now executed on auction ${id} by user ${userId} for ${auction.buyNowPrice}`)

    res.status(200).json({
      success: true,
      message: 'Purchase successful! You won the auction.',
      data: {
        auction: result.auction,
        finalPrice: auction.buyNowPrice,
      },
    })
  } catch (error) {
    logger.error('Error executing buy now:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to complete purchase',
    })
  }
}

// ============================================================================
// PUT /auctions/:id/cancel - Cancel auction (Admin only)
// ============================================================================
export async function cancelAuction(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body

    const userRoles = req.user?.roles ?? []
    const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN)
    const isDistrictAdmin = userRoles.includes(ROLES.DISTRICT_ADMIN)

    if (!isSuperAdmin && !isDistrictAdmin) {
      res.status(403).json({
        success: false,
        message: 'Only admins can cancel auctions',
      })
      return
    }

    const auction = await prisma.auctionListing.findUnique({
      where: { id },
      include: {
        asset: {
          select: { warehouse: { select: { districtId: true } } },
        },
      },
    })

    if (!auction || auction.deletedAt) {
      res.status(404).json({
        success: false,
        message: 'Auction not found',
      })
      return
    }

    if (auction.status === AUCTION_STATUS.SOLD || auction.status === AUCTION_STATUS.CANCELLED) {
      res.status(400).json({
        success: false,
        message: `Cannot cancel auction with status: ${auction.status}`,
      })
      return
    }

    // District admin can only cancel auctions in their districts
    if (isDistrictAdmin && !isSuperAdmin) {
      const userDistricts = req.user?.districts ?? []
      if (auction.asset?.warehouse && !userDistricts.includes(auction.asset.warehouse.districtId)) {
        res.status(403).json({
          success: false,
          message: 'You can only cancel auctions in your assigned districts',
        })
        return
      }
    }

    // Cancel auction
    await prisma.$transaction(async (tx) => {
      // Update auction
      await tx.auctionListing.update({
        where: { id },
        data: { status: AUCTION_STATUS.CANCELLED },
      })

      // Mark all bids as cancelled
      await tx.auctionBid.updateMany({
        where: { auctionId: id },
        data: { status: BID_STATUS.CANCELLED },
      })

      // Restore asset status to forfeited
      await tx.asset.update({
        where: { id: auction.assetId },
        data: { status: ASSET_STATUS.FORFEITED },
      })
    })

    // Emit socket event
    try {
      const io = getIO()
      if (io) {
        io.to(`auction:${id}`).emit('auction:cancelled', {
          auctionId: id,
          reason: reason || 'Auction cancelled by admin',
        })
      }
    } catch (socketError) {
      logger.error('Error emitting cancel socket event:', socketError instanceof Error ? socketError : { error: socketError })
    }

    logger.info(`Auction ${id} cancelled by ${req.user!.id}. Reason: ${reason || 'Not specified'}`)

    res.status(200).json({
      success: true,
      message: 'Auction cancelled successfully',
    })
  } catch (error) {
    logger.error('Error cancelling auction:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to cancel auction',
    })
  }
}

// ============================================================================
// GET /auctions/:id/bids - Get bid history
// ============================================================================
export async function getAuctionBids(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { page = '1', limit = '20' } = req.query

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const [bids, total] = await Promise.all([
      prisma.auctionBid.findMany({
        where: { auctionId: id },
        skip,
        take: limitNum,
        orderBy: { placedAt: 'desc' },
        include: {
          bidder: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.auctionBid.count({ where: { auctionId: id } }),
    ])

    res.status(200).json({
      success: true,
      message: 'Bids retrieved successfully',
      data: {
        bids,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    logger.error('Error fetching auction bids:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bids',
    })
  }
}

// ============================================================================
// GET /auctions/my-bids - Get user's bid history
// ============================================================================
export async function getMyBids(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id
    const { status, page = '1', limit = '20' } = req.query

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const where: Record<string, unknown> = { bidderId: userId }
    if (status) {
      where.status = status as string
    }

    const [bids, total] = await Promise.all([
      prisma.auctionBid.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { placedAt: 'desc' },
        include: {
          auction: {
            select: {
              id: true,
              listingNumber: true,
              title: true,
              status: true,
              currentHighBid: true,
              endTime: true,
              extendedEndTime: true,
              asset: {
                select: { id: true, brand: true, model: true },
              },
            },
          },
        },
      }),
      prisma.auctionBid.count({ where }),
    ])

    res.status(200).json({
      success: true,
      message: 'Your bids retrieved successfully',
      data: {
        bids,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    logger.error('Error fetching user bids:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your bids',
    })
  }
}

// ============================================================================
// POST /auctions/end-expired - End expired auctions (Called by cron job)
// ============================================================================
export async function endExpiredAuctions(req: Request, res: Response): Promise<void> {
  try {
    const now = new Date()

    // Find all auctions that have ended but not yet finalized
    const expiredAuctions = await prisma.auctionListing.findMany({
      where: {
        deletedAt: null,
        status: { in: [AUCTION_STATUS.ACTIVE, AUCTION_STATUS.EXTENDED, AUCTION_STATUS.SCHEDULED] },
        OR: [
          { extendedEndTime: { lte: now } },
          { endTime: { lte: now }, extendedEndTime: null },
        ],
      },
      include: {
        bids: {
          where: { status: BID_STATUS.ACTIVE },
          orderBy: { amount: 'desc' },
          take: 1,
        },
      },
    })

    const results = {
      processed: 0,
      sold: 0,
      unsold: 0,
      errors: 0,
    }

    for (const auction of expiredAuctions) {
      try {
        await prisma.$transaction(async (tx) => {
          const hasWinningBid = auction.bids.length > 0 && auction.bids[0].amount >= auction.reservePrice

          if (hasWinningBid) {
            const winningBid = auction.bids[0]

            // Update winning bid
            await tx.auctionBid.update({
              where: { id: winningBid.id },
              data: { status: BID_STATUS.WON },
            })

            // Update auction as sold
            await tx.auctionListing.update({
              where: { id: auction.id },
              data: {
                status: AUCTION_STATUS.ENDED,
                winnerId: winningBid.bidderId,
                winningBidId: winningBid.id,
                finalPrice: winningBid.amount,
              },
            })

            // Update asset status
            await tx.asset.update({
              where: { id: auction.assetId },
              data: { status: ASSET_STATUS.AUCTIONED },
            })

            results.sold++
          } else {
            // No valid bids - mark as unsold
            await tx.auctionListing.update({
              where: { id: auction.id },
              data: { status: AUCTION_STATUS.UNSOLD },
            })

            // Return asset to forfeited status
            await tx.asset.update({
              where: { id: auction.assetId },
              data: { status: ASSET_STATUS.FORFEITED },
            })

            results.unsold++
          }
        })

        // Emit socket event
        try {
          const io = getIO()
          if (io) {
            io.to(`auction:${auction.id}`).emit('auction:ended', {
              auctionId: auction.id,
              status: auction.bids.length > 0 && auction.bids[0].amount >= auction.reservePrice 
                ? AUCTION_STATUS.ENDED 
                : AUCTION_STATUS.UNSOLD,
              winnerId: auction.bids.length > 0 ? auction.bids[0].bidderId : null,
              finalPrice: auction.bids.length > 0 ? auction.bids[0].amount : null,
            })
          }
        } catch (socketError) {
          logger.error('Error emitting auction end socket event:', socketError instanceof Error ? socketError : { error: socketError })
        }

        results.processed++
      } catch (auctionError) {
        logger.error(`Error ending auction ${auction.id}:`, auctionError instanceof Error ? auctionError : { error: auctionError })
        results.errors++
      }
    }

    logger.info(`Ended ${results.processed} expired auctions. Sold: ${results.sold}, Unsold: ${results.unsold}, Errors: ${results.errors}`)

    res.status(200).json({
      success: true,
      message: 'Expired auctions processed',
      data: results,
    })
  } catch (error) {
    logger.error('Error ending expired auctions:', error instanceof Error ? error : { error })
    res.status(500).json({
      success: false,
      message: 'Failed to process expired auctions',
    })
  }
}

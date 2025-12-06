/**
 * Auctions Service
 * 
 * Handles auction creation, bidding, and lifecycle management:
 * - Create auctions for failed/defaulted loans
 * - Accept and validate bids
 * - Auto-extend on last-minute bids
 * - Determine winners
 * - Manage auction state transitions
 * 
 * Auction States:
 * SCHEDULED → ACTIVE → ENDED → WON_DETERMINED → COMPLETED
 * 
 * @module domain/auctions
 */

import { prisma } from '@fundifyhub/prisma';
import { ValidationError, NotFoundError, ForbiddenError, BusinessRuleError, ErrorCode } from '@fundifyhub/utils';
import { canManageAuction, canPlaceBid, canViewAuction, assertCanPerformAction, type RBACUser } from '../access-control';
import type { 
  Auction, 
  Bid, 
  PlaceBidResponse,
  CreateAuctionInput, 
  PlaceBidInput, 
  ListAuctionsInput 
} from '@fundifyhub/types';
import { eventBus } from '../events/bus';
import type { AuctionCreatedEvent, BidPlacedEvent, AuctionEndedEvent } from './auctions.events';
import logger from '../../utils/logger';

/**
 * AuctionsService - Auction lifecycle management
 * 
 * Handles creation of auctions (typically for failed loans),
 * bid management with auto-extension, and winner determination.
 */
export class AuctionsService {
  private static instance: AuctionsService;
  private readonly AUTO_EXTEND_MINUTES = 5;
  private readonly MIN_BID_INCREMENT = 5000; // ₹5000 minimum increment

  static getInstance(): AuctionsService {
    if (!AuctionsService.instance) {
      AuctionsService.instance = new AuctionsService();
    }
    return AuctionsService.instance;
  }

  /**
   * Create new auction
   * 
   * 1. Verify loan exists and is in DEFAULTED status
   * 2. Verify admin creating auction
   * 3. Validate auction parameters
   * 4. Create Auction record with SCHEDULED status
   * 5. Emit AuctionCreated event
   * 6. Return auction
   * 
   * @throws NotFoundError if loan doesn't exist
   * @throws ForbiddenError if not admin
   * @throws ValidationError if parameters invalid
   */
  async create(input: CreateAuctionInput, user: RBACUser): Promise<Auction> {
    try {
      // Validate user
      if (!user?.id) {
        throw new ForbiddenError('User not authenticated', ErrorCode.AUTHENTICATION_ERROR);
      }

      // Validate input
      if (!input.loanId || !input.reservePrice || !input.startPrice) {
        throw new ValidationError('Missing required fields', ErrorCode.INVALID_INPUT);
      }

      if (input.startPrice < input.reservePrice) {
        throw new ValidationError('Start price must be >= reserve price', ErrorCode.INVALID_INPUT);
      }

      if (input.endDate <= input.startDate) {
        throw new ValidationError('End date must be after start date', ErrorCode.INVALID_INPUT);
      }

      // Verify loan exists and get its asset
      const loan = await prisma.loan.findUnique({
        where: { id: input.loanId },
        include: {
          request: {
            include: {
              district: true,
            },
          },
        },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', ErrorCode.NOT_FOUND);
      }

      if (loan.status !== 'DEFAULTED') {
        throw new BusinessRuleError('Only defaulted loans can be auctioned');
      }

      // Check RBAC - user must be admin in loan's district
      const districtId = loan.request?.district?.id;
      if (!districtId) {
        throw new BusinessRuleError('Loan district not found');
      }

      assertCanPerformAction(
        canManageAuction(user, districtId),
        'You do not have permission to create auctions in this district'
      );

      // Get asset ID from request (assuming we have assets linked to requests)
      // For now, we'll need to create auction with required fields
      // Generate auction number
      const auctionCount = await prisma.auctionListing.count();
      const auctionNumber = `AUC${String(auctionCount + 1).padStart(6, '0')}`;

      // Create auction listing
      const auction = await prisma.auctionListing.create({
        data: {
          listingNumber: auctionNumber,
          assetId: loan.id, // Using loanId as assetId temporarily - needs proper asset model
          title: `Loan Asset Auction - ${loan.loanNumber}`,
          description: input.description || `Auction for defaulted loan ${loan.loanNumber}`,
          startTime: input.startDate,
          endTime: input.endDate,
          reservePrice: input.reservePrice,
          startingBid: input.startPrice,
          bidIncrement: this.MIN_BID_INCREMENT,
          status: 'SCHEDULED',
          createdById: user.id,
        },
      });

      logger.info('[AuctionsService.create] Auction created', {
        auctionId: auction.id,
        loanId: input.loanId,
        startPrice: input.startPrice,
        reservePrice: input.reservePrice,
      });

      // Emit auction created event
      eventBus.emitEvent({
        type: 'auction.created',
        timestamp: new Date(),
        aggregateId: auction.id,
        data: {
          auctionId: auction.id,
          loanId: input.loanId,
          startPrice: input.startPrice,
          reservePrice: input.reservePrice,
        },
      } as AuctionCreatedEvent);

      return auction as unknown as Auction;
    } catch (err) {
      logger.error('[AuctionsService.create] Failed to create auction', { error: err });
      throw err;
    }
  }

  /**
   * Get auction by ID
   * 
   * @throws NotFoundError if auction doesn't exist
   * @throws ForbiddenError if user lacks access
   */
  async getById(auctionId: string, user: RBACUser): Promise<Auction & { bids: Bid[] }> {
    try {
      // Fetch auction with bids
      const auction = await prisma.auctionListing.findUnique({
        where: { id: auctionId },
        include: {
          bids: {
            orderBy: { amount: 'desc' },
            include: {
              bidder: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          asset: true,
        },
      });

      if (!auction) {
        throw new NotFoundError('Auction not found', ErrorCode.NOT_FOUND);
      }

      // Check access - public if ACTIVE, else RBAC
      const isPublic = auction.status === 'ACTIVE';
      // For district check, we'd need to trace back to loan->request->district
      // For now, allow if public or admin
      const hasAccess = isPublic || canManageAuction(user, '');

      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this auction', ErrorCode.FORBIDDEN);
      }

      logger.debug('[AuctionsService.getById] Auction retrieved', { auctionId });

      return auction as any;
    } catch (err) {
      logger.error('[AuctionsService.getById] Failed to get auction', { error: err, auctionId });
      throw err;
    }
  }

  /**
   * List auctions with filtering
   * 
   * - Public users: only ACTIVE auctions
   * - Admins: all auctions
   * - Bidders: can see all they participate in
   * 
   * @throws ValidationError if pagination invalid
   */
  async list(user: RBACUser, input: ListAuctionsInput): Promise<{ auctions: Auction[]; total: number }> {
    try {
      const page = input.page || 1;
      const pageSize = Math.min(input.pageSize || 10, 100);

      if (page < 1 || pageSize < 1) {
        throw new ValidationError('Invalid pagination', ErrorCode.INVALID_INPUT);
      }

      // Build WHERE clause based on user role
      const where: any = {
        deletedAt: null,
      };

      // Non-admins see only ACTIVE auctions
      const isAdmin = canManageAuction(user, '');
      if (!isAdmin) {
        where.status = 'ACTIVE';
      }

      // Apply status filter if provided
      if (input.status) {
        where.status = input.status;
      }

      // Build orderBy
      const sortBy = input.sortBy || 'createdAt';
      const sortOrder = input.sortOrder || 'desc';
      const orderBy: any = {};

      if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'endDate') {
        orderBy.endTime = sortOrder;
      } else if (sortBy === 'highestBid') {
        orderBy.currentHighBid = sortOrder;
      }

      // Fetch auctions with pagination
      const [auctions, total] = await Promise.all([
        prisma.auctionListing.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            bids: {
              orderBy: { amount: 'desc' },
              take: 1,
            },
            asset: true,
          },
        }),
        prisma.auctionListing.count({ where }),
      ]);

      logger.debug('[AuctionsService.list] Auctions listed', { page, pageSize, total });

      return { auctions: auctions as any, total };
    } catch (err) {
      logger.error('[AuctionsService.list] Failed to list auctions', { error: err });
      throw err;
    }
  }

  /**
   * Publish auction (change from SCHEDULED to ACTIVE)
   * 
   * Only admins can publish. Typically called when auction start time is reached.
   * 
   * @throws NotFoundError if auction doesn't exist
   * @throws ForbiddenError if not admin
   * @throws BusinessRuleError if not in SCHEDULED status
   */
  async publish(auctionId: string, user: RBACUser): Promise<Auction> {
    try {
      // Fetch auction
      const auction = await prisma.auctionListing.findUnique({
        where: { id: auctionId },
      });

      if (!auction) {
        throw new NotFoundError('Auction not found', ErrorCode.NOT_FOUND);
      }

      if (auction.status !== 'SCHEDULED') {
        throw new BusinessRuleError('Only SCHEDULED auctions can be published');
      }

      // Check RBAC
      assertCanPerformAction(
        canManageAuction(user, ''),
        'You do not have permission to publish auctions'
      );

      // Update status to ACTIVE
      const updatedAuction = await prisma.auctionListing.update({
        where: { id: auctionId },
        data: {
          status: 'ACTIVE',
          approvedAt: new Date(),
          approvedBy: user.id,
        },
      });

      logger.info('[AuctionsService.publish] Auction published', { auctionId });

      return updatedAuction as unknown as Auction;
    } catch (err) {
      logger.error('[AuctionsService.publish] Failed to publish auction', { error: err, auctionId });
      throw err;
    }
  }

  /**
   * Place bid on auction
   * 
   * 1. Verify auction is ACTIVE
   * 2. Verify bid >= current highest + MIN_INCREMENT
   * 3. Create Bid record
   * 4. Check if bid is in last 5 mins → auto-extend endDate
   * 5. Update auction highestBidAmount and highestBidderId
   * 6. Emit BidPlaced event
   * 
   * @throws NotFoundError if auction doesn't exist
   * @throws ForbiddenError if user not authorized to bid
   * @throws BusinessRuleError if bid amount invalid or auction closed
   */
  async placeBid(input: PlaceBidInput, user: RBACUser): Promise<PlaceBidResponse> {
    try {
      if (!user?.id) {
        throw new ForbiddenError('User not authenticated', ErrorCode.AUTHENTICATION_ERROR);
      }

      if (!input.bidAmount || input.bidAmount <= 0) {
        throw new ValidationError('Invalid bid amount', ErrorCode.INVALID_INPUT);
      }

      // Fetch auction
      const auction = await prisma.auctionListing.findUnique({
        where: { id: input.auctionId },
      });

      if (!auction) {
        throw new NotFoundError('Auction not found', ErrorCode.NOT_FOUND);
      }

      if (auction.status !== 'ACTIVE') {
        throw new BusinessRuleError('Auction is not active');
      }

      // Check if auction has ended
      const now = new Date();
      const endTime = auction.extendedEndTime || auction.endTime;
      if (now > endTime) {
        throw new BusinessRuleError('Auction has ended');
      }

      // Check RBAC - user must be customer
      assertCanPerformAction(
        canPlaceBid(user),
        'You do not have permission to place bids'
      );

      // Verify bid amount meets minimum
      const currentHighBid = auction.currentHighBid || auction.startingBid;
      const minimumBid = currentHighBid + this.MIN_BID_INCREMENT;

      if (input.bidAmount < minimumBid) {
        throw new ValidationError(
          `Bid must be at least ₹${minimumBid}`,
          ErrorCode.INVALID_INPUT
        );
      }

      // Mark previous highest bid as OUTBID if exists
      if (auction.currentHighBid && auction.winnerId) {
        await prisma.auctionBid.updateMany({
          where: {
            auctionId: input.auctionId,
            bidderId: auction.winnerId,
            status: 'WINNING',
          },
          data: {
            status: 'OUTBID',
            outbidAt: new Date(),
          },
        });
      }

      // Create new bid
      const bid = await prisma.auctionBid.create({
        data: {
          auctionId: input.auctionId,
          bidderId: user.id,
          amount: input.bidAmount,
          status: 'WINNING',
        },
        include: {
          bidder: true,
        },
      });

      // Check if we need to auto-extend
      const timeUntilEnd = endTime.getTime() - now.getTime();
      const fiveMinutesMs = 5 * 60 * 1000;
      let newExtendedEndTime = auction.extendedEndTime;

      if (timeUntilEnd <= fiveMinutesMs) {
        newExtendedEndTime = new Date(endTime.getTime() + this.AUTO_EXTEND_MINUTES * 60 * 1000);
        logger.info('[AuctionsService.placeBid] Auto-extending auction', {
          auctionId: input.auctionId,
          newEndTime: newExtendedEndTime,
        });
      }

      // Update auction with new highest bid
      const updatedAuction = await prisma.auctionListing.update({
        where: { id: input.auctionId },
        data: {
          currentHighBid: input.bidAmount,
          winnerId: user.id,
          winningBidId: bid.id,
          totalBids: { increment: 1 },
          extendedEndTime: newExtendedEndTime,
          status: newExtendedEndTime ? 'EXTENDED' : auction.status,
        },
      });

      logger.info('[AuctionsService.placeBid] Bid placed', {
        auctionId: input.auctionId,
        bidId: bid.id,
        amount: input.bidAmount,
        bidder: user.id,
      });

      // Emit bid placed event
      eventBus.emitEvent({
        type: 'bid.placed',
        timestamp: new Date(),
        aggregateId: input.auctionId,
        data: {
          auctionId: input.auctionId,
          bidderId: user.id,
          bidAmount: input.bidAmount,
        },
      } as BidPlacedEvent);

      return { bid: bid as unknown as Bid, auction: updatedAuction as unknown as Auction };
    } catch (err) {
      logger.error('[AuctionsService.placeBid] Failed to place bid', { error: err });
      throw err;
    }
  }

  /**
   * Extend auction end time
   * 
   * Only admins can manually extend (in addition to auto-extension on late bids)
   * 
   * @throws NotFoundError if auction doesn't exist
   * @throws ForbiddenError if not admin
   * @throws BusinessRuleError if auction already ended
   */
  async extend(auctionId: string, newEndDate: Date, user: RBACUser): Promise<Auction> {
    try {
      if (!newEndDate || newEndDate <= new Date()) {
        throw new ValidationError('New end date must be in future', ErrorCode.INVALID_INPUT);
      }

      // Fetch auction
      const auction = await prisma.auctionListing.findUnique({
        where: { id: auctionId },
      });

      if (!auction) {
        throw new NotFoundError('Auction not found', ErrorCode.NOT_FOUND);
      }

      if (auction.status !== 'ACTIVE' && auction.status !== 'EXTENDED') {
        throw new BusinessRuleError('Only active auctions can be extended');
      }

      // Check RBAC
      assertCanPerformAction(
        canManageAuction(user, ''),
        'You do not have permission to extend auctions'
      );

      const currentEndTime = auction.extendedEndTime || auction.endTime;
      if (newEndDate <= currentEndTime) {
        throw new ValidationError('New end date must be after current end date', ErrorCode.INVALID_INPUT);
      }

      // Update auction
      const updatedAuction = await prisma.auctionListing.update({
        where: { id: auctionId },
        data: {
          extendedEndTime: newEndDate,
          status: 'EXTENDED',
        },
      });

      logger.info('[AuctionsService.extend] Auction extended', {
        auctionId,
        newEndDate,
      });

      return updatedAuction as unknown as Auction;
    } catch (err) {
      logger.error('[AuctionsService.extend] Failed to extend auction', { error: err, auctionId });
      throw err;
    }
  }

  /**
   * End auction and determine winner
   * 
   * Typically called by cron job when endDate is reached.
   * 1. Verify auction ACTIVE and end time reached
   * 2. Check if highestBid >= reservePrice
   * 3. If yes: create WonBid, update auction status to WON_DETERMINED
   * 4. If no: auction failed, status to ENDED
   * 5. Emit AuctionEnded event
   * 
   * @throws NotFoundError if auction doesn't exist
   * @throws BusinessRuleError if auction not ACTIVE
   */
  async endAuction(auctionId: string, user: RBACUser): Promise<Auction> {
    try {
      // Fetch auction
      const auction = await prisma.auctionListing.findUnique({
        where: { id: auctionId },
        include: {
          bids: {
            orderBy: { amount: 'desc' },
            take: 1,
          },
        },
      });

      if (!auction) {
        throw new NotFoundError('Auction not found', ErrorCode.NOT_FOUND);
      }

      if (auction.status !== 'ACTIVE' && auction.status !== 'EXTENDED') {
        throw new BusinessRuleError('Only active auctions can be ended');
      }

      // Verify end time has been reached
      const now = new Date();
      const endTime = auction.extendedEndTime || auction.endTime;
      if (now < endTime) {
        throw new BusinessRuleError('Auction end time has not been reached');
      }

      // Check RBAC - admins or system
      if (user) {
        assertCanPerformAction(
          canManageAuction(user, ''),
          'You do not have permission to end auctions'
        );
      }

      // Determine winner
      const highestBid = auction.bids[0];
      const hasWinner = highestBid && highestBid.amount >= auction.reservePrice;

      let newStatus: 'ENDED' | 'UNSOLD';
      let finalPrice: number | undefined;
      let winnerId: string | undefined;

      if (hasWinner) {
        // Reserve price met - auction successful
        newStatus = 'ENDED';
        finalPrice = highestBid.amount;
        winnerId = highestBid.bidderId;

        // Mark winning bid
        await prisma.auctionBid.update({
          where: { id: highestBid.id },
          data: { status: 'WON' },
        });

        // Mark other bids as cancelled
        await prisma.auctionBid.updateMany({
          where: {
            auctionId,
            id: { not: highestBid.id },
            status: { in: ['ACTIVE', 'OUTBID'] },
          },
          data: { status: 'CANCELLED' },
        });
      } else {
        // Reserve price not met - auction failed
        newStatus = 'UNSOLD';

        // Mark all bids as cancelled
        await prisma.auctionBid.updateMany({
          where: {
            auctionId,
            status: { in: ['ACTIVE', 'OUTBID', 'WINNING'] },
          },
          data: { status: 'CANCELLED' },
        });
      }

      // Update auction
      const updatedAuction = await prisma.auctionListing.update({
        where: { id: auctionId },
        data: {
          status: newStatus,
          finalPrice,
          winnerId,
        },
      });

      logger.info('[AuctionsService.endAuction] Auction ended', {
        auctionId,
        hasWinner,
        winnerId,
        finalPrice,
      });

      // Emit auction ended event
      eventBus.emitEvent({
        type: 'auction.ended',
        timestamp: new Date(),
        aggregateId: auctionId,
        data: {
          auctionId,
          winnerId,
          finalBid: finalPrice,
          success: hasWinner,
        },
      } as AuctionEndedEvent);

      return updatedAuction as unknown as Auction;
    } catch (err) {
      logger.error('[AuctionsService.endAuction] Failed to end auction', { error: err, auctionId });
      throw err;
    }
  }

  /**
   * Cancel auction
   * 
   * Only admins can cancel. Typically for administrative reasons.
   * 
   * @throws NotFoundError if auction doesn't exist
   * @throws ForbiddenError if not admin
   * @throws BusinessRuleError if auction already completed
   */
  async cancelAuction(auctionId: string, reason: string, user: RBACUser): Promise<Auction> {
    try {
      if (!reason) {
        throw new ValidationError('Cancellation reason required', ErrorCode.INVALID_INPUT);
      }

      // Fetch auction
      const auction = await prisma.auctionListing.findUnique({
        where: { id: auctionId },
      });

      if (!auction) {
        throw new NotFoundError('Auction not found', ErrorCode.NOT_FOUND);
      }

      // Check if already completed or cancelled
      if (['ENDED', 'SOLD', 'UNSOLD', 'CANCELLED'].includes(auction.status)) {
        throw new BusinessRuleError('Auction already completed or cancelled');
      }

      // Check RBAC
      assertCanPerformAction(
        canManageAuction(user, ''),
        'You do not have permission to cancel auctions'
      );

      // Cancel all active bids
      await prisma.auctionBid.updateMany({
        where: {
          auctionId,
          status: { in: ['ACTIVE', 'OUTBID', 'WINNING'] },
        },
        data: { status: 'CANCELLED' },
      });

      // Update auction status
      const updatedAuction = await prisma.auctionListing.update({
        where: { id: auctionId },
        data: {
          status: 'CANCELLED',
          // Store reason in termsAndConditions as we don't have a cancellation reason field
          termsAndConditions: `CANCELLED: ${reason}`,
        },
      });

      logger.info('[AuctionsService.cancelAuction] Auction cancelled', {
        auctionId,
        reason,
      });

      return updatedAuction as unknown as Auction;
    } catch (err) {
      logger.error('[AuctionsService.cancelAuction] Failed to cancel auction', { error: err, auctionId });
      throw err;
    }
  }
}

export const auctionsService = AuctionsService.getInstance();

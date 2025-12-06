/**
 * Auction Event Handlers
 * 
 * Respond to auction domain events:
 * - Send auction notifications
 * - Notify bidders of outbids
 * - Notify winners
 * 
 * @module domain/events/handlers
 */

import { eventBus } from '../bus';
import type { AuctionCreatedEvent, BidPlacedEvent, AuctionEndedEvent } from '../../auctions/auctions.events';
import { notificationAdapter } from '../../../infra-adapters';
import logger from '../../../utils/logger';

/**
 * Handle: Auction created
 * 
 * Notify admins and list on public page
 */
export function setupAuctionCreatedHandler(): void {
  eventBus.onEvent<AuctionCreatedEvent>('auction.created', async (event) => {
    try {
      logger.info('[AuctionHandler] Auction created event received', {
        auctionId: event.aggregateId,
        loanId: event.data.loanId,
      });

      // Publish event for job-worker to process
      await notificationAdapter.publishEvent({
        eventType: 'auction.created',
        userId: 'system', // System-generated auction
        metadata: {
          auctionId: event.aggregateId,
          loanId: event.data.loanId,
          startPrice: event.data.startPrice,
          reservePrice: event.data.reservePrice,
        },
      });

      logger.info('[AuctionHandler] Auction created notifications queued', { auctionId: event.aggregateId });
    } catch (err) {
      logger.error('[AuctionHandler] Error handling auction.created', { error: err, auctionId: event.aggregateId });
    }
  });
}

/**
 * Handle: Bid placed
 * 
 * Notify previous highest bidder (outbid)
 * Send confirmation to new bidder
 */
export function setupBidPlacedHandler(): void {
  eventBus.onEvent<BidPlacedEvent>('bid.placed', async (event) => {
    try {
      logger.info('[AuctionHandler] Bid placed event received', {
        auctionId: event.aggregateId,
        bidderId: event.data.bidderId,
        bidAmount: event.data.bidAmount,
      });

      // Publish event for job-worker to notify bidders
      await notificationAdapter.publishEvent({
        eventType: 'bid.placed',
        userId: event.data.bidderId,
        metadata: {
          auctionId: event.aggregateId,
          bidderId: event.data.bidderId,
          bidAmount: event.data.bidAmount,
        },
      });

      logger.info('[AuctionHandler] Bid placed notifications queued', { auctionId: event.aggregateId });
    } catch (err) {
      logger.error('[AuctionHandler] Error handling bid.placed', { error: err, auctionId: event.aggregateId });
    }
  });
}

/**
 * Handle: Auction ended
 * 
 * Notify winner (if any)
 * Alert admins
 * Update metrics
 */
export function setupAuctionEndedHandler(): void {
  eventBus.onEvent<AuctionEndedEvent>('auction.ended', async (event) => {
    try {
      logger.info('[AuctionHandler] Auction ended event received', {
        auctionId: event.aggregateId,
        winnerId: event.data.winnerId,
        success: event.data.success,
      });

      // Publish event for job-worker to handle winner/admin notifications
      await notificationAdapter.publishEvent({
        eventType: 'auction.ended',
        userId: event.data.winnerId || 'system',
        metadata: {
          auctionId: event.aggregateId,
          winnerId: event.data.winnerId,
          finalBid: event.data.finalBid,
          success: event.data.success,
        },
      });

      logger.info('[AuctionHandler] Auction ended notifications queued', { 
        auctionId: event.aggregateId,
        success: event.data.success,
      });
    } catch (err) {
      logger.error('[AuctionHandler] Error handling auction.ended', { error: err, auctionId: event.aggregateId });
    }
  });
}

/**
 * Initialize all auction event handlers
 */
export function initializeAuctionHandlers(): void {
  setupAuctionCreatedHandler();
  setupBidPlacedHandler();
  setupAuctionEndedHandler();
  logger.info('[EventHandlers] Auction event handlers initialized');
}

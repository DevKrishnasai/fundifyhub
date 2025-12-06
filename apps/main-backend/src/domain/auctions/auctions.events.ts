import type { DomainEvent } from '../events/bus';

/**
 * Auction events
 */
export interface AuctionCreatedEvent extends DomainEvent {
  type: 'auction.created';
  data: {
    auctionId: string;
    loanId: string;
    startPrice: number;
    reservePrice: number;
  };
}

export interface BidPlacedEvent extends DomainEvent {
  type: 'bid.placed';
  data: {
    auctionId: string;
    bidderId: string;
    bidAmount: number;
  };
}

export interface AuctionEndedEvent extends DomainEvent {
  type: 'auction.ended';
  data: {
    auctionId: string;
    winnerId?: string;
    finalBid?: number;
    success: boolean;
  };
}

export type AuctionEvent =
  | AuctionCreatedEvent
  | BidPlacedEvent
  | AuctionEndedEvent;

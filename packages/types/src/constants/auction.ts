/**
 * Auction-related constants and enums
 * Aligned with Prisma schema
 */

export enum AuctionStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  EXTENDED = 'EXTENDED',
  ENDED = 'ENDED',
  SOLD = 'SOLD',
  UNSOLD = 'UNSOLD',
  CANCELLED = 'CANCELLED',
}

export const AUCTION_STATUSES = Object.values(AuctionStatus);

export enum BidStatus {
  ACTIVE = 'ACTIVE',
  OUTBID = 'OUTBID',
  WINNING = 'WINNING',
  WON = 'WON',
  WITHDRAWN = 'WITHDRAWN',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export const BID_STATUSES = Object.values(BidStatus);

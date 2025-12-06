import type { JsonValue } from '../common/models';
import type { User } from '../auth/models';
import type { Asset } from '../request/models';
import type { AUCTION_STATUS, BID_STATUS } from './enums';

export interface Auction {
  id: string;
  listingNumber: string;
  assetId: string;
  
  // Timing
  startTime: Date;
  endTime: Date;
  extendedEndTime: Date | null;
  
  // Pricing
  reservePrice: number;
  startingBid: number;
  bidIncrement: number;
  buyNowPrice: number | null;
  
  // State
  status: AUCTION_STATUS;
  currentHighBid: number | null;
  totalBids: number;
  
  // Winner
  winnerId: string | null;
  winningBidId: string | null;
  finalPrice: number | null;
  
  // Description
  title: string;
  description: string;
  mediaUrls: JsonValue | null;
  
  // Terms
  termsAndConditions: string | null;
  pickupLocation: string | null;
  pickupDeadline: Date | null;
  
  // Admin tracking
  createdById: string;
  approvedAt: Date | null;
  approvedBy: string | null;
  
  // Soft delete
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  asset?: Asset;
  winner?: User | null;
  createdBy?: User;
  bids?: Bid[];
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  status: BID_STATUS;
  maxAutoBid: number | null;
  isAutoBid: boolean;
  placedAt: Date;
  outbidAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  
  // Relations
  bidder?: User;
  auction?: Auction;
}

export interface PlaceBidResponse {
  bid: Bid;
  auction: Auction;
}

// Aliases
export type AuctionListingType = Auction;
export type AuctionBidType = Bid;

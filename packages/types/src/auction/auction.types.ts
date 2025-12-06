/**
 * Auction types
 * @module auction/auction.types
 */

import type { JsonValue } from '../common/common.types';
import type { UserType } from '../auth/auth.types';
import type { AssetType } from '../request/request.types';
import type { AUCTION_STATUS, BID_STATUS } from './auction.constants';

export interface AuctionListingType {
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
  asset?: AssetType;
  winner?: UserType | null;
  createdBy?: UserType;
  bids?: AuctionBidType[];
}

export interface AuctionBidType {
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
  bidder?: UserType;
  auction?: AuctionListingType;
}

export interface PlaceBidResponse {
  bid: AuctionBidType;
  auction: AuctionListingType;
}

// Aliases
export type Auction = AuctionListingType;
export type Bid = AuctionBidType;

/**
 * Auction-related types
 */

import type { AuctionStatus, BidStatus } from '../constants/auction';

export interface AuctionListingDTO {
  id: string;
  listingNumber: string;
  assetId: string;
  startTime: Date | string;
  endTime: Date | string;
  extendedEndTime?: Date | string | null;
  reservePrice: number;
  startingBid: number;
  bidIncrement: number;
  buyNowPrice?: number | null;
  status: AuctionStatus;
  currentHighBid?: number | null;
  totalBids: number;
  winnerId?: string | null;
  winningBidId?: string | null;
  finalPrice?: number | null;
  title: string;
  description: string;
  termsAndConditions?: string | null;
  pickupLocation?: string | null;
  pickupDeadline?: Date | string | null;
  createdById: string;
  approvedAt?: Date | string | null;
  approvedBy?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuctionBidDTO {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  status: BidStatus;
  maxAutoBid?: number | null;
  isAutoBid: boolean;
  placedAt: Date | string;
  outbidAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

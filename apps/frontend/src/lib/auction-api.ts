/**
 * Auction API Client
 * Provides functions for auction listings, bidding, and management
 */

import { getWithResult, postWithResult, patchWithResult, deleteWithResult } from './api-client';
import { BACKEND_API_CONFIG } from './urls';

// ============================================================================
// TYPES
// ============================================================================

export interface Auction {
  id: string;
  auctionNumber: string;
  assetId: string;
  title: string;
  description: string | null;
  startingPrice: number;
  currentHighestBid: number;
  buyNowPrice: number | null;
  status: 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  startTime: string;
  endTime: string;
  winnerId: string | null;
  finalPrice: number | null;
  totalBids: number;
  createdAt: string;
  asset?: {
    id: string;
    assetType: string;
    brand: string | null;
    model: string | null;
    estimatedValue: number;
  };
  winner?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidAmount: number;
  bidTime: string;
  status: 'VALID' | 'OUTBID' | 'WINNING' | 'WON' | 'LOST';
  bidder?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// ============================================================================
// AUCTION OPERATIONS
// ============================================================================

export async function listAuctions(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const url = `${BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.LIST}?${queryParams.toString()}`;
  return getWithResult<{
    auctions: Auction[];
    total: number;
    page: number;
    limit: number;
  }>(url);
}

export async function getActiveAuctions(params?: { page?: number; limit?: number }) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const url = `${BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.LIST}?status=ACTIVE&${queryParams.toString()}`;
  return getWithResult<{
    auctions: Auction[];
    total: number;
  }>(url);
}

export async function getAuctionById(id: string) {
  return getWithResult<Auction>(BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.GET_BY_ID(id));
}

export async function createAuction(data: {
  assetId: string;
  title: string;
  description?: string;
  startingPrice: number;
  buyNowPrice?: number;
  startTime: string;
  endTime: string;
}) {
  return postWithResult<Auction>(BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.CREATE, data);
}

export async function updateAuction(id: string, data: {
  title?: string;
  description?: string;
  buyNowPrice?: number;
  endTime?: string;
}) {
  return patchWithResult<Auction>(BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.UPDATE(id), data);
}

export async function cancelAuction(id: string, reason: string) {
  return postWithResult(BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.CANCEL(id), { reason });
}

export async function completeAuction(id: string) {
  return postWithResult(BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.COMPLETE(id), {});
}

// ============================================================================
// BIDDING OPERATIONS
// ============================================================================

export async function placeBid(auctionId: string, bidAmount: number) {
  return postWithResult<Bid>(
    BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.PLACE_BID(auctionId),
    { bidAmount }
  );
}

export async function getAuctionBids(auctionId: string) {
  return getWithResult<Bid[]>(BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.BID_HISTORY(auctionId));
}

export async function getMyBids() {
  return getWithResult<Bid[]>(BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.MY_BIDS);
}

export async function getMyWins() {
  return getWithResult<Auction[]>(BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.MY_WINS);
}

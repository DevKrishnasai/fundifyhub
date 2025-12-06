/**
 * Auctions Adapter
 *
 * Abstraction layer for auctions API calls.
 *
 * @module lib/adapters/auctions
 */

import { getWithResult, postWithResult, putWithResult, deleteWithResult } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';
import type { AuctionListingType, AuctionBidType } from '@fundifyhub/types';

/**
 * Auction list filters
 */
export interface AuctionListFilters {
  page?: number;
  limit?: number;
  status?: string;
  assetId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Auction list response
 */
export interface AuctionListResponse {
  auctions: AuctionListingType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Place bid payload
 */
export interface PlaceBidPayload {
  amount: number;
  maxAutoBid?: number;
}

/**
 * Place bid response
 */
export interface PlaceBidResponse {
  bid: AuctionBidType;
  currentHighBid: number;
  totalBids: number;
  wasExtended: boolean;
  extendedEndTime: string | null;
}

/**
 * Create auction payload
 */
export interface CreateAuctionPayload {
  assetId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  reservePrice: number;
  startingBid: number;
  bidIncrement: number;
  buyNowPrice?: number;
  mediaUrls?: string[];
  termsAndConditions?: string;
  pickupLocation?: string;
  pickupDeadline?: string;
}

/**
 * Update auction payload
 */
export interface UpdateAuctionPayload {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  reservePrice?: number;
  startingBid?: number;
  bidIncrement?: number;
  buyNowPrice?: number;
  mediaUrls?: string[];
  termsAndConditions?: string;
  pickupLocation?: string;
  pickupDeadline?: string;
}

/**
 * My bids filters
 */
export interface MyBidsFilters {
  page?: number;
  limit?: number;
  status?: string;
}

/**
 * My bids response
 */
export interface MyBidsResponse {
  bids: AuctionBidType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * End expired auctions response
 */
export interface EndExpiredResponse {
  processed: number;
  sold: number;
  unsold: number;
  errors: number;
}

export const auctionsAdapter = {
  /**
   * List auctions with filters
   */
  async list(filters?: AuctionListFilters) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assetId) params.append('assetId', filters.assetId);
    if (filters?.minPrice) params.append('minPrice', String(filters.minPrice));
    if (filters?.maxPrice) params.append('maxPrice', String(filters.maxPrice));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const url = `${BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.LIST}?${params.toString()}`;
    return getWithResult<AuctionListResponse>(url);
  },

  /**
   * Get auction by ID
   */
  async getById(id: string) {
    return getWithResult<AuctionListingType>(
      BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.GET_BY_ID(id)
    );
  },

  /**
   * Create auction (admin only)
   */
  async create(payload: CreateAuctionPayload) {
    return postWithResult<AuctionListingType, CreateAuctionPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.CREATE,
      payload
    );
  },

  /**
   * Update auction (admin only)
   */
  async update(id: string, payload: UpdateAuctionPayload) {
    return putWithResult<AuctionListingType, UpdateAuctionPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.UPDATE(id),
      payload
    );
  },

  /**
   * Place bid on auction
   */
  async placeBid(auctionId: string, payload: PlaceBidPayload) {
    return postWithResult<PlaceBidResponse, PlaceBidPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.PLACE_BID(auctionId),
      payload
    );
  },

  /**
   * Get bid history for auction
   */
  async getBidHistory(auctionId: string) {
    return getWithResult<AuctionBidType[]>(
      BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.BID_HISTORY(auctionId)
    );
  },

  /**
   * Get my bids
   */
  async getMyBids(filters?: MyBidsFilters) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.status) params.append('status', filters.status);

    const url = `${BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.MY_BIDS}?${params.toString()}`;
    return getWithResult<MyBidsResponse>(url);
  },

  /**
   * Get my auction wins
   */
  async getMyWins() {
    return getWithResult<MyBidsResponse>(
      BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.MY_WINS
    );
  },

  /**
   * Cancel auction (admin only)
   */
  async cancel(id: string) {
    return postWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.CANCEL(id)
    );
  },

  /**
   * Complete auction (admin only)
   */
  async complete(id: string) {
    return postWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.AUCTIONS.COMPLETE(id)
    );
  },

  /**
   * End expired auctions (admin only)
   */
  async endExpired() {
    return postWithResult<EndExpiredResponse>(
      `${BACKEND_API_CONFIG.BASE_URL}/api/v1/auctions/end-expired`
    );
  },
};

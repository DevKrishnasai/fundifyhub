import { api, BackendEnvelope } from '../api-client';
import type { AuctionListingType, BID_STATUS } from '@fundifyhub/types';

export interface AuctionBidder {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AuctionBid {
  id: string;
  amount: number;
  status: BID_STATUS;
  placedAt: string;
  bidder?: AuctionBidder;
  isAutoBid: boolean;
  auction?: AuctionListingType;
}

export interface AuctionListFilters {
  status?: string;
  districtId?: string;
  warehouseId?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MyBidsFilters {
  page?: number | undefined;
  limit?: number | undefined;
  status?: string | undefined;
}

export interface MyBidsResponse {
  bids: AuctionBid[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PlaceBidPayload {
  amount: number;
}

export interface PlaceBidResponse {
  bid: AuctionBid;
  auction: AuctionListingType;
}

export interface EndExpiredResponse {
  count: number;
  ids: string[];
}

export interface AuctionListResponse {
  auctions: AuctionListingType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type AdapterResponse<T> = 
  | { ok: true; data: T; error?: never }
  | { ok: false; data?: never; error: { message: string } };

async function safeApiCall<T>(promise: Promise<any>): Promise<AdapterResponse<T>> {
  try {
    const response = await promise;
    const body = response.data as BackendEnvelope<T>;
    if (body.success) {
      return { ok: true, data: body.data as T };
    } else {
      return { ok: false, error: { message: body.message || 'Unknown error' } };
    }
  } catch (e: any) {
    const msg = e.response?.data?.message || e.message || 'Network error';
    return { ok: false, error: { message: msg } };
  }
}

export const auctionsAdapter = {
  list: (filters: AuctionListFilters) => 
    safeApiCall<AuctionListResponse>(api.get('/auctions', { params: filters })),

  getById: (id: string) => 
    safeApiCall<AuctionListingType>(api.get(`/auctions/${id}`)),

  placeBid: (auctionId: string, payload: PlaceBidPayload) => 
    safeApiCall<PlaceBidResponse>(api.post(`/auctions/${auctionId}/bids`, payload)),

  getMyBids: (filters: MyBidsFilters) => 
    safeApiCall<MyBidsResponse>(api.get('/auctions/my-bids', { params: filters })),

  endExpired: () => 
    safeApiCall<EndExpiredResponse>(api.post('/auctions/expired/end')),

  getBidHistory: (auctionId: string) => 
    safeApiCall<AuctionBid[]>(api.get(`/auctions/${auctionId}/history`)),
};

/**
 * Auction React Query Hooks
 * Provides hooks for auction listing, bidding, and lifecycle management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { auctionsAdapter, type MyBidsFilters, type MyBidsResponse } from '../../lib/adapters'
import { AUCTION_STATUS, BID_STATUS, type AuctionListingType } from '@fundifyhub/types'

// ============================================================================
// Types
// ============================================================================

export interface AuctionBidder {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface AuctionBid {
  id: string
  amount: number
  status: BID_STATUS
  placedAt: string
  bidder?: AuctionBidder
  isAutoBid: boolean
}

export interface AuctionAsset {
  id?: string
  assetNumber?: string
  category?: string
  subcategory?: string | null
  metalType?: string | null
  purity?: string | null
  grossWeight?: number | null
  netWeight?: number | null
  estimatedValue?: number | null
  description?: string | null
  photos?: string[]
  warehouse?: {
    id?: string
    name?: string
    district?: {
      id?: string
      name?: string
    }
  } | null
}

export interface AuctionListing {
  id: string
  listingNumber: string
  title: string
  description: string | null
  status: AUCTION_STATUS
  reservePrice: number
  startingBid: number
  currentHighBid: number | null
  bidIncrement: number
  buyNowPrice: number | null
  startTime: string
  endTime: string
  extendedEndTime: string | null
  extensionMinutes?: number
  totalBids: number
  viewCount?: number
  asset?: AuctionAsset | null
  bids?: AuctionBid[]
  winner?: AuctionBidder | null
  winnerId: string | null
  finalPrice: number | null
  createdAt: string
  updatedAt: string
  createdBy?: {
    id?: string
    firstName?: string
    lastName?: string
  } | null
}

export interface AuctionListFilters {
  status?: AUCTION_STATUS
  districtId?: string
  warehouseId?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  search?: string
  page?: number
  limit?: number
}

export interface CreateAuctionPayload {
  assetId: string
  title: string
  description?: string
  reservePrice: number
  startingBid: number
  bidIncrement: number
  buyNowPrice?: number
  startTime: string
  endTime: string
  extensionMinutes?: number
}

import type { 
  PlaceBidPayload, 
  PlaceBidResponse, 
  EndExpiredResponse 
} from '@/lib/adapters/auctions-adapter'

export interface AuctionListResponse {
  auctions: AuctionListing[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface BidListResponse {
  bids: AuctionBid[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type { EndExpiredResponse }

// ============================================================================
// Query Keys Factory
// ============================================================================

export const auctionKeys = {
  all: ['auctions'] as const,
  lists: () => [...auctionKeys.all, 'list'] as const,
  list: (filters: AuctionListFilters) => [...auctionKeys.lists(), filters] as const,
  active: () => [...auctionKeys.all, 'active'] as const,
  details: () => [...auctionKeys.all, 'detail'] as const,
  detail: (id: string) => [...auctionKeys.details(), id] as const,
  bids: (auctionId: string) => [...auctionKeys.all, 'bids', auctionId] as const,
  myBids: () => [...auctionKeys.all, 'my-bids'] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List all auctions with filters (admin view)
 */
export function useAuctions(filters: AuctionListFilters = {}) {
  return useQuery({
    queryKey: auctionKeys.list(filters),
    queryFn: async (): Promise<AuctionListResponse> => {
      const result = await auctionsAdapter.list(filters);
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch auctions');
      }
      const data = result.data;
      const normalizeAuction = (auction: AuctionListingType) => ({
        ...auction,
        status: auction.status as AUCTION_STATUS,
        startTime: auction.startTime instanceof Date ? auction.startTime.toISOString() : String(auction.startTime),
        endTime: auction.endTime instanceof Date ? auction.endTime.toISOString() : String(auction.endTime),
        extendedEndTime: auction.extendedEndTime instanceof Date
          ? auction.extendedEndTime.toISOString()
          : auction.extendedEndTime ? String(auction.extendedEndTime) : null,
        createdAt: auction.createdAt instanceof Date ? auction.createdAt.toISOString() : String(auction.createdAt),
        updatedAt: auction.updatedAt instanceof Date ? auction.updatedAt.toISOString() : String(auction.updatedAt),
        asset: auction.asset
          ? {
              ...auction.asset,
              estimatedValue: auction.asset.estimatedValue ?? undefined,
            }
          : null,
        bids: auction.bids?.map((bid) => ({
          ...bid,
          status: bid.status as BID_STATUS,
          placedAt: bid.placedAt instanceof Date ? bid.placedAt.toISOString() : String(bid.placedAt),
        })),
      });
      return {
        ...data,
        auctions: data.auctions.map(normalizeAuction),
      };
    },
  });
}

/**
 * Get active auctions (public view)
 */
export function useActiveAuctions(filters: Pick<AuctionListFilters, 'category' | 'search' | 'page' | 'limit'> = {}) {
  return useQuery({
    queryKey: auctionKeys.active(),
    queryFn: async (): Promise<AuctionListResponse> => {
      const result = await auctionsAdapter.list({ ...filters, status: AUCTION_STATUS.ACTIVE });
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch active auctions');
      }
      const data = result.data;
      const normalizeAuction = (auction: AuctionListingType) => ({
        ...auction,
        status: auction.status as AUCTION_STATUS,
        startTime: auction.startTime instanceof Date ? auction.startTime.toISOString() : String(auction.startTime),
        endTime: auction.endTime instanceof Date ? auction.endTime.toISOString() : String(auction.endTime),
        extendedEndTime: auction.extendedEndTime instanceof Date
          ? auction.extendedEndTime.toISOString()
          : auction.extendedEndTime ? String(auction.extendedEndTime) : null,
        createdAt: auction.createdAt instanceof Date ? auction.createdAt.toISOString() : String(auction.createdAt),
        updatedAt: auction.updatedAt instanceof Date ? auction.updatedAt.toISOString() : String(auction.updatedAt),
        asset: auction.asset
          ? {
              ...auction.asset,
              estimatedValue: auction.asset.estimatedValue ?? undefined,
            }
          : null,
        bids: auction.bids?.map((bid) => ({
          ...bid,
          status: bid.status as BID_STATUS,
          placedAt: bid.placedAt instanceof Date ? bid.placedAt.toISOString() : String(bid.placedAt),
        })),
      });
      return {
        ...data,
        auctions: data.auctions.map(normalizeAuction),
      };
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get auction by ID
 */
export function useAuction(id: string) {
  return useQuery({
    queryKey: auctionKeys.detail(id),
    queryFn: async () => {
      const result = await auctionsAdapter.getById(id);
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch auction');
      }
      return result.data;
    },
    enabled: !!id,
  });
}

/**
 * Get my bids
 */
export function useMyBids(filters: MyBidsFilters = {}) {
  return useQuery({
    queryKey: auctionKeys.myBids(),
    queryFn: async (): Promise<MyBidsResponse> => {
      const result = await auctionsAdapter.getMyBids(filters);
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch my bids');
      }
      return result.data;
    },
  });
}

// Continue reading from here to update placeBid mutation
export function usePlaceBid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ auctionId, payload }: { auctionId: string; payload: PlaceBidPayload }) => {
      const result = await auctionsAdapter.placeBid(auctionId, payload);
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to place bid');
      }
      return result.data;
    },
    onSuccess: (_, { auctionId }) => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
      queryClient.invalidateQueries({ queryKey: auctionKeys.myBids() });
    },
  });
}

export function useEndExpiredAuctions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<EndExpiredResponse> => {
      const result = await auctionsAdapter.endExpired();
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to end expired auctions');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
    },
  });
}

/**
 * Get bid history for an auction
 */
export function useAuctionBids(auctionId: string) {
  return useQuery({
    queryKey: auctionKeys.bids(auctionId),
    queryFn: async () => {
      const result = await auctionsAdapter.getBidHistory(auctionId);
      if (!result.ok) {
        throw new Error(result.error.message || 'Failed to fetch auction bids');
      }
      return result.data;
    },
    enabled: !!auctionId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new auction
 */
export function useCreateAuction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (payload: CreateAuctionPayload): Promise<AuctionListing> => {
      // TODO: (agent) Add create to auctionsAdapter
      const result = { success: true, data: {} as AuctionListing } // Placeholder
      if (!result.success) {
        throw new Error('Failed to create auction')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() })
    },
  })
}

// Duplicate usePlaceBid removed - already defined above at line 223

/**
 * Buy Now - instant purchase
 */
export function useBuyNow(auctionId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (): Promise<{ auction: AuctionListing; finalPrice: number }> => {
      // TODO: (agent) Add buyNow to auctionsAdapter
      const result = { success: true, data: { auction: {} as AuctionListing, finalPrice: 0 } } // Placeholder
      if (!result.success) {
        throw new Error('Failed to buy now')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) })
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: auctionKeys.active() })
    },
  })
}

/**
 * Cancel an auction (admin only)
 */
export function useCancelAuction(auctionId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (reason?: string): Promise<void> => {
      // TODO: (agent) Add cancel to auctionsAdapter
      const result = { success: true, data: {} } // Placeholder
      if (!result.success) {
        throw new Error('Failed to cancel auction')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) })
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: auctionKeys.active() })
    },
  })
}

// Duplicate useEndExpiredAuctions removed - already defined above at line 241

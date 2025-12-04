/**
 * Auction React Query Hooks
 * Provides hooks for auction listing, bidding, and lifecycle management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWithResult, postWithResult, putWithResult } from '@/lib/api-client'
import { AUCTION_STATUS, BID_STATUS } from '@fundifyhub/types'

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
  bidder: AuctionBidder
  isAutoBid: boolean
}

export interface AuctionAsset {
  id: string
  assetNumber: string
  category: string
  subcategory: string | null
  metalType: string | null
  purity: string | null
  grossWeight: number | null
  netWeight: number | null
  estimatedValue: number
  description: string | null
  photos: string[]
  warehouse: {
    id: string
    name: string
    district: {
      id: string
      name: string
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
  extensionMinutes: number
  totalBids: number
  viewCount: number
  asset: AuctionAsset
  bids: AuctionBid[]
  winner: AuctionBidder | null
  winnerId: string | null
  finalPrice: number | null
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
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

export interface PlaceBidPayload {
  amount: number
  maxAutoBid?: number
}

export interface PlaceBidResponse {
  bid: AuctionBid
  currentHighBid: number
  totalBids: number
  wasExtended: boolean
  extendedEndTime: string | null
}

interface AuctionListResponse {
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

interface MyBidsResponse {
  bids: (AuctionBid & { auction: AuctionListing })[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface EndExpiredResponse {
  processed: number
  sold: number
  unsold: number
  errors: number
}

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
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.districtId) params.append('districtId', filters.districtId)
      if (filters.warehouseId) params.append('warehouseId', filters.warehouseId)
      if (filters.category) params.append('category', filters.category)
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString())
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString())
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const queryString = params.toString()
      const url = `/auctions${queryString ? `?${queryString}` : ''}`
      
      const result = await getWithResult<AuctionListResponse>(url)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.data
    },
  })
}

/**
 * Get active auctions (public view)
 */
export function useActiveAuctions(filters: Pick<AuctionListFilters, 'category' | 'search' | 'page' | 'limit'> = {}) {
  return useQuery({
    queryKey: auctionKeys.active(),
    queryFn: async (): Promise<AuctionListResponse> => {
      const params = new URLSearchParams()
      if (filters.category) params.append('category', filters.category)
      if (filters.search) params.append('search', filters.search)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const queryString = params.toString()
      const url = `/auctions/active${queryString ? `?${queryString}` : ''}`
      
      const result = await getWithResult<AuctionListResponse>(url)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds for active auctions
  })
}

/**
 * Get auction by ID
 */
export function useAuction(id: string) {
  return useQuery({
    queryKey: auctionKeys.detail(id),
    queryFn: async (): Promise<AuctionListing> => {
      const result = await getWithResult<AuctionListing>(`/auctions/${id}`)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Refetch more frequently for active auctions
      const data = query.state.data as AuctionListing | undefined
      if (data?.status === AUCTION_STATUS.ACTIVE || data?.status === AUCTION_STATUS.EXTENDED) {
        return 5000 // 5 seconds
      }
      return false
    },
  })
}

/**
 * Get bid history for an auction
 */
export function useAuctionBids(auctionId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: auctionKeys.bids(auctionId),
    queryFn: async (): Promise<BidListResponse> => {
      const result = await getWithResult<BidListResponse>(
        `/auctions/${auctionId}/bids?page=${page}&limit=${limit}`
      )
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!auctionId,
  })
}

/**
 * Get current user's bid history
 */
export function useMyBids(filters: { status?: BID_STATUS; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: auctionKeys.myBids(),
    queryFn: async (): Promise<MyBidsResponse> => {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const queryString = params.toString()
      const url = `/auctions/my-bids${queryString ? `?${queryString}` : ''}`
      
      const result = await getWithResult<MyBidsResponse>(url)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.data
    },
  })
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
      const result = await postWithResult<AuctionListing, CreateAuctionPayload>('/auctions', payload)
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() })
    },
  })
}

/**
 * Place a bid on an auction
 */
export function usePlaceBid(auctionId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (payload: PlaceBidPayload): Promise<PlaceBidResponse> => {
      const result = await postWithResult<PlaceBidResponse, PlaceBidPayload>(
        `/auctions/${auctionId}/bid`,
        payload
      )
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) })
      queryClient.invalidateQueries({ queryKey: auctionKeys.bids(auctionId) })
      queryClient.invalidateQueries({ queryKey: auctionKeys.myBids() })
      queryClient.invalidateQueries({ queryKey: auctionKeys.active() })
    },
  })
}

/**
 * Buy Now - instant purchase
 */
export function useBuyNow(auctionId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (): Promise<{ auction: AuctionListing; finalPrice: number }> => {
      const result = await postWithResult<{ auction: AuctionListing; finalPrice: number }>(
        `/auctions/${auctionId}/buy-now`
      )
      if (!result.ok) {
        throw new Error(result.error.message)
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
      const result = await putWithResult<void, { reason?: string }>(
        `/auctions/${auctionId}/cancel`,
        { reason }
      )
      if (!result.ok) {
        throw new Error(result.error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) })
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() })
      queryClient.invalidateQueries({ queryKey: auctionKeys.active() })
    },
  })
}

/**
 * End expired auctions (cron job trigger)
 */
export function useEndExpiredAuctions() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (): Promise<EndExpiredResponse> => {
      const result = await postWithResult<EndExpiredResponse>('/auctions/end-expired')
      if (!result.ok) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.all })
    },
  })
}

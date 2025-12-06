/**
 * Hook for the Auctions page
 */
import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAuctions, useActiveAuctions, useEndExpiredAuctions, AuctionListing } from '@/hooks/queries/useAuctions'
import {
  AUCTION_STATUS,
  AUCTION_STATUS_LABELS,
  AUCTION_STATUS_COLORS,
  ROLES,
} from '@fundifyhub/types'
import { useToast } from '@/hooks/use-toast'

export function useAuctionsPage() {
  const { user } = useAuth()
  const { toast, error: toastError } = useToast()
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<AUCTION_STATUS | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const isAdmin = user?.roles?.some(
    (role) => role === ROLES.SUPER_ADMIN || role === ROLES.DISTRICT_ADMIN
  )

  // Queries
  const {
    data: activeAuctionsData,
    isLoading: loadingActive,
    error: activeError,
    refetch: refetchActive,
  } = useActiveAuctions({
    search: searchQuery || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  })

  const {
    data: allAuctionsData,
    isLoading: loadingAll,
    error: allError,
    refetch: refetchAll,
  } = useAuctions({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  })

  const endExpiredMutation = useEndExpiredAuctions()

  const handleEndExpired = async () => {
    try {
      const result = await endExpiredMutation.mutateAsync()
      toast(`Expired auctions processed: ${result.processed} (Sold: ${result.sold}, Unsold: ${result.unsold})`)
      refetchActive()
      refetchAll()
    } catch {
      toastError('Failed to process expired auctions')
    }
  }

  // Stats for active auctions
  const activeStats = useMemo(() => {
    if (!activeAuctionsData?.auctions) {
      return { total: 0, totalBids: 0, highestBid: 0 }
    }
    const auctions = activeAuctionsData.auctions
    return {
      total: auctions.length,
      totalBids: auctions.reduce((sum: number, a: AuctionListing) => sum + a.totalBids, 0),
      highestBid: Math.max(...auctions.map((a: AuctionListing) => a.currentHighBid || 0), 0),
    }
  }, [activeAuctionsData])

  return {
    user,
    isAdmin,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    activeAuctionsData,
    loadingActive,
    activeError,
    refetchActive,
    allAuctionsData,
    loadingAll,
    allError,
    refetchAll,
    endExpiredMutation,
    handleEndExpired,
    activeStats,
  }
}

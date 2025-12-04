'use client'

/**
 * Auctions Page
 * Displays auction listings for bidding and management
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
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

// Icons
import {
  Gavel,
  Search,
  Clock,
  Users,
  Eye,
  ArrowUpRight,
  Timer,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react'

export default function AuctionsPage() {
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

  // Time remaining helper
  const getTimeRemaining = (endTime: string, extendedEndTime?: string | null) => {
    const end = new Date(extendedEndTime || endTime)
    const now = new Date()
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'Ended'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  // Render status badge
  const renderStatusBadge = (status: AUCTION_STATUS) => {
    const colors = AUCTION_STATUS_COLORS[status]
    return (
      <Badge className={`${colors.bg} ${colors.text} border ${colors.border}`}>
        {AUCTION_STATUS_LABELS[status]}
      </Badge>
    )
  }

  // Loading skeleton
  if (loadingActive && activeTab === 'active') {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gavel className="h-8 w-8" />
            Auctions
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and bid on asset auctions
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={handleEndExpired} disabled={endExpiredMutation.isPending}>
                <RefreshCw className={`h-4 w-4 mr-2 ${endExpiredMutation.isPending ? 'animate-spin' : ''}`} />
                End Expired
              </Button>
              <Button asChild>
                <Link href="/auctions/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Auction
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Auctions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{activeStats.total}</span>
              <Gavel className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bids
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{activeStats.totalBids}</span>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highest Current Bid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {formatCurrency(activeStats.highestBid)}
              </span>
              <ArrowUpRight className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'all')}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Active Auctions
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                All Auctions
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search auctions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
              </SelectContent>
            </Select>

            {activeTab === 'all' && isAdmin && (
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AUCTION_STATUS | 'all')}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.values(AUCTION_STATUS).map((status) => (
                    <SelectItem key={status} value={status}>
                      {AUCTION_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Active Auctions Tab */}
        <TabsContent value="active" className="mt-6">
          {activeError ? (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle className="text-lg">Failed to load auctions</CardTitle>
              <CardDescription className="mt-2">
                Please try again later
              </CardDescription>
              <Button variant="outline" onClick={() => refetchActive()} className="mt-4">
                Retry
              </Button>
            </Card>
          ) : activeAuctionsData?.auctions.length === 0 ? (
            <Card className="p-8 text-center">
              <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-lg">No Active Auctions</CardTitle>
              <CardDescription className="mt-2">
                There are no auctions currently open for bidding
              </CardDescription>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeAuctionsData?.auctions.map((auction: AuctionListing) => (
                <Card key={auction.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Asset Photo */}
                  {auction.asset.photos?.[0] && (
                    <div className="relative h-48 bg-muted">
                      <img
                        src={auction.asset.photos[0]}
                        alt={auction.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        {renderStatusBadge(auction.status)}
                      </div>
                    </div>
                  )}

                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg line-clamp-1">
                          {auction.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {auction.listingNumber}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Asset Details */}
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{auction.asset.category}</span>
                      {auction.asset.metalType && ` • ${auction.asset.metalType}`}
                      {auction.asset.netWeight && ` • ${auction.asset.netWeight}g`}
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Current Bid</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(auction.currentHighBid || auction.startingBid)}
                        </p>
                      </div>
                      {auction.buyNowPrice && (
                        <div>
                          <p className="text-xs text-muted-foreground">Buy Now</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(auction.buyNowPrice)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Time & Bids */}
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{getTimeRemaining(auction.endTime, auction.extendedEndTime)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{auction.totalBids} bids</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button asChild className="w-full">
                      <Link href={`/auctions/${auction.id}`}>
                        View Auction
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Auctions Tab (Admin) */}
        {isAdmin && (
          <TabsContent value="all" className="mt-6">
            {loadingAll ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : allError ? (
              <Card className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <CardTitle className="text-lg">Failed to load auctions</CardTitle>
                <Button variant="outline" onClick={() => refetchAll()} className="mt-4">
                  Retry
                </Button>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Current Bid</TableHead>
                      <TableHead className="text-right">Reserve</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead className="text-right">Bids</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allAuctionsData?.auctions.map((auction: AuctionListing) => (
                      <TableRow key={auction.id}>
                        <TableCell className="font-mono text-sm">
                          {auction.listingNumber}
                        </TableCell>
                        <TableCell className="font-medium max-w-48 truncate">
                          {auction.title}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {auction.asset.assetNumber}
                        </TableCell>
                        <TableCell>{renderStatusBadge(auction.status)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(auction.currentHighBid || auction.startingBid)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(auction.reservePrice)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(auction.extendedEndTime || auction.endTime)}
                        </TableCell>
                        <TableCell className="text-right">{auction.totalBids}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/auctions/${auction.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

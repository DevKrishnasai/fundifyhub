'use client'

/**
 * Auctions Page
 * Displays auction listings for bidding and management
 */

import { useAuctionsPage } from '@/hooks/useAuctionsPage'
import {
  AUCTION_STATUS,
  AUCTION_STATUS_LABELS,
} from '@fundifyhub/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

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

// Feature Components
import { AuctionList } from '@/components/features/auctions/AuctionList'

// Icons
import {
  Gavel,
  Search,
  Timer,
  Eye,
  RefreshCw,
  Plus,
  AlertCircle,
} from 'lucide-react'

export default function AuctionsPage() {
  const {
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
  } = useAuctionsPage()

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
        {/* Stats cards remain the same */}
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
            <AuctionList auctions={activeAuctionsData?.auctions || []} />
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
                    {allAuctionsData?.auctions.map((auction) => (
                      <TableRow key={auction.id}>
                        <TableCell className="font-mono text-sm">
                          {auction.listingNumber}
                        </TableCell>
                        <TableCell className="font-medium max-w-48 truncate">
                          {auction.title}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {auction.asset?.assetNumber ?? 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge>
                            {auction.status}
                          </Badge>
                        </TableCell>
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

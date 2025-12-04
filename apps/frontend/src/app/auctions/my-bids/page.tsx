'use client'

/**
 * My Bids Page
 * Displays all bids placed by the current user with their status
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useMyBids } from '@/hooks/queries/useAuctions'
import { BID_STATUS, AUCTION_STATUS, AUCTION_STATUS_LABELS, AUCTION_STATUS_COLORS } from '@fundifyhub/types'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'

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
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Icons
import {
  Gavel,
  ArrowLeft,
  Clock,
  TrendingUp,
  Crown,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  History,
  Filter,
} from 'lucide-react'

const BID_STATUS_CONFIG: Record<BID_STATUS, { label: string; color: string; icon: React.ElementType }> = {
  [BID_STATUS.ACTIVE]: { label: 'Active', color: 'bg-green-100 text-green-800', icon: TrendingUp },
  [BID_STATUS.OUTBID]: { label: 'Outbid', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  [BID_STATUS.WINNING]: { label: 'Winning', color: 'bg-emerald-100 text-emerald-800', icon: TrendingUp },
  [BID_STATUS.WON]: { label: 'Won', color: 'bg-blue-100 text-blue-800', icon: Crown },
  [BID_STATUS.WITHDRAWN]: { label: 'Withdrawn', color: 'bg-orange-100 text-orange-800', icon: X },
  [BID_STATUS.REJECTED]: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: X },
  [BID_STATUS.CANCELLED]: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: X },
}

export default function MyBidsPage() {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const [selectedStatus, setSelectedStatus] = useState<BID_STATUS | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, error } = useMyBids({
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    page,
    limit,
  })

  if (!isLoggedIn) {
    router.push('/login')
    return null
  }

  // Stats calculation
  const stats = {
    totalBids: data?.pagination?.total || 0,
    activeBids: data?.bids?.filter(b => b.status === BID_STATUS.ACTIVE).length || 0,
    wonBids: data?.bids?.filter(b => b.status === BID_STATUS.WON).length || 0,
    totalSpent: data?.bids
      ?.filter(b => b.status === BID_STATUS.WON)
      .reduce((sum, b) => sum + b.amount, 0) || 0,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/auctions')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            My Bids
          </h1>
          <p className="text-muted-foreground">
            Track all your auction bids and their status
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bids</p>
                <p className="text-2xl font-bold">{stats.totalBids}</p>
              </div>
              <Gavel className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Bids</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeBids}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won Auctions</p>
                <p className="text-2xl font-bold text-blue-600">{stats.wonBids}</p>
              </div>
              <Crown className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                setSelectedStatus(value as BID_STATUS | 'ALL')
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Bids</SelectItem>
                {Object.entries(BID_STATUS_CONFIG).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bids Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bid History</CardTitle>
          <CardDescription>
            All bids you&apos;ve placed on auctions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground">Failed to load your bids</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : !data?.bids?.length ? (
            <div className="text-center py-12">
              <Gavel className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bids yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven&apos;t placed any bids on auctions.
              </p>
              <Button asChild>
                <Link href="/auctions">
                  Browse Auctions
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auction</TableHead>
                    <TableHead>Your Bid</TableHead>
                    <TableHead>Current High</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auction Status</TableHead>
                    <TableHead>Placed At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bids.map((bid) => {
                    const statusConfig = BID_STATUS_CONFIG[bid.status]
                    const StatusIcon = statusConfig.icon
                    const isHighestBidder = bid.auction.currentHighBid === bid.amount

                    return (
                      <TableRow key={bid.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {bid.auction.title}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {bid.auction.listingNumber}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">
                              {formatCurrency(bid.amount)}
                            </span>
                            {isHighestBidder && bid.status === BID_STATUS.ACTIVE && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(bid.auction.currentHighBid || bid.auction.startingBid)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('flex items-center gap-1 w-fit', statusConfig.color)}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              AUCTION_STATUS_COLORS[bid.auction.status as AUCTION_STATUS]
                            )}
                          >
                            {AUCTION_STATUS_LABELS[bid.auction.status as AUCTION_STATUS]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(bid.placedAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link href={`/auctions/${bid.auction.id}`}>
                              View
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.pagination && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} bids
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

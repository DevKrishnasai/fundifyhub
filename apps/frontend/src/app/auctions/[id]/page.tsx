'use client'

/**
 * Auction Detail Page
 * Displays auction details, asset info, bid history, and bidding interface
 * Includes real-time updates via Socket.IO
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useSocket } from '@/contexts/SocketContext'
import { 
  useAuction, 
  useAuctionBids, 
  usePlaceBid, 
  useBuyNow, 
  useCancelAuction,
  type AuctionBid 
} from '@/hooks/queries/useAuctions'
import {
  AUCTION_STATUS,
  AUCTION_STATUS_LABELS,
  AUCTION_STATUS_COLORS,
  BID_STATUS,
  ROLES,
  ServerEvent,
  ClientEvent,
  type AssetType,
  type AuctionBidPayload,
  type AuctionEndedPayload,
  type AuctionOutbidPayload,
} from '@fundifyhub/types'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'

// Icons
import {
  Gavel,
  Clock,
  Users,
  ArrowLeft,
  Package,
  MapPin,
  Tag,
  Scale,
  AlertCircle,
  Check,
  X,
  Timer,
  TrendingUp,
  Crown,
  ShoppingCart,
  History,
  Eye,
  ChevronRight,
  Ban,
  Loader2,
} from 'lucide-react'

export default function AuctionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast, error: toastError } = useToast()
  const { socket, isConnected, subscribe, unsubscribe } = useSocket()
  const auctionId = params.id as string

  // State
  const [bidAmount, setBidAmount] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [showBuyNowDialog, setShowBuyNowDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  // Queries
  const { data: auction, isLoading, error, refetch } = useAuction(auctionId)
  const { data: bidsData, isLoading: loadingBids, refetch: refetchBids } = useAuctionBids(auctionId)

  // Mutations
  const placeBidMutation = usePlaceBid()
  const buyNowMutation = useBuyNow(auctionId)
  const cancelMutation = useCancelAuction(auctionId)

  const isAdmin = user?.roles?.some(
    (role) => role === ROLES.SUPER_ADMIN || role === ROLES.DISTRICT_ADMIN
  )

  const isAuctionActive = auction?.status === AUCTION_STATUS.ACTIVE || 
                          auction?.status === AUCTION_STATUS.EXTENDED

  const currentHighBid = auction?.currentHighBid || auction?.startingBid || 0
  const minBidAmount = currentHighBid + (auction?.bidIncrement || 0)

  const isUserHighestBidder = useMemo(() => {
    if (!auction?.bids?.length || !user) return false
    const highestBid = auction.bids.reduce((max: typeof auction.bids[0], bid: typeof auction.bids[0]) => 
      bid.amount > max.amount ? bid : max, auction.bids[0])
    return highestBid?.bidder?.id === user.id
  }, [auction?.bids, user])

  // Socket.IO: Join/Leave auction room for real-time updates
  useEffect(() => {
    if (!socket || !auctionId) return

    // Join auction room
    socket.emit(ClientEvent.JOIN_AUCTION, auctionId)

    return () => {
      // Leave auction room on cleanup
      socket.emit(ClientEvent.LEAVE_AUCTION, auctionId)
    }
  }, [socket, auctionId])

  // Socket.IO: Handle real-time bid updates
  const handleBidUpdate = useCallback((data: AuctionBidPayload) => {
    if (data.auctionId !== auctionId) return
    
    // Refetch auction data to get updated bid info
    refetch()
    refetchBids()
    
    // Show toast for new bids (except own bids)
    if (data.bid.bidderId !== user?.id) {
      toast(`New bid: ${formatCurrency(data.bid.amount)} by ${data.bid.bidderName}`)
    }
    
    // Notify about time extension
    if (data.wasExtended && data.extendedEndTime) {
      toast('⏰ Auction time extended!')
    }
  }, [auctionId, user?.id, refetch, refetchBids, toast])

  // Socket.IO: Handle outbid notification
  const handleOutbid = useCallback((data: AuctionOutbidPayload) => {
    if (data.auctionId !== auctionId) return
    toastError(`You've been outbid! New high bid: ${formatCurrency(data.newHighBid)}`)
  }, [auctionId, toastError])

  // Socket.IO: Handle auction ended
  const handleAuctionEnded = useCallback((data: AuctionEndedPayload) => {
    if (data.auctionId !== auctionId) return
    refetch()
    
    if (data.winnerId === user?.id) {
      toast(`🎉 Congratulations! You won the auction for ${formatCurrency(data.finalPrice || 0)}!`)
    } else if (data.status === 'SOLD') {
      toast(`Auction ended. Winner: ${data.winnerName}`)
    } else {
      toast(`Auction ended: ${data.status}`)
    }
  }, [auctionId, user?.id, refetch, toast])

  // Subscribe to socket events
  useEffect(() => {
    subscribe(ServerEvent.AUCTION_BID_PLACED, handleBidUpdate)
    subscribe(ServerEvent.AUCTION_OUTBID, handleOutbid)
    subscribe(ServerEvent.AUCTION_ENDED, handleAuctionEnded)

    return () => {
      unsubscribe(ServerEvent.AUCTION_BID_PLACED, handleBidUpdate)
      unsubscribe(ServerEvent.AUCTION_OUTBID, handleOutbid)
      unsubscribe(ServerEvent.AUCTION_ENDED, handleAuctionEnded)
    }
  }, [subscribe, unsubscribe, handleBidUpdate, handleOutbid, handleAuctionEnded])

  // Update time remaining countdown
  useEffect(() => {
    if (!auction) return

    const updateTimer = () => {
      const endTime = new Date(auction.extendedEndTime || auction.endTime)
      const now = new Date()
      const diff = endTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('Ended')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [auction])

  // Handlers
  const handlePlaceBid = async () => {
    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount < minBidAmount) {
      toastError(`Minimum bid amount is ${formatCurrency(minBidAmount)}`)
      return
    }

    try {
      const result = await placeBidMutation.mutateAsync({ 
        auctionId, 
        payload: { amount } 
      })
      toast(`Bid placed successfully! Current high bid: ${formatCurrency(result.currentHighBid)}`)
      setBidAmount('')
      if (result.wasExtended) {
        toast('Auction time extended!')
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to place bid')
    }
  }

  const handleBuyNow = async () => {
    try {
      const result = await buyNowMutation.mutateAsync()
      toast(`Congratulations! You purchased this item for ${formatCurrency(result.finalPrice)}`)
      setShowBuyNowDialog(false)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to buy now')
    }
  }

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(cancelReason || undefined)
      toast('Auction cancelled successfully')
      setShowCancelDialog(false)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to cancel auction')
    }
  }

  // Render status badge
  const renderStatusBadge = (status: AUCTION_STATUS) => {
    const colors = AUCTION_STATUS_COLORS[status]
    return (
      <Badge className={`${colors.bg} ${colors.text} border ${colors.border} text-sm px-3 py-1`}>
        {AUCTION_STATUS_LABELS[status]}
      </Badge>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !auction) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-lg">Auction Not Found</CardTitle>
          <CardDescription className="mt-2">
            This auction may have been removed or does not exist.
          </CardDescription>
          <Button variant="outline" onClick={() => router.push('/auctions')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Auctions
          </Button>
        </Card>
      </div>
    )
  }

  const assetPhotos = (auction.asset as { photos?: string[] } | undefined)?.photos ?? []
  const assetDetails = auction.asset as (AssetType & {
    assetNumber?: string
    category?: string
    subcategory?: string
    metalType?: string
    purity?: string
    grossWeight?: number
    netWeight?: number
    description?: string
    warehouse?: { name?: string; district?: { name?: string } }
  }) | undefined

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{auction.title}</h1>
              {renderStatusBadge(auction.status as AUCTION_STATUS)}
            </div>
            <p className="text-muted-foreground font-mono text-sm">
              {auction.listingNumber}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && isAuctionActive && (
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel Auction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cancel Auction</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. All bids will be cancelled.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (optional)</Label>
                    <Input
                      id="reason"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Enter cancellation reason..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                    Keep Auction
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Cancel Auction
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Asset Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Photos */}
          <Card>
            <CardContent className="p-0">
              {assetPhotos.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4">
                  <div className="md:col-span-2 relative h-80">
                    <Image
                      src={assetPhotos[0]}
                      alt={auction.title}
                      fill
                      className="object-cover rounded-lg"
                      sizes="(max-width: 768px) 100vw, 66vw"
                      priority
                    />
                  </div>
                  {assetPhotos.slice(1, 5).map((photo: string, idx: number) => (
                    <div key={idx} className="relative h-40">
                      <Image
                        src={photo}
                        alt={`${auction.title} - ${idx + 2}`}
                        fill
                        className="object-cover rounded-lg"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center bg-muted rounded-lg m-4">
                  <Package className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Asset Details Card */}
          {auction.asset ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asset Details
                </CardTitle>
                <CardDescription>
                  Asset Number: {assetDetails?.assetNumber ?? 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{assetDetails?.category ?? 'N/A'}</p>
                  </div>
                    {assetDetails?.subcategory && (
                    <div>
                      <p className="text-sm text-muted-foreground">Subcategory</p>
                        <p className="font-medium">{assetDetails.subcategory}</p>
                    </div>
                  )}
                    {assetDetails?.metalType && (
                    <div>
                      <p className="text-sm text-muted-foreground">Metal Type</p>
                        <p className="font-medium">{assetDetails.metalType}</p>
                    </div>
                  )}
                    {assetDetails?.purity && (
                    <div>
                      <p className="text-sm text-muted-foreground">Purity</p>
                        <p className="font-medium">{assetDetails.purity}</p>
                    </div>
                  )}
                    {assetDetails?.grossWeight && (
                    <div>
                      <p className="text-sm text-muted-foreground">Gross Weight</p>
                        <p className="font-medium">{assetDetails.grossWeight}g</p>
                    </div>
                  )}
                    {assetDetails?.netWeight && (
                    <div>
                      <p className="text-sm text-muted-foreground">Net Weight</p>
                        <p className="font-medium">{assetDetails.netWeight}g</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Value</p>
                      <p className="font-medium">{formatCurrency(assetDetails?.estimatedValue ?? 0)}</p>
                  </div>
                </div>

                  {assetDetails?.description && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p className="text-sm">{assetDetails.description}</p>
                  </div>
                )}

                  {assetDetails?.warehouse && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">
                          {assetDetails.warehouse?.name}, {assetDetails.warehouse?.district?.name}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asset Details Unavailable
                </CardTitle>
                <CardDescription>Asset information could not be loaded.</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Auction Description */}
          {auction.description && (
            <Card>
              <CardHeader>
                <CardTitle>Auction Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {auction.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bid History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Bid History
              </CardTitle>
              <CardDescription>
                {auction.totalBids} total bids
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBids ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : bidsData && bidsData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bidder</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bidsData.map((bid, index: number) => {
                      const bidStatus = bid.status as BID_STATUS
                      const bidderName = bid.bidder
                        ? `${bid.bidder.firstName} ${bid.bidder.lastName?.[0] ?? ''}.`
                        : 'Unknown bidder'

                      return (
                        <TableRow 
                          key={bid.id}
                          className={cn(
                            index === 0 && bidStatus === BID_STATUS.WINNING && 'bg-green-50 dark:bg-green-900/20'
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {index === 0 && bidStatus === BID_STATUS.WINNING && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                              <span className="font-medium">
                                {bidderName}
                              </span>
                              {bid.isAutoBid && (
                                <Badge variant="secondary" className="text-xs">Auto</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(bid.amount)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(bid.placedAt)}
                          </TableCell>
                          <TableCell>
                            {bidStatus === BID_STATUS.WINNING && (
                              <Badge className="bg-green-100 text-green-700">Highest</Badge>
                            )}
                            {bidStatus === BID_STATUS.OUTBID && (
                              <Badge variant="secondary">Outbid</Badge>
                            )}
                            {bidStatus === BID_STATUS.WON && (
                              <Badge className="bg-yellow-100 text-yellow-700">Won</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bids yet. Be the first to bid!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Bidding Interface */}
        <div className="space-y-6">
          {/* Auction Timer Card */}
          <Card className={cn(
            isAuctionActive && 'border-primary',
            auction.status === AUCTION_STATUS.ENDED && 'border-orange-500',
            auction.status === AUCTION_STATUS.SOLD && 'border-green-500'
          )}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  {isAuctionActive ? 'Time Remaining' : 'Auction Status'}
                </span>
                {auction.extendedEndTime && (
                  <Badge variant="outline" className="text-xs">Extended</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {isAuctionActive ? (
                  <>
                    <p className={cn(
                      "text-4xl font-bold tabular-nums",
                      timeRemaining.includes('m ') && !timeRemaining.includes('h') && "text-orange-500",
                      timeRemaining === 'Ended' && "text-red-500"
                    )}>
                      {timeRemaining}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Ends: {formatDateTime(auction.extendedEndTime || auction.endTime)}
                    </p>
                  </>
                ) : (
                  <div>
                    <p className="text-2xl font-bold mb-2">
                      {AUCTION_STATUS_LABELS[auction.status as AUCTION_STATUS]}
                    </p>
                    {auction.winner && (
                      <p className="text-sm text-muted-foreground">
                        Won by: {auction.winner.firstName} {auction.winner.lastName}
                      </p>
                    )}
                    {auction.finalPrice && (
                      <p className="text-lg font-bold text-green-600 mt-2">
                        Final: {formatCurrency(auction.finalPrice)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Bid Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Current Bid
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4 bg-muted/50 rounded-lg">
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(currentHighBid)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {auction.totalBids} bid{auction.totalBids !== 1 ? 's' : ''}
                </p>
                {isUserHighestBidder && isAuctionActive && (
                  <Badge className="mt-2 bg-green-100 text-green-700">
                    <Check className="h-3 w-3 mr-1" />
                    You're the highest bidder!
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Starting Bid</p>
                  <p className="font-medium">{formatCurrency(auction.startingBid)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bid Increment</p>
                  <p className="font-medium">{formatCurrency(auction.bidIncrement)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reserve Price</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="font-medium flex items-center gap-1">
                          {currentHighBid >= auction.reservePrice ? (
                            <>
                              <Check className="h-4 w-4 text-green-500" />
                              Reserve Met
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 text-red-500" />
                              Reserve Not Met
                            </>
                          )}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isAdmin ? formatCurrency(auction.reservePrice) : 'Hidden'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div>
                  <p className="text-muted-foreground">View Count</p>
                  <p className="font-medium flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {(auction as { viewCount?: number }).viewCount ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Place Bid Card */}
          {isAuctionActive && user && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Place Your Bid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bidAmount">Bid Amount (₹)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bidAmount"
                      type="number"
                      min={minBidAmount}
                      step={auction.bidIncrement}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={formatCurrency(minBidAmount)}
                      className="text-lg"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum bid: {formatCurrency(minBidAmount)}
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handlePlaceBid}
                  disabled={placeBidMutation.isPending || !bidAmount}
                >
                  {placeBidMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Placing Bid...
                    </>
                  ) : (
                    <>
                      <Gavel className="h-4 w-4 mr-2" />
                      Place Bid
                    </>
                  )}
                </Button>

                {/* Quick Bid Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 5].map((multiplier) => {
                    const quickBid = minBidAmount + (auction.bidIncrement * (multiplier - 1))
                    return (
                      <Button
                        key={multiplier}
                        variant="outline"
                        size="sm"
                        onClick={() => setBidAmount(quickBid.toString())}
                      >
                        {formatCurrency(quickBid)}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Buy Now Card */}
          {auction.buyNowPrice && isAuctionActive && user && (
            <Card className="border-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <ShoppingCart className="h-5 w-5" />
                  Buy Now
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-2">
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(auction.buyNowPrice)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Skip the auction - buy instantly!
                  </p>
                </div>

                <Dialog open={showBuyNowDialog} onOpenChange={setShowBuyNowDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy Now for {formatCurrency(auction.buyNowPrice)}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Purchase</DialogTitle>
                      <DialogDescription>
                        You are about to purchase this item for {formatCurrency(auction.buyNowPrice)}.
                        This action will end the auction immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        {assetPhotos[0] && (
                          <div className="relative w-20 h-20 shrink-0">
                            <Image
                              src={assetPhotos[0]}
                              alt={auction.title}
                              fill
                              className="object-cover rounded"
                              sizes="80px"
                            />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{auction.title}</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(auction.buyNowPrice)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowBuyNowDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleBuyNow}
                        disabled={buyNowMutation.isPending}
                      >
                        {buyNowMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Confirm Purchase
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Login Prompt */}
          {isAuctionActive && !user && (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <Gavel className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Want to place a bid?</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in to start bidding on this auction.
                </p>
                <Button asChild>
                  <Link href="/login">
                    Sign In to Bid
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Auction Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Auction Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDateTime(auction.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Time</span>
                <span>{formatDateTime(auction.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Time</span>
                <span>{formatDateTime(auction.endTime)}</span>
              </div>
              {auction.extendedEndTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extended To</span>
                  <span className="text-orange-500">{formatDateTime(auction.extendedEndTime)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Extension Time</span>
                <span>{(auction as { extensionMinutes?: number }).extensionMinutes ?? 0} minutes</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Listed By</span>
                <span>{auction.createdBy?.firstName ?? 'Unknown'} {auction.createdBy?.lastName ?? ''}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

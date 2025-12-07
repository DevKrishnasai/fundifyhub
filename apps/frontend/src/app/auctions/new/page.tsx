'use client'

/**
 * Create Auction Page
 * Allows admins to create new auctions for forfeited assets
 */

import { useState, useMemo, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useAssets } from '@/hooks/queries/useAssets'
import { useCreateAuction, type CreateAuctionPayload } from '@/hooks/queries/useAuctions'
import { ROLES, ASSET_STATUS } from '@fundifyhub/types'
import { formatCurrency, cn } from '@/lib/utils'

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

// Icons
import {
  Gavel,
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react'

interface FormData {
  assetId: string
  title: string
  description: string
  reservePrice: string
  startingBid: string
  bidIncrement: string
  buyNowPrice: string
  startTime: string
  endTime: string
  extensionMinutes: string
}

interface FormErrors {
  assetId?: string
  title?: string
  reservePrice?: string
  startingBid?: string
  bidIncrement?: string
  buyNowPrice?: string
  startTime?: string
  endTime?: string
}

export default function CreateAuctionPage() {
  const router = useRouter()
  const { user, isLoggedIn } = useAuth()
  const { toast, error: toastError } = useToast()
  const [assetSearch, setAssetSearch] = useState('')
  const [showAssetDialog, setShowAssetDialog] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const [formData, setFormData] = useState<FormData>({
    assetId: '',
    title: '',
    description: '',
    reservePrice: '',
    startingBid: '',
    bidIncrement: '100',
    buyNowPrice: '',
    startTime: '',
    endTime: '',
    extensionMinutes: '5',
  })

  // Check admin permission
  const isAdmin = user?.roles?.some(
    (role) => role === ROLES.SUPER_ADMIN || role === ROLES.DISTRICT_ADMIN
  )

  // Fetch forfeited assets available for auction
  const { data: assetsData, isLoading: assetsLoading } = useAssets({
    status: ASSET_STATUS.FORFEITED,
    limit: 100,
  })

  const createAuctionMutation = useCreateAuction()

  const selectedAsset = useMemo(() => {
    return assetsData?.assets?.find(a => a.id === formData.assetId)
  }, [assetsData?.assets, formData.assetId])

  // Filter assets by search
  const filteredAssets = useMemo(() => {
    if (!assetsData?.assets) return []
    if (!assetSearch) return assetsData.assets

    const search = assetSearch.toLowerCase()
    return assetsData.assets.filter(asset =>
      asset.assetType?.toLowerCase().includes(search) ||
      asset.request?.requestNumber?.toLowerCase().includes(search) ||
      asset.warehouse?.name?.toLowerCase().includes(search) ||
      asset.brand?.toLowerCase().includes(search) ||
      asset.model?.toLowerCase().includes(search)
    )
  }, [assetsData?.assets, assetSearch])

  // Redirect if not admin
  if (!isLoggedIn) {
    router.push('/login')
    return null
  }

  if (!isAdmin) {
    router.push('/auctions')
    return null
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSelectAsset = (assetId: string) => {
    const asset = assetsData?.assets?.find(a => a.id === assetId)
    if (asset) {
      // Pre-fill suggested values
      const estimatedValue = asset.currentMarketValue || asset.inspectedValue || 0
      
      // Set default auction duration (7 days from now)
      const startTime = new Date()
      startTime.setHours(startTime.getHours() + 1) // Start in 1 hour
      const endTime = new Date(startTime)
      endTime.setDate(endTime.getDate() + 7)

      setFormData(prev => ({
        ...prev,
        assetId,
        reservePrice: Math.round(estimatedValue * 0.8).toString(), // 80% of market value
        startingBid: Math.round(estimatedValue * 0.5).toString(), // 50% of market value
        title: `${asset.assetType}${asset.brand ? ` - ${asset.brand}` : ''}${asset.model ? ` ${asset.model}` : ''}`,
        startTime: startTime.toISOString().slice(0, 16),
        endTime: endTime.toISOString().slice(0, 16),
      }))
    }
    setShowAssetDialog(false)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.assetId) {
      newErrors.assetId = 'Please select an asset'
    }

    if (!formData.title || formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }

    const reservePrice = parseFloat(formData.reservePrice)
    if (isNaN(reservePrice) || reservePrice <= 0) {
      newErrors.reservePrice = 'Reserve price must be a positive number'
    }

    const startingBid = parseFloat(formData.startingBid)
    if (isNaN(startingBid) || startingBid <= 0) {
      newErrors.startingBid = 'Starting bid must be a positive number'
    }

    const bidIncrement = parseFloat(formData.bidIncrement)
    if (isNaN(bidIncrement) || bidIncrement <= 0) {
      newErrors.bidIncrement = 'Bid increment must be a positive number'
    }

    if (formData.buyNowPrice) {
      const buyNowPrice = parseFloat(formData.buyNowPrice)
      if (isNaN(buyNowPrice) || buyNowPrice <= 0) {
        newErrors.buyNowPrice = 'Buy now price must be a positive number'
      } else if (buyNowPrice <= reservePrice) {
        newErrors.buyNowPrice = 'Buy now price must be higher than reserve price'
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required'
    } else if (formData.startTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
      newErrors.endTime = 'End time must be after start time'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const payload: CreateAuctionPayload = {
        assetId: formData.assetId,
        title: formData.title,
        description: formData.description || undefined,
        reservePrice: parseFloat(formData.reservePrice),
        startingBid: parseFloat(formData.startingBid),
        bidIncrement: parseFloat(formData.bidIncrement),
        buyNowPrice: formData.buyNowPrice ? parseFloat(formData.buyNowPrice) : undefined,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        extensionMinutes: parseInt(formData.extensionMinutes),
      }

      const result = await createAuctionMutation.mutateAsync(payload)
      toast('Auction created successfully!')
      router.push(`/auctions/${result.id}`)
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to create auction')
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
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
            <Gavel className="h-6 w-6 text-primary" />
            Create New Auction
          </h1>
          <p className="text-muted-foreground">
            Set up an auction for a forfeited asset
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Asset Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Select Asset
            </CardTitle>
            <CardDescription>
              Choose a forfeited asset to put up for auction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Asset</Label>
              <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className={cn(
                      "w-full justify-start",
                      errors.assetId && "border-destructive"
                    )}
                  >
                    {selectedAsset ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {selectedAsset.assetType} - {selectedAsset.request?.requestNumber}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Plus className="h-4 w-4" />
                        Select an asset...
                      </span>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>Select Forfeited Asset</DialogTitle>
                    <DialogDescription>
                      Choose an asset to create an auction for
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by type, request number, brand..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Asset List */}
                  {assetsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No forfeited assets available for auction
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Request</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Warehouse</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssets.map((asset) => (
                          <TableRow 
                            key={asset.id}
                            className={cn(
                              'cursor-pointer',
                              asset.id === formData.assetId && 'bg-primary/5'
                            )}
                            onClick={() => handleSelectAsset(asset.id)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{asset.assetType}</p>
                                {asset.brand && (
                                  <p className="text-sm text-muted-foreground">
                                    {asset.brand} {asset.model}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {asset.request?.requestNumber}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(asset.currentMarketValue || asset.inspectedValue || 0)}
                            </TableCell>
                            <TableCell>
                              {asset.warehouse?.name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="sm"
                                variant={asset.id === formData.assetId ? 'default' : 'ghost'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectAsset(asset.id)
                                }}
                              >
                                {asset.id === formData.assetId ? 'Selected' : 'Select'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </DialogContent>
              </Dialog>
              {errors.assetId && (
                <p className="text-sm text-destructive">{errors.assetId}</p>
              )}
            </div>

            {/* Selected Asset Summary */}
            {selectedAsset && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Selected Asset Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{selectedAsset.assetType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Brand/Model</p>
                    <p className="font-medium">
                      {selectedAsset.brand || 'N/A'} {selectedAsset.model || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Market Value</p>
                    <p className="font-medium">
                      {formatCurrency(selectedAsset.currentMarketValue || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Condition</p>
                    <p className="font-medium">{selectedAsset.condition}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Auction Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Auction Details
            </CardTitle>
            <CardDescription>
              Enter the auction title and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Gold Jewelry Set - 22K Necklace"
                value={formData.title}
                onChange={handleInputChange}
                className={cn(errors.title && "border-destructive")}
              />
              <p className="text-sm text-muted-foreground">
                A clear, descriptive title for the auction
              </p>
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Provide additional details about the item, condition, history, etc."
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
            <CardDescription>
              Set the auction pricing and bid increments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startingBid">Starting Bid (₹)</Label>
                <Input
                  id="startingBid"
                  name="startingBid"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="10000"
                  value={formData.startingBid}
                  onChange={handleInputChange}
                  className={cn(errors.startingBid && "border-destructive")}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum opening bid amount
                </p>
                {errors.startingBid && (
                  <p className="text-sm text-destructive">{errors.startingBid}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reservePrice">Reserve Price (₹)</Label>
                <Input
                  id="reservePrice"
                  name="reservePrice"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="50000"
                  value={formData.reservePrice}
                  onChange={handleInputChange}
                  className={cn(errors.reservePrice && "border-destructive")}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum price to sell (not shown to bidders)
                </p>
                {errors.reservePrice && (
                  <p className="text-sm text-destructive">{errors.reservePrice}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bidIncrement">Bid Increment (₹)</Label>
                <Input
                  id="bidIncrement"
                  name="bidIncrement"
                  type="number"
                  min={1}
                  step={50}
                  placeholder="100"
                  value={formData.bidIncrement}
                  onChange={handleInputChange}
                  className={cn(errors.bidIncrement && "border-destructive")}
                />
                <p className="text-sm text-muted-foreground">
                  Minimum amount for each new bid
                </p>
                {errors.bidIncrement && (
                  <p className="text-sm text-destructive">{errors.bidIncrement}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="buyNowPrice">Buy Now Price (₹) - Optional</Label>
                <Input
                  id="buyNowPrice"
                  name="buyNowPrice"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="100000"
                  value={formData.buyNowPrice}
                  onChange={handleInputChange}
                  className={cn(errors.buyNowPrice && "border-destructive")}
                />
                <p className="text-sm text-muted-foreground">
                  Instant purchase price (leave empty to disable)
                </p>
                {errors.buyNowPrice && (
                  <p className="text-sm text-destructive">{errors.buyNowPrice}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Auction Timing
            </CardTitle>
            <CardDescription>
              Set when the auction starts and ends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className={cn(errors.startTime && "border-destructive")}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">{errors.startTime}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className={cn(errors.endTime && "border-destructive")}
                />
                {errors.endTime && (
                  <p className="text-sm text-destructive">{errors.endTime}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="extensionMinutes">Auto-Extend (minutes)</Label>
                <Select
                  value={formData.extensionMinutes}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, extensionMinutes: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Extend end time if bid placed near end
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/auctions')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createAuctionMutation.isPending || !selectedAsset}
          >
            {createAuctionMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Auction
          </Button>
        </div>
      </form>
    </div>
  )
}

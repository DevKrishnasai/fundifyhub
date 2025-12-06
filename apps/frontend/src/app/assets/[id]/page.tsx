"use client"

import { useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { ROLES, MOVEMENT_TYPE_LABELS } from "@fundifyhub/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import toast from "@/lib/toast"
import { 
  useAsset,
  useAssetMovements,
  useWarehouses,
  useCreateAssetMovement,
  useUpdateAssetStatus,
} from "@/hooks/queries"
import { 
  Package, 
  Warehouse as WarehouseIcon,
  ArrowLeft,
  ArrowRightLeft,
  Loader2,
  User,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  History,
  ExternalLink
} from "lucide-react"
import Link from "next/link"

function AssetDetailSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Skeleton className="h-64 rounded-lg" />
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function AssetDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const assetId = params.id as string
  
  // Modal states
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [targetWarehouseId, setTargetWarehouseId] = useState("")
  const [transferNotes, setTransferNotes] = useState("")
  const [newStatus, setNewStatus] = useState("")
  const [movementPage, setMovementPage] = useState(1)

  // Queries
  const { data: asset, isLoading: assetLoading, refetch: refetchAsset } = useAsset(assetId)
  const { data: movementsData, isLoading: movementsLoading } = useAssetMovements(assetId, movementPage)
  const { data: warehouses } = useWarehouses()
  
  const createMovementMutation = useCreateAssetMovement()
  const updateStatusMutation = useUpdateAssetStatus()

  const userRoles = user?.roles || []
  const isSuperAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.SUPER_ADMIN)
  const isDistrictAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.DISTRICT_ADMIN)
  const canManageAssets = isSuperAdmin || isDistrictAdmin

  const handleTransfer = useCallback(async () => {
    if (!asset || !targetWarehouseId) {
      toast.error("Please select a destination warehouse")
      return
    }

    try {
      await createMovementMutation.mutateAsync({
        assetId: asset.id,
        data: {
          movementType: "TRANSFER",
          toWarehouseId: targetWarehouseId,
          notes: transferNotes || undefined
        }
      })
      toast.success("Asset transferred successfully")
      setShowTransferModal(false)
      setTargetWarehouseId("")
      setTransferNotes("")
      refetchAsset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to transfer asset")
    }
  }, [asset, targetWarehouseId, transferNotes, createMovementMutation, refetchAsset])

  const handleStatusChange = useCallback(async () => {
    if (!asset || !newStatus) {
      toast.error("Please select a new status")
      return
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: asset.id,
        data: { status: newStatus }
      })
      toast.success("Asset status updated")
      setShowStatusModal(false)
      setNewStatus("")
      refetchAsset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status")
    }
  }, [asset, newStatus, updateStatusMutation, refetchAsset])

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PLEDGED: { variant: "default", label: "Pledged" },
      RELEASED: { variant: "secondary", label: "Released" },
      IN_AUCTION: { variant: "outline", label: "In Auction" },
      SOLD: { variant: "destructive", label: "Sold" }
    }
    const config = statusConfig[status] || { variant: "outline", label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getConditionBadge = (condition: string) => {
    const conditionConfig: Record<string, { className: string; label: string }> = {
      EXCELLENT: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Excellent" },
      GOOD: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", label: "Good" },
      FAIR: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Fair" },
      POOR: { className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", label: "Poor" },
      DAMAGED: { className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Damaged" }
    }
    const config = conditionConfig[condition] || { className: "bg-gray-100 text-gray-800", label: condition }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "INTAKE":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "TRANSFER":
        return <ArrowRightLeft className="h-4 w-4 text-blue-500" />
      case "RELEASE":
        return <ArrowRight className="h-4 w-4 text-purple-500" />
      case "AUCTION":
        return <DollarSign className="h-4 w-4 text-orange-500" />
      case "DISPOSAL":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A"
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  // Get allowed status transitions
  const getAllowedStatuses = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      PLEDGED: ["RELEASED", "IN_AUCTION"],
      IN_AUCTION: ["SOLD", "PLEDGED"],
      RELEASED: [],
      SOLD: []
    }
    return transitions[currentStatus] || []
  }

  if (assetLoading) {
    return <AssetDetailSkeleton />
  }

  if (!asset) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Asset Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The asset you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => router.push("/assets")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assets
            </Button>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  const movements = movementsData?.movements || []
  const movementPagination = movementsData?.pagination
  const allowedStatuses = getAllowedStatuses(asset.status)

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/assets")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {asset.brand} {asset.model}
              </h1>
              <p className="text-muted-foreground">
                {asset.assetType} • Request #{asset.request?.requestNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(asset.status)}
            {getConditionBadge(asset.condition)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Asset Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asset Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{asset.assetType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Brand</p>
                    <p className="font-medium">{asset.brand || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{asset.model || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Condition</p>
                    <p>{getConditionBadge(asset.condition)}</p>
                  </div>
                </div>
                
                {asset.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{asset.description}</p>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Inspected Value</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(asset.inspectedValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Market Value</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(asset.currentMarketValue)}
                    </p>
                  </div>
                </div>
                
                {asset.depreciationRate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Depreciation Rate</p>
                    <p className="font-medium">{asset.depreciationRate}% per year</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Movement History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Movement History
                </CardTitle>
                <CardDescription>
                  Track all asset movements and transfers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {movementsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : movements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No movement history yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {movements.map((movement, index) => (
                      <div 
                        key={movement.id} 
                        className="flex gap-4 relative"
                      >
                        {/* Timeline connector */}
                        {index < movements.length - 1 && (
                          <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                        )}
                        
                        {/* Icon */}
                        <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center">
                          {getMovementIcon(movement.movementType)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                {MOVEMENT_TYPE_LABELS[movement.movementType as keyof typeof MOVEMENT_TYPE_LABELS] || movement.movementType}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                {movement.fromWarehouse && (
                                  <>
                                    <span>{movement.fromWarehouse.name}</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </>
                                )}
                                {movement.toWarehouse && (
                                  <span>{movement.toWarehouse.name}</span>
                                )}
                              </div>
                              {movement.notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Note: {movement.notes}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(movement.movementDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination */}
                    {movementPagination && movementPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Page {movementPagination.page} of {movementPagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={movementPage <= 1}
                            onClick={() => setMovementPage(movementPage - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={movementPage >= movementPagination.totalPages}
                            onClick={() => setMovementPage(movementPage + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions Card */}
            {canManageAssets && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {asset.status === "PLEDGED" && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setShowTransferModal(true)}
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Transfer Asset
                    </Button>
                  )}
                  {allowedStatuses.length > 0 && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setShowStatusModal(true)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update Status
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Warehouse Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WarehouseIcon className="h-5 w-5" />
                  Current Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                {asset.warehouse ? (
                  <div className="space-y-2">
                    <p className="font-medium">{asset.warehouse.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Code: {asset.warehouse.code}
                    </p>
                    {asset.warehouse.address && (
                      <p className="text-sm text-muted-foreground">
                        {asset.warehouse.address}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {asset.warehouse.district?.name}, {asset.warehouse.district?.state?.name}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Not assigned to a warehouse</p>
                )}
              </CardContent>
            </Card>

            {/* Customer Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {asset.request?.customer ? (
                  <div className="space-y-2">
                    <p className="font-medium">
                      {asset.request.customer.firstName} {asset.request.customer.lastName}
                    </p>
                    {asset.request.customer.phoneNumber && (
                      <p className="text-sm text-muted-foreground">
                        {asset.request.customer.phoneNumber}
                      </p>
                    )}
                    {asset.request.customer.email && (
                      <p className="text-sm text-muted-foreground">
                        {asset.request.customer.email}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No customer data</p>
                )}
              </CardContent>
            </Card>

            {/* Loan Card */}
            {asset.request?.loan && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Loan Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Loan Number</p>
                      <p className="font-medium">{asset.request.loan.loanNumber}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant="outline">{asset.request.loan.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">
                        {formatCurrency(asset.request.loan.approvedAmount)}
                      </p>
                    </div>
                    <Separator />
                    <Link href={`/requests/${asset.requestId}`}>
                      <Button variant="link" className="p-0 h-auto">
                        View Request <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(asset.createdAt)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm">{formatDate(asset.updatedAt)}</p>
                </div>
                {asset.lastValuationDate && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Last Valuation</p>
                    <p className="text-sm">{formatDate(asset.lastValuationDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transfer Modal */}
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Asset</DialogTitle>
              <DialogDescription>
                Transfer {asset.brand} {asset.model} to another warehouse
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Location</p>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <WarehouseIcon className="h-4 w-4" />
                  <span>{asset.warehouse?.name || "Not assigned"}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Destination Warehouse</p>
                <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      ?.filter((w) => w.id !== asset.warehouseId && w.isActive)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.district?.name})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Notes (optional)</p>
                <Input
                  placeholder="Transfer notes..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleTransfer}
                disabled={!targetWarehouseId || createMovementMutation.isPending}
              >
                {createMovementMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Transfer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status Update Modal */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Asset Status</DialogTitle>
              <DialogDescription>
                Change the status of this asset
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Status</p>
                <div className="p-3 bg-muted rounded-lg">
                  {getStatusBadge(asset.status)}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">New Status</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleStatusChange}
                disabled={!newStatus || updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Status"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppLayout>
  )
}

export default function AssetDetailPage() {
  return (
    <ProtectedRoute>
      <AssetDetailContent />
    </ProtectedRoute>
  )
}

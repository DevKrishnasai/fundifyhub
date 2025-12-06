"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { ROLES, ASSET_STATUS, ASSET_CONDITION, MOVEMENT_TYPE } from "@fundifyhub/types"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { redirect, useRouter } from "next/navigation"
import toast from "@/lib/toast"
import { 
  useAssets,
  useAssetStats,
  useWarehouses,
  useDistricts,
  useCreateAssetMovement,
  type Asset,
} from "@/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { 
  Package, 
  Warehouse as WarehouseIcon,
  Search,
  RefreshCw,
  Loader2,
  Eye,
  ArrowRightLeft,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  BarChart3,
  Filter
} from "lucide-react"

function AssetsSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function AssetsContent() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Filter states
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [conditionFilter, setConditionFilter] = useState<string>("")
  const [districtFilter, setDistrictFilter] = useState<string>("")
  const [warehouseFilter, setWarehouseFilter] = useState<string>("")
  const [page, setPage] = useState(1)
  
  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [targetWarehouseId, setTargetWarehouseId] = useState("")
  const [transferNotes, setTransferNotes] = useState("")

  // Queries
  const { data: assetsData, isLoading: assetsLoading, refetch: refetchAssets } = useAssets({
    status: statusFilter || undefined,
    condition: conditionFilter || undefined,
    districtId: districtFilter || undefined,
    warehouseId: warehouseFilter || undefined,
    search: search || undefined,
    page,
    limit: 20
  })
  
  const { data: stats } = useAssetStats(districtFilter || undefined, warehouseFilter || undefined)
  const { data: districts } = useDistricts()
  const { data: warehouses } = useWarehouses()
  
  const createMovementMutation = useCreateAssetMovement()

  const userRoles = user?.roles || []
  const isSuperAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.SUPER_ADMIN)
  const isDistrictAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.DISTRICT_ADMIN)
  const isAgent = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.AGENT)
  const canViewAssets = isSuperAdmin || isDistrictAdmin || isAgent

  // Only admins/agents can view assets
  if (!authLoading && user && !canViewAssets) {
    redirect("/dashboard")
  }

  const handleRefresh = useCallback(() => {
    refetchAssets()
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    toast.success("Assets refreshed")
  }, [refetchAssets, queryClient])

  const handleViewAsset = useCallback((assetId: string) => {
    router.push(`/assets/${assetId}`)
  }, [router])

  const openTransferModal = useCallback((asset: Asset) => {
    setSelectedAsset(asset)
    setTargetWarehouseId("")
    setTransferNotes("")
    setShowTransferModal(true)
  }, [])

  const handleTransfer = useCallback(async () => {
    if (!selectedAsset || !targetWarehouseId) {
      toast.error("Please select a destination warehouse")
      return
    }

    try {
      await createMovementMutation.mutateAsync({
        assetId: selectedAsset.id,
        data: {
          movementType: "TRANSFER",
          toWarehouseId: targetWarehouseId,
          notes: transferNotes || undefined
        }
      })
      toast.success("Asset transferred successfully")
      setShowTransferModal(false)
      setSelectedAsset(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to transfer asset")
    }
  }, [selectedAsset, targetWarehouseId, transferNotes, createMovementMutation])

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

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A"
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value)
  }

  const assets = assetsData?.assets || []
  const pagination = assetsData?.pagination

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader 
          title="Asset Management" 
          description="View and manage pledged assets across warehouses"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold">{stats?.totalAssets || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Inspected Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalInspectedValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Market Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalMarketValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">By Status</p>
                  <div className="flex gap-2 mt-1">
                    {stats?.byStatus?.slice(0, 3).map((s) => (
                      <Badge key={s.status} variant="outline" className="text-xs">
                        {s.status}: {s.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by brand, model, description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="PLEDGED">Pledged</SelectItem>
                  <SelectItem value="RELEASED">Released</SelectItem>
                  <SelectItem value="IN_AUCTION">In Auction</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Conditions</SelectItem>
                  <SelectItem value="EXCELLENT">Excellent</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="FAIR">Fair</SelectItem>
                  <SelectItem value="POOR">Poor</SelectItem>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Districts</SelectItem>
                  {districts?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Warehouses</SelectItem>
                  {warehouses?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>
              {pagination ? `Showing ${assets.length} of ${pagination.total} assets` : "Loading..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No assets found</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {asset.brand} {asset.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {asset.assetType} • {asset.request?.requestNumber}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {asset.request?.customer ? (
                            <div>
                              <p className="font-medium">
                                {asset.request.customer.firstName} {asset.request.customer.lastName}
                              </p>
                              {asset.request.customer.phoneNumber && (
                                <p className="text-sm text-muted-foreground">
                                  {asset.request.customer.phoneNumber}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                        <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                        <TableCell>
                          {asset.warehouse ? (
                            <div className="flex items-center gap-2">
                              <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm">{asset.warehouse.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {asset.warehouse.district?.name}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-medium">{formatCurrency(asset.inspectedValue)}</p>
                            {asset.currentMarketValue && (
                              <p className="text-xs text-muted-foreground">
                                Market: {formatCurrency(asset.currentMarketValue)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewAsset(asset.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(isSuperAdmin || isDistrictAdmin) && asset.status === "PLEDGED" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openTransferModal(asset)}
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= pagination.totalPages}
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

        {/* Transfer Modal */}
        <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Asset</DialogTitle>
              <DialogDescription>
                Transfer {selectedAsset?.brand} {selectedAsset?.model} to another warehouse
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Current Location</p>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <WarehouseIcon className="h-4 w-4" />
                  <span>{selectedAsset?.warehouse?.name || "Not assigned"}</span>
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
                      ?.filter((w) => w.id !== selectedAsset?.warehouseId && w.isActive)
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
                    Transfer Asset
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppLayout>
  )
}

export default function AssetsPage() {
  return (
    <ProtectedRoute>
      <AssetsContent />
    </ProtectedRoute>
  )
}

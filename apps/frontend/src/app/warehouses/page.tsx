"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { ROLES } from "@fundifyhub/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import Link from "next/link"
import { useDebounce } from "@/hooks/useDebounce"
import { 
  useWarehouses,
  useWarehouseCapacitySummary,
  useWarehouseInventory,
  useDistricts,
  type WarehouseWithMetrics,
  type WarehouseAsset,
} from "@/hooks/queries"
import { 
  Warehouse,
  Package,
  RefreshCw, 
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Eye,
  Building2,
  MapPin,
  Filter,
  X
} from "lucide-react"

function WarehousesSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function CapacityBadge({ percentage, isOverCapacity, isNearCapacity }: { 
  percentage: number | null | undefined
  isOverCapacity?: boolean
  isNearCapacity?: boolean 
}) {
  if (percentage === null || percentage === undefined) {
    return <Badge variant="secondary">No limit</Badge>
  }
  
  if (isOverCapacity) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {percentage}% - Over
      </Badge>
    )
  }
  
  if (isNearCapacity) {
    return (
      <Badge className="flex items-center gap-1 bg-orange-500 text-white hover:bg-orange-600">
        <AlertCircle className="h-3 w-3" />
        {percentage}%
      </Badge>
    )
  }
  
  return (
    <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-600">
      <CheckCircle2 className="h-3 w-3" />
      {percentage}%
    </Badge>
  )
}

function WarehouseInventoryDialog({ 
  warehouseId,
  warehouseName,
  open, 
  onOpenChange 
}: { 
  warehouseId: string
  warehouseName: string
  open: boolean 
  onOpenChange: (open: boolean) => void 
}) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const { data: inventory, isLoading, isFetching } = useWarehouseInventory(
    warehouseId,
    {
      search: debouncedSearch || undefined,
      status: status || undefined,
      page,
      limit: 10,
    },
    { enabled: open }
  )

  const getStatusBadge = (assetStatus: string) => {
    switch (assetStatus) {
      case "IN_STORAGE":
        return <Badge variant="secondary">In Storage</Badge>
      case "PLEDGED":
        return <Badge variant="default">Pledged</Badge>
      case "RELEASED":
        return <Badge variant="outline" className="border-green-500 text-green-600">Released</Badge>
      case "FORFEITED":
        return <Badge variant="destructive">Forfeited</Badge>
      case "AUCTIONED":
        return <Badge className="bg-purple-500 hover:bg-purple-600">Auctioned</Badge>
      default:
        return <Badge variant="outline">{assetStatus}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {warehouseName} - Inventory
          </DialogTitle>
          <DialogDescription>
            {inventory && (
              <span>
                {inventory.warehouse.currentCount} assets stored
                {inventory.warehouse.capacity && (
                  <> • Capacity: {inventory.warehouse.capacity} ({inventory.warehouse.capacityPercentage}% used)</>
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="IN_STORAGE">In Storage</SelectItem>
              <SelectItem value="PLEDGED">Pledged</SelectItem>
              <SelectItem value="RELEASED">Released</SelectItem>
              <SelectItem value="FORFEITED">Forfeited</SelectItem>
              <SelectItem value="AUCTIONED">Auctioned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status breakdown */}
        {inventory && Object.keys(inventory.statusBreakdown).length > 0 && (
          <div className="flex flex-wrap gap-2 py-2">
            {Object.entries(inventory.statusBreakdown).map(([statusKey, count]) => (
              <Badge 
                key={statusKey} 
                variant="outline"
                className="cursor-pointer"
                onClick={() => setStatus(statusKey === status ? "" : statusKey)}
              >
                {statusKey.replace(/_/g, " ")}: {count}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto border rounded-md">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : inventory?.assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-50" />
              <p>No assets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked Request</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory?.assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {asset.brand} {asset.model}
                        </div>
                        {asset.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {asset.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.assetType.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{asset.condition}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell>
                      {asset.request ? (
                        <Link 
                          href={`/requests/${asset.request.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {asset.request.requestNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {asset.estimatedValue 
                        ? `₹${asset.estimatedValue.toLocaleString()}`
                        : "-"
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {inventory && inventory.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Page {inventory.pagination.page} of {inventory.pagination.totalPages} 
              ({inventory.pagination.total} total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || isFetching}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= inventory.pagination.totalPages || isFetching}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function WarehousesContent() {
  const { user, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<"overview" | "list">("overview")
  const [districtFilter, setDistrictFilter] = useState<string>("")
  const [selectedWarehouse, setSelectedWarehouse] = useState<{ id: string; name: string } | null>(null)

  const { data: districts } = useDistricts()
  const { 
    data: capacitySummary, 
    isLoading: summaryLoading,
    refetch: refetchSummary,
    isFetching: summaryFetching
  } = useWarehouseCapacitySummary(
    districtFilter ? { districtId: districtFilter } : undefined
  )
  
  const { 
    data: warehouses, 
    isLoading: warehousesLoading,
    refetch: refetchWarehouses,
    isFetching: warehousesFetching
  } = useWarehouses()

  const isLoading = summaryLoading || warehousesLoading || authLoading
  const isFetching = summaryFetching || warehousesFetching

  // Filter warehouses by district if selected
  const filteredWarehouses = useMemo(() => {
    if (!capacitySummary?.warehouses) return []
    if (!districtFilter) return capacitySummary.warehouses
    return capacitySummary.warehouses.filter(w => w.district?.id === districtFilter)
  }, [capacitySummary?.warehouses, districtFilter])

  // Check admin access
  const userRoles = user?.roles ?? []
  const isSuperAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.SUPER_ADMIN)
  const isDistrictAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.DISTRICT_ADMIN)
  const hasAdminAccess = isSuperAdmin || isDistrictAdmin

  if (!user) return null
  if (!hasAdminAccess) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">You don&apos;t have permission to view this page.</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Warehouse Management"
          description="Monitor warehouse capacity and inventory across locations"
          actions={
            <div className="flex items-center gap-2">
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Districts</SelectItem>
                  {districts?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  refetchSummary()
                  refetchWarehouses()
                }}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          }
        />

        {isLoading ? (
          <WarehousesSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            {capacitySummary && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Warehouses</CardTitle>
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{capacitySummary.summary.totalWarehouses}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {districtFilter ? "in selected district" : "across all locations"}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{capacitySummary.summary.totalAssets.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      of {capacitySummary.summary.totalCapacity.toLocaleString()} capacity
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Utilization</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {capacitySummary.summary.overallUtilization ?? 0}%
                    </div>
                    <Progress 
                      value={capacitySummary.summary.overallUtilization ?? 0} 
                      className="h-2 mt-2" 
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Health Status</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span>{capacitySummary.summary.healthyCount} Healthy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <span>{capacitySummary.summary.nearCapacityCount} Near</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span>{capacitySummary.summary.overCapacityCount} Over</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs for different views */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "overview" | "list")}>
              <TabsList>
                <TabsTrigger value="overview">Capacity Overview</TabsTrigger>
                <TabsTrigger value="list">Warehouse List</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredWarehouses.map((warehouse) => (
                    <Card 
                      key={warehouse.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        warehouse.isOverCapacity 
                          ? "border-red-500/50" 
                          : warehouse.isNearCapacity 
                            ? "border-orange-500/50" 
                            : ""
                      }`}
                      onClick={() => setSelectedWarehouse({ id: warehouse.id, name: warehouse.name })}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Warehouse className="h-4 w-4" />
                              {warehouse.name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {warehouse.district?.name || "Unknown District"}
                            </CardDescription>
                          </div>
                          <CapacityBadge 
                            percentage={warehouse.capacityPercentage} 
                            isOverCapacity={warehouse.isOverCapacity}
                            isNearCapacity={warehouse.isNearCapacity}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Assets</span>
                            <span className="font-medium">{warehouse.currentCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Capacity</span>
                            <span className="font-medium">
                              {warehouse.capacity ?? "Unlimited"}
                            </span>
                          </div>
                          {warehouse.capacity && (
                            <Progress 
                              value={warehouse.capacityPercentage ?? 0} 
                              className={`h-2 ${
                                warehouse.isOverCapacity 
                                  ? "[&>div]:bg-red-500" 
                                  : warehouse.isNearCapacity 
                                    ? "[&>div]:bg-orange-500" 
                                    : ""
                              }`}
                            />
                          )}
                          <div className="flex items-center justify-end pt-2">
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Eye className="h-3 w-3" />
                              View Inventory
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredWarehouses.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Warehouse className="h-12 w-12 mb-3 opacity-50" />
                      <p>No warehouses found</p>
                      {districtFilter && (
                        <Button 
                          variant="link" 
                          className="mt-2"
                          onClick={() => setDistrictFilter("")}
                        >
                          Clear filter
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="list" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Warehouse</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>District</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="text-center">Assets</TableHead>
                          <TableHead className="text-center">Capacity</TableHead>
                          <TableHead className="text-center">Utilization</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWarehouses.map((warehouse) => (
                          <TableRow key={warehouse.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Warehouse className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{warehouse.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{warehouse.code}</Badge>
                            </TableCell>
                            <TableCell>{warehouse.district?.name || "-"}</TableCell>
                            <TableCell>
                              {warehouse.contactPerson || warehouse.contactPhone ? (
                                <div className="text-sm">
                                  {warehouse.contactPerson && <div>{warehouse.contactPerson}</div>}
                                  {warehouse.contactPhone && (
                                    <div className="text-muted-foreground">{warehouse.contactPhone}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{warehouse.currentCount}</TableCell>
                            <TableCell className="text-center">
                              {warehouse.capacity ?? <span className="text-muted-foreground">∞</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <CapacityBadge 
                                percentage={warehouse.capacityPercentage}
                                isOverCapacity={warehouse.isOverCapacity}
                                isNearCapacity={warehouse.isNearCapacity}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedWarehouse({ id: warehouse.id, name: warehouse.name })}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredWarehouses.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No warehouses found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </PageContainer>

      {/* Inventory Dialog */}
      {selectedWarehouse && (
        <WarehouseInventoryDialog
          warehouseId={selectedWarehouse.id}
          warehouseName={selectedWarehouse.name}
          open={!!selectedWarehouse}
          onOpenChange={(open) => {
            if (!open) setSelectedWarehouse(null)
          }}
        />
      )}
    </AppLayout>
  )
}

export default function WarehousesPage() {
  return (
    <ProtectedRoute>
      <WarehousesContent />
    </ProtectedRoute>
  )
}

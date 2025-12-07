"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { ROLES, hasPermission, PERMISSION } from "@fundifyhub/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { apiClient } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { redirect } from "next/navigation"
import toast from "@/lib/toast"
import { 
  useCountries, 
  useStates, 
  useDistricts, 
  useWarehouses,
  geographyKeys,
  type Country as CountryType,
  type State as StateType,
  type District as DistrictType,
  type Warehouse as WarehouseType
} from "@/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { 
  Globe, 
  MapPin, 
  Building2, 
  Warehouse,
  Plus, 
  RefreshCw, 
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
  Package
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function GeographySkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function GeographyContent() {
  const { user, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("districts")
  const [search, setSearch] = useState("")
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CountryType | StateType | DistrictType | WarehouseType | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    countryId: "",
    stateId: "",
    districtId: "",
    address: "",
    capacity: "",
    isActive: true
  })

  // Queries
  const { data: countries, isLoading: countriesLoading, refetch: refetchCountries } = useCountries()
  const { data: states, isLoading: statesLoading, refetch: refetchStates } = useStates()
  const { data: districts, isLoading: districtsLoading, refetch: refetchDistricts } = useDistricts()
  const { data: warehouses, isLoading: warehousesLoading, refetch: refetchWarehouses } = useWarehouses()

  const userRoles = user?.roles || []
  const isSuperAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.SUPER_ADMIN)
  const isDistrictAdmin = userRoles.map((r: string) => r.toUpperCase()).includes(ROLES.DISTRICT_ADMIN)
  const canManageGeography = isSuperAdmin || isDistrictAdmin

  // Only admins can view geography
  if (!authLoading && user && !canManageGeography) {
    redirect("/dashboard")
  }

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      code: "",
      countryId: "",
      stateId: "",
      districtId: "",
      address: "",
      capacity: "",
      isActive: true
    })
    setSelectedItem(null)
  }, [])

  const openCreateModal = useCallback(() => {
    resetForm()
    setShowCreateModal(true)
  }, [resetForm])

  const openEditModal = useCallback((item: CountryType | StateType | DistrictType | WarehouseType) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      code: item.code,
      countryId: (item as StateType).countryId || "",
      stateId: (item as DistrictType).stateId || "",
      districtId: (item as WarehouseType).districtId || "",
      address: (item as WarehouseType).address || "",
      capacity: (item as WarehouseType).capacity?.toString() || "",
      isActive: item.isActive
    })
    setShowEditModal(true)
  }, [])

  const openDeleteConfirm = useCallback((item: CountryType | StateType | DistrictType | WarehouseType) => {
    setSelectedItem(item)
    setShowDeleteConfirm(true)
  }, [])

  const handleRefresh = useCallback(() => {
    switch (activeTab) {
      case "countries":
        refetchCountries()
        break
      case "states":
        refetchStates()
        break
      case "districts":
        refetchDistricts()
        break
      case "warehouses":
        refetchWarehouses()
        break
    }
  }, [activeTab, refetchCountries, refetchStates, refetchDistricts, refetchWarehouses])

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: geographyKeys.all })
  }, [queryClient])

  // CRUD handlers
  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Name and code are required")
      return
    }

    setFormLoading(true)
    try {
      let endpoint = ""
      let payload: Record<string, unknown> = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        isActive: formData.isActive
      }

      switch (activeTab) {
        case "countries":
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRIES
          break
        case "states":
          if (!formData.countryId) {
            toast.error("Please select a country")
            setFormLoading(false)
            return
          }
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATES
          payload.countryId = formData.countryId
          break
        case "districts":
          if (!formData.stateId) {
            toast.error("Please select a state")
            setFormLoading(false)
            return
          }
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICTS
          payload.stateId = formData.stateId
          break
        case "warehouses":
          if (!formData.districtId) {
            toast.error("Please select a district")
            setFormLoading(false)
            return
          }
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSES
          payload.districtId = formData.districtId
          payload.address = formData.address.trim() || undefined
          payload.capacity = formData.capacity ? parseInt(formData.capacity) : undefined
          break
      }

      const res = await apiClient.post(endpoint, payload)
      
      if (res.data?.success) {
        toast.success(`${activeTab.slice(0, -1)} created successfully`)
        setShowCreateModal(false)
        resetForm()
        invalidateAll()
      } else {
        throw new Error(res.data?.message || "Failed to create")
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(error.response?.data?.message || error.message || "Failed to create")
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedItem || !formData.name.trim()) {
      toast.error("Name is required")
      return
    }

    setFormLoading(true)
    try {
      let endpoint = ""
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        isActive: formData.isActive
      }

      switch (activeTab) {
        case "countries":
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRY_BY_ID(selectedItem.id)
          break
        case "states":
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATE_BY_ID(selectedItem.id)
          break
        case "districts":
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICT_BY_ID(selectedItem.id)
          break
        case "warehouses":
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSE_BY_ID(selectedItem.id)
          payload.address = formData.address.trim() || undefined
          payload.capacity = formData.capacity ? parseInt(formData.capacity) : undefined
          break
      }

      const res = await apiClient.patch(endpoint, payload)
      
      if (res.data?.success) {
        toast.success(`${activeTab.slice(0, -1)} updated successfully`)
        setShowEditModal(false)
        resetForm()
        invalidateAll()
      } else {
        throw new Error(res.data?.message || "Failed to update")
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(error.response?.data?.message || error.message || "Failed to update")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedItem) return

    setFormLoading(true)
    try {
      let endpoint = ""
      switch (activeTab) {
        case "countries":
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.COUNTRY_BY_ID(selectedItem.id)
          break
        case "states":
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.STATE_BY_ID(selectedItem.id)
          break
        case "districts":
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.DISTRICT_BY_ID(selectedItem.id)
          break
        case "warehouses":
          endpoint = BACKEND_API_CONFIG.ENDPOINTS.GEOGRAPHY.WAREHOUSE_BY_ID(selectedItem.id)
          break
      }

      const res = await apiClient.delete(endpoint)
      
      if (res.data?.success) {
        toast.success(`${activeTab.slice(0, -1)} deleted successfully`)
        setShowDeleteConfirm(false)
        resetForm()
        invalidateAll()
      } else {
        throw new Error(res.data?.message || "Failed to delete")
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string }
      toast.error(error.response?.data?.message || error.message || "Failed to delete")
    } finally {
      setFormLoading(false)
    }
  }

  // Filter data by search
  const filterData = <T extends { name: string; code: string }>(data: T[] | undefined): T[] => {
    if (!data) return []
    if (!search) return data
    const searchLower = search.toLowerCase()
    return data.filter(item => 
      item.name.toLowerCase().includes(searchLower) || 
      item.code.toLowerCase().includes(searchLower)
    )
  }

  const filteredCountries = filterData(countries)
  const filteredStates = filterData(states)
  const filteredDistricts = filterData(districts)
  const filteredWarehouses = filterData(warehouses)

  const isLoading = activeTab === "countries" ? countriesLoading :
                    activeTab === "states" ? statesLoading :
                    activeTab === "districts" ? districtsLoading :
                    warehousesLoading

  if (authLoading) {
    return <GeographySkeleton />
  }

  if (!user) {
    return null
  }

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "countries": return <Globe className="h-4 w-4" />
      case "states": return <MapPin className="h-4 w-4" />
      case "districts": return <Building2 className="h-4 w-4" />
      case "warehouses": return <Warehouse className="h-4 w-4" />
      default: return null
    }
  }

  const canCreate = activeTab === "warehouses" ? (isSuperAdmin || isDistrictAdmin) : isSuperAdmin

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title="Geography Management"
          description="Manage countries, states, districts, and warehouses."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {canCreate && (
                <Button onClick={openCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {activeTab.slice(0, -1)}
                </Button>
              )}
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="countries" className="gap-2" disabled={!isSuperAdmin}>
              {getTabIcon("countries")}
              <span className="hidden sm:inline">Countries</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {countries?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="states" className="gap-2" disabled={!isSuperAdmin}>
              {getTabIcon("states")}
              <span className="hidden sm:inline">States</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {states?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="districts" className="gap-2">
              {getTabIcon("districts")}
              <span className="hidden sm:inline">Districts</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {districts?.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="warehouses" className="gap-2">
              {getTabIcon("warehouses")}
              <span className="hidden sm:inline">Warehouses</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {warehouses?.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Countries Tab */}
          <TabsContent value="countries">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="hidden md:table-cell">States</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredCountries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No countries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCountries.map((country) => (
                      <TableRow key={country.id}>
                        <TableCell className="font-medium">{country.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{country.code}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {country._count?.states || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant={country.isActive ? "default" : "secondary"}>
                            {country.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(country)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteConfirm(country)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* States Tab */}
          <TabsContent value="states">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="hidden md:table-cell">Country</TableHead>
                    <TableHead className="hidden lg:table-cell">Districts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredStates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No states found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStates.map((state) => (
                      <TableRow key={state.id}>
                        <TableCell className="font-medium">{state.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{state.code}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {state.country?.name || "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {state._count?.districts || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant={state.isActive ? "default" : "secondary"}>
                            {state.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(state)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteConfirm(state)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Districts Tab */}
          <TabsContent value="districts">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead className="hidden lg:table-cell">Warehouses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredDistricts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No districts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDistricts.map((district) => (
                      <TableRow key={district.id}>
                        <TableCell className="font-medium">{district.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{district.code}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            {district.state?.name}
                            {district.state?.country && (
                              <>
                                <ChevronRight className="h-3 w-3" />
                                {district.state.country.name}
                              </>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {district._count?.warehouses || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant={district.isActive ? "default" : "secondary"}>
                            {district.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(district)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => openDeleteConfirm(district)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Warehouses Tab */}
          <TabsContent value="warehouses">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="hidden md:table-cell">District</TableHead>
                    <TableHead className="hidden lg:table-cell">Capacity</TableHead>
                    <TableHead className="hidden lg:table-cell">Assets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredWarehouses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No warehouses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWarehouses.map((warehouse) => (
                      <TableRow key={warehouse.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{warehouse.name}</p>
                            {warehouse.address && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {warehouse.address}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{warehouse.code}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            {warehouse.district?.name}
                            {warehouse.district?.state && (
                              <>
                                <ChevronRight className="h-3 w-3" />
                                {warehouse.district.state.name}
                              </>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {warehouse.capacity ? (
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              {warehouse.capacity}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {warehouse._count?.assets || 0}
                        </TableCell>
                        <TableCell>
                          <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                            {warehouse.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditModal(warehouse)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteConfirm(warehouse)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Modal */}
        <Dialog 
          open={showCreateModal || showEditModal} 
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateModal(false)
              setShowEditModal(false)
              resetForm()
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {showEditModal ? `Edit ${activeTab.slice(0, -1)}` : `Add ${activeTab.slice(0, -1)}`}
              </DialogTitle>
              <DialogDescription>
                {showEditModal 
                  ? `Update ${activeTab.slice(0, -1)} information.`
                  : `Create a new ${activeTab.slice(0, -1)}.`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Parent selection for states */}
              {activeTab === "states" && !showEditModal && (
                <div className="space-y-2">
                  <Label>Country <span className="text-destructive">*</span></Label>
                  <Select 
                    value={formData.countryId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, countryId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Parent selection for districts */}
              {activeTab === "districts" && !showEditModal && (
                <div className="space-y-2">
                  <Label>State <span className="text-destructive">*</span></Label>
                  <Select 
                    value={formData.stateId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, stateId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {states?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Parent selection for warehouses */}
              {activeTab === "warehouses" && !showEditModal && (
                <div className="space-y-2">
                  <Label>District <span className="text-destructive">*</span></Label>
                  <Select 
                    value={formData.districtId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, districtId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts?.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Name */}
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder={`Enter ${activeTab.slice(0, -1)} name`}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={formLoading}
                />
              </div>

              {/* Code */}
              <div className="space-y-2">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Enter unique code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  disabled={formLoading || showEditModal}
                  className="uppercase"
                />
                {showEditModal && (
                  <p className="text-xs text-muted-foreground">Code cannot be changed after creation</p>
                )}
              </div>

              {/* Warehouse-specific fields */}
              {activeTab === "warehouses" && (
                <>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      placeholder="Enter warehouse address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      disabled={formLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      placeholder="Maximum asset capacity"
                      value={formData.capacity}
                      onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                      disabled={formLoading}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={showEditModal ? handleUpdate : handleCreate}
                disabled={formLoading}
              >
                {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {showEditModal ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete {activeTab.slice(0, -1)}</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this {activeTab.slice(0, -1)}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="py-4">
                <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  {getTabIcon(activeTab)}
                  <div>
                    <p className="font-medium">{selectedItem.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedItem.code}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDelete}
                disabled={formLoading}
              >
                {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppLayout>
  )
}

export default function GeographyPage() {
  return (
    <ProtectedRoute>
      <GeographyContent />
    </ProtectedRoute>
  )
}

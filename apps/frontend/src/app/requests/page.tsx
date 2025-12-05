"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { RequestCardList } from "@/components/dashboard/RequestCard"
import { ROLES, REQUEST_STAGE, STAGE_LABELS } from "@fundifyhub/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { RequestsListSkeleton } from "@/components/loading-skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { useRequests, useUserRequests, useAssignedRequests } from "@/hooks/queries"
import { useDistricts } from "@/hooks/queries/useGeography"
import { useDebounce } from "@/hooks/useDebounce"
import Link from "next/link"
import { 
  Plus, 
  Search, 
  RefreshCw, 
  FileText,
} from "lucide-react"

function RequestsSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-10 flex-1 min-w-[200px]" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
          <RequestsListSkeleton items={5} />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function RequestsContent() {
  const { user, isLoading: authLoading } = useAuth()
  
  // Filters & Pagination state
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [districtFilter, setDistrictFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  // Debounce search for better performance
  const debouncedSearch = useDebounce(search, 300)

  // Determine user roles
  const userRoles = user?.roles?.map((r: string) => r.toUpperCase()) || []
  const isCustomer = userRoles.includes(ROLES.CUSTOMER) && !userRoles.includes(ROLES.SUPER_ADMIN) && !userRoles.includes(ROLES.DISTRICT_ADMIN) && !userRoles.includes(ROLES.AGENT)
  const isAgent = userRoles.includes(ROLES.AGENT) && !userRoles.includes(ROLES.SUPER_ADMIN) && !userRoles.includes(ROLES.DISTRICT_ADMIN)
  const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN)
  const isDistrictAdmin = userRoles.includes(ROLES.DISTRICT_ADMIN)
  const isAdmin = isSuperAdmin || isDistrictAdmin

  // Fetch districts for admin filter
  const { data: districts = [] } = useDistricts({ enabled: isAdmin })
  
  // Get available districts for filtering based on role
  const availableDistricts = useMemo(() => {
    const userDistricts = user?.districts || []
    if (isSuperAdmin) {
      return districts.map(d => d.name)
    }
    return userDistricts
  }, [isSuperAdmin, districts, user?.districts])

  // Build filter params for React Query
  const filterParams = useMemo(() => ({
    page,
    limit,
    status: statusFilter !== "all" ? statusFilter : undefined,
    district: districtFilter !== "all" ? districtFilter : undefined,
    search: debouncedSearch || undefined,
    sortBy: "createdAt",
    sortOrder: "desc" as const,
  }), [page, limit, statusFilter, districtFilter, debouncedSearch])

  // Use appropriate hook based on role
  const adminQuery = useRequests(filterParams, { enabled: isAdmin && !authLoading })
  const agentQuery = useAssignedRequests({ enabled: isAgent && !authLoading })
  const customerQuery = useUserRequests({ enabled: isCustomer && !authLoading })

  // Get active query based on role
  const activeQuery = isAdmin ? adminQuery : isAgent ? agentQuery : customerQuery

  // Normalize data structure
  const requests = useMemo(() => {
    if (isAdmin && adminQuery.data) {
      return adminQuery.data.requests || []
    }
    if (isAgent && agentQuery.data) {
      return agentQuery.data || []
    }
    if (customerQuery.data) {
      return customerQuery.data || []
    }
    return []
  }, [isAdmin, isAgent, adminQuery.data, agentQuery.data, customerQuery.data])

  const pagination = useMemo(() => {
    if (isAdmin && adminQuery.data?.pagination) {
      return adminQuery.data.pagination
    }
    // For non-admin views, create pagination from array length
    return {
      page: 1,
      limit: requests.length || 10,
      total: requests.length,
      totalPages: 1,
    }
  }, [isAdmin, adminQuery.data, requests.length])

  const isLoading = activeQuery.isLoading
  const isRefetching = activeQuery.isFetching && !activeQuery.isLoading
  const error = activeQuery.error?.message || null

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, districtFilter, debouncedSearch, limit])

  // Handle refresh
  const handleRefresh = () => {
    activeQuery.refetch()
  }

  if (authLoading) {
    return <RequestsSkeleton />
  }

  if (!user) {
    return null
  }

  // Role-based page info
  const getPageInfo = () => {
    if (isAdmin) {
      return {
        title: "All Requests",
        description: "Manage and review all loan requests across the platform."
      }
    }
    if (isAgent) {
      return {
        title: "Assigned Requests",
        description: "View and manage requests assigned to you for inspection."
      }
    }
    return {
      title: "My Requests",
      description: "Track your loan requests and their status."
    }
  }

  const pageInfo = getPageInfo()

  // Status/Stage options for filter - using stage-based system
  const statusOptions = Object.values(REQUEST_STAGE).map(stage => ({
    value: stage,
    label: STAGE_LABELS[stage] || stage.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }))

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title={pageInfo.title}
          description={pageInfo.description}
          actions={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={isLoading || isRefetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isCustomer && (
                <Button asChild>
                  <Link href="/submit-request">
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Link>
                </Button>
              )}
            </div>
          }
        />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by request number, asset..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* District Filter (Admin only) */}
              {isAdmin && availableDistricts.length > 0 && (
                <Select value={districtFilter} onValueChange={setDistrictFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {availableDistricts.map(district => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-6">
            {error}
            <Button variant="link" className="ml-2 p-0 h-auto" onClick={handleRefresh}>
              Try again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : requests.length > 0 ? (
          <>
            {/* Request List */}
            <RequestCardList 
              requests={requests} 
              variant="full"
              baseUrl="/requests"
            />

            {/* Pagination (Admin only has server-side pagination) */}
            {isAdmin && pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  page={page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={limit}
                  onPageChange={setPage}
                  onPageSizeChange={(newLimit) => {
                    setLimit(newLimit)
                    setPage(1)
                  }}
                />
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-12 border rounded-lg">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No requests found</h3>
            <p className="text-muted-foreground mb-6">
              {search || statusFilter !== "all" || districtFilter !== "all" 
                ? "Try adjusting your filters to see more results."
                : isCustomer 
                  ? "Start by uploading an asset to create your first loan request."
                  : isAgent
                    ? "No requests have been assigned to you yet."
                    : "No loan requests have been submitted yet."
              }
            </p>
            {isCustomer && !search && statusFilter === "all" && (
              <Button asChild>
                <Link href="/submit-request">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Request
                </Link>
              </Button>
            )}
          </div>
        )}
      </PageContainer>
    </AppLayout>
  )
}

export default function RequestsPage() {
  return (
    <ProtectedRoute>
      <RequestsContent />
    </ProtectedRoute>
  )
}

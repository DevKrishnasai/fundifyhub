"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { RequestCardList } from "@/components/dashboard/RequestCard"
import { ROLES, REQUEST_STATUS, DISTRICTS } from "@fundifyhub/types"
import type { RequestType } from "@fundifyhub/types"
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
import { apiClient } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import Link from "next/link"
import { 
  Plus, 
  Search, 
  RefreshCw, 
  FileText,
} from "lucide-react"

interface RequestsResponse {
  requests: RequestType[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

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
            <Skeleton className="h-10 w-[160px]" />
            <Skeleton className="h-10 w-[160px]" />
          </div>
          <RequestsListSkeleton items={5} />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function RequestsContent() {
  const { user, isLoading: authLoading } = useAuth()
  const [requests, setRequests] = useState<RequestType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters & Pagination
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [districtFilter, setDistrictFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  const userRoles = user?.roles?.map((r: string) => r.toUpperCase()) || []
  const isCustomer = userRoles.includes(ROLES.CUSTOMER)
  const isAgent = userRoles.includes(ROLES.AGENT)
  const isSuperAdmin = userRoles.includes(ROLES.SUPER_ADMIN)
  const isDistrictAdmin = userRoles.includes(ROLES.DISTRICT_ADMIN)
  const isAdmin = isSuperAdmin || isDistrictAdmin
  
  // Get available districts for filtering
  // Super Admin sees all districts, District Admin sees only their assigned districts
  const userDistricts = user?.districts || []
  const availableDistricts = isSuperAdmin ? DISTRICTS : userDistricts

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", limit.toString())
      params.append("sortBy", "createdAt")
      params.append("sortOrder", "desc")
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (districtFilter !== "all") {
        params.append("district", districtFilter)
      }
      if (search) {
        params.append("search", search)
      }

      // Choose endpoint based on role
      let endpoint = BACKEND_API_CONFIG.ENDPOINTS.USER.LIST_REQUESTS
      if (isAdmin) {
        endpoint = BACKEND_API_CONFIG.ENDPOINTS.ADMIN.REQUESTS_LIST
      } else if (isAgent) {
        endpoint = BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ASSIGNED_REQUESTS
      }

      const res = await apiClient.get(`${endpoint}?${params.toString()}`)
      
      if (res.data?.success) {
        const data = res.data.data
        if (Array.isArray(data)) {
          setRequests(data)
          setPagination({ page: 1, limit: 10, total: data.length, totalPages: 1 })
        } else {
          setRequests(data.requests || [])
          setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })
        }
      } else {
        throw new Error(res.data?.message || "Failed to fetch requests")
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err)
      setError("Failed to load requests. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [page, limit, statusFilter, districtFilter, search, isAdmin, isAgent])

  useEffect(() => {
    if (user && !authLoading) {
      fetchRequests()
    }
  }, [user, authLoading, fetchRequests])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, districtFilter, search, limit])

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

  // Status options for filter
  const statusOptions = Object.values(REQUEST_STATUS).map(status => ({
    value: status,
    label: status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }))

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader
          title={pageInfo.title}
          description={pageInfo.description}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
            <Button variant="link" className="ml-2 p-0 h-auto" onClick={fetchRequests}>
              Try again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
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

            {/* Pagination */}
            {pagination.totalPages > 0 && (
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

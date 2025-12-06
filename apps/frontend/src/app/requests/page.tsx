"use client"

import { useRequestsPage } from "@/hooks/useRequestsPage"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { RequestCardList } from "@/components/features/requests/RequestCard"
import { REQUEST_STAGE, STAGE_LABELS } from "@fundifyhub/types"
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
  const {
    user,
    authLoading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    districtFilter,
    setDistrictFilter,
    page,
    setPage,
    limit,
    setLimit,
    requests,
    pagination,
    isLoading,
    isRefetching,
    error,
    handleRefresh,
    pageInfo,
    isAdmin,
    isCustomer,
    availableDistricts,
  } = useRequestsPage()

  if (authLoading) {
    return <RequestsSkeleton />
  }

  if (!user) {
    return null
  }

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

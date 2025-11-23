"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Smartphone,
  Laptop,
  Car,
  Clock,
  CheckCircle,
  Calendar,
  IndianRupee,
  CreditCard,
  AlertCircle,
  Eye,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { getWithResult } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import toast from "@/lib/toast"
import { REQUEST_STATUS, PENDING_REQUEST_STATUSES, LOAN_STATUS } from '@fundifyhub/types'
import RequestActions from '@/components/request/RequestActions'
import { StatsCard } from "@/components/dashboard/StatsCard"
import { DashboardFilters } from "@/components/dashboard/DashboardFilters"
import { DashboardPagination } from "@/components/dashboard/DashboardPagination"
import { useDashboardStats } from "@/hooks/useDashboardStats"

function getAssetIcon(type: string) {
  switch (type) {
    case "phone":
      return <Smartphone className="w-5 h-5" />
    case "laptop":
      return <Laptop className="w-5 h-5" />
    case "vehicle":
      return <Car className="w-5 h-5" />
    default:
      return <CreditCard className="w-5 h-5" />
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case REQUEST_STATUS.PENDING:
    case REQUEST_STATUS.UNDER_REVIEW:
    case REQUEST_STATUS.OFFER_SENT:
      return <Badge variant="secondary">{status.replace(/_/g, ' ')}</Badge>
    case REQUEST_STATUS.OFFER_ACCEPTED:
    case REQUEST_STATUS.INSPECTION_SCHEDULED:
    case REQUEST_STATUS.INSPECTION_IN_PROGRESS:
    case REQUEST_STATUS.INSPECTION_COMPLETED:
      return <Badge className="bg-primary/10 text-primary">{status.replace(/_/g, ' ')}</Badge>
    case REQUEST_STATUS.APPROVED:
    case REQUEST_STATUS.AMOUNT_DISBURSED:
      return <Badge className="bg-chart-3/10 text-chart-3">{status.replace(/_/g, ' ')}</Badge>
    case REQUEST_STATUS.REJECTED:
    case REQUEST_STATUS.OFFER_DECLINED:
      return <Badge className="bg-destructive/10 text-destructive">{status.replace(/_/g, ' ')}</Badge>
    case REQUEST_STATUS.CANCELLED:
    case REQUEST_STATUS.COMPLETED:
      return <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function UserDashboard() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [requests, setRequests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

  // Fetch dashboard stats
  const { stats, loading: statsLoading } = useDashboardStats({ status: statusFilter })

  useEffect(() => {
    fetchRequests(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statusFilter])

  async function fetchRequests(pageToFetch = 1) {
    try {
      setLoading(true)
      const statusParam = statusFilter && statusFilter !== 'all' ? `&status=${encodeURIComponent(statusFilter)}` : ''
      const searchParam = searchTerm && searchTerm.trim().length > 0 ? `&search=${encodeURIComponent(searchTerm.trim())}` : ''
      const url = `${BACKEND_API_CONFIG.ENDPOINTS.USER.LIST_REQUESTS}?page=${pageToFetch}&pageSize=${pageSize}${statusParam}${searchParam}`
      const resp = await getWithResult<{ items: any[]; total: number; page: number; pageSize: number }>(url)
      if (!resp.ok) {
        toast.error(resp.error?.message || 'Failed to load requests')
        setLoading(false)
        return
      }
      const data = resp.data
      setRequests(Array.isArray(data.items) ? data.items : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)
    } catch (err) {
      toast.error('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchRequests(1)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPage(1)
  }

  const handleRequestUpdate = (updatedRequest: any) => {
    // Refresh the requests list after an action is taken
    fetchRequests(page)
  }

  const totalPages = Math.ceil(total / pageSize)

  const filteredLoans = requests

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, John!</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your loan requests and track your repayments
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatsCard
            title="Total Requests"
            value={stats?.totalRequests || 0}
            icon={<CreditCard className="w-5 h-5" />}
            iconColor="text-blue-600"
            loading={statsLoading}
          />
          <StatsCard
            title="Active Loans"
            value={stats?.activeLoans || 0}
            icon={<CheckCircle className="w-5 h-5" />}
            iconColor="text-green-600"
            loading={statsLoading}
          />
          <StatsCard
            title="Total Borrowed"
            value={`₹${(stats?.totalDisbursed || 0).toLocaleString('en-IN')}`}
            icon={<IndianRupee className="w-5 h-5" />}
            iconColor="text-purple-600"
            loading={statsLoading}
          />
          <StatsCard
            title="Pending EMIs"
            value={stats?.overduEMIs || 0}
            icon={<AlertCircle className="w-5 h-5" />}
            iconColor="text-orange-600"
            loading={statsLoading}
          />
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Loan Requests */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-bold">Your Loan Requests</h2>
              <Button size="sm" asChild>
                <Link href="/upload-asset">
                  <Plus className="w-4 h-4 mr-2" />
                  Pledge New Asset
                </Link>
              </Button>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <DashboardFilters
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                onClearFilters={handleClearFilters}
                customFilters={
                  <Button size="sm" onClick={handleSearch}>
                    Search
                  </Button>
                }
              />
            </div>

            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading requests...</p>
              ) : filteredLoans.length === 0 ? (
                <Card>
                  <CardContent className="p-4 sm:p-6">No requests found.</CardContent>
                </Card>
              ) : (
                filteredLoans.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            {getAssetIcon((req.assetType || '').toString().toLowerCase())}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base">
                              {`${req.assetBrand || ''} ${req.assetModel || ''}`.trim() || 'Asset'}
                              <span className="text-xs text-muted-foreground ml-2">{req.requestNumber ? `#${req.requestNumber}` : ''}</span>
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">Ref: {req.requestNumber ?? req.id}</p>
                          </div>
                        </div>
                        {getStatusBadge(req.currentStatus)}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Requested Amount</p>
                          <p className="font-semibold text-sm sm:text-base">₹{(req.requestedAmount || 0).toLocaleString()}</p>
                        </div>
                        {req.loan?.approvedAmount && (
                          <div>
                            <p className="text-xs sm:text-sm text-muted-foreground">Approved Amount</p>
                            <p className="font-semibold text-sm sm:text-base">₹{req.loan.approvedAmount.toLocaleString()}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Submitted</p>
                          <p className="font-semibold text-sm sm:text-base">{new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <RequestActions
                          requestId={req.id}
                          requestStatus={req.currentStatus}
                          district={req.district}
                          customerId={req.customerId ?? req.customer?.id}
                          dashboardContext="customer"
                          onUpdated={handleRequestUpdate}
                        />
                        <Button variant="outline" size="sm" asChild className="shrink-0">
                          <Link href={`/asset-detail/${req.requestNumber ?? req.id}`}>
                            <Eye className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">View Details</span>
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Pagination */}
              {total > 0 && (
                <DashboardPagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

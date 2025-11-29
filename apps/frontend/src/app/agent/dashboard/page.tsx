"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  ClipboardList, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Eye
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import RequestActions from '@/components/request/RequestActions'
import { StatsCard } from "@/components/dashboard/StatsCard"
import { DashboardFilters } from "@/components/dashboard/DashboardFilters"
import { DashboardPagination } from "@/components/dashboard/DashboardPagination"
import { REQUEST_STATUS } from '@fundifyhub/types'
import { useDashboardStats } from "@/hooks/useDashboardStats"
import { getWithResult } from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import EmiScheduleTable from '@/components/request/EmiScheduleTable'
import { FileText } from 'lucide-react'
import { BACKEND_API_CONFIG } from "@/lib/urls"

export default function AgentDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const [requests, setRequests] = useState<any[]>([])
  const [showEmiSchedule, setShowEmiSchedule] = useState(false)
  const [emiScheduleFor, setEmiScheduleFor] = useState<any | null>(null)
  const [emiScheduleMode, setEmiScheduleMode] = useState<'preview'|'loan'>('preview')
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Fetch dashboard stats
  const { stats, loading: isLoadingStats } = useDashboardStats()

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const fetchRequests = async () => {
    setIsLoading(true)
    try {
      setError(null)
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      })
      
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter)
      }
      
      if (searchTerm) {
        queryParams.append('search', searchTerm)
      }
      
      const url = `${BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.ASSIGNED_REQUESTS}?${queryParams.toString()}`
      const response = await getWithResult<{ items: any[]; total: number }>(url)
      if (response.ok) {
        setRequests(response.data.items)
        setTotalCount(response.data.total)
      } else {
        console.warn('Failed to fetch assigned requests', response.error)
        setError(response.error?.message ?? 'Failed to fetch requests')
        setRequests([])
        setTotalCount(0)
      }
    } catch (error) {
      console.error("Failed to fetch requests", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [currentPage, pageSize, statusFilter, searchTerm])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case REQUEST_STATUS.INSPECTION_SCHEDULED:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
      case REQUEST_STATUS.INSPECTION_IN_PROGRESS:
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>
      case REQUEST_STATUS.INSPECTION_COMPLETED:
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      default:
        return <Badge variant="outline">{status.replace(/_/g, ' ')}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Agent Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage inspections and process loan requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatsCard
          title="Assigned Requests"
          value={totalCount}
          icon={<ClipboardList className="w-5 h-5" />}
          loading={isLoading}
        />
        <StatsCard
          title="Pending Inspections"
          value={stats?.pendingInspections ?? 0}
          icon={<Clock className="w-5 h-5" />}
          loading={isLoadingStats}
        />
        <StatsCard
          title="Completed Today"
          value={stats?.completedInspections ?? 0}
          icon={<CheckCircle className="w-5 h-5" />}
          loading={isLoadingStats}
        />
        <StatsCard
          title="Total Requests"
          value={stats?.totalRequests ?? 0}
          icon={<Users className="w-5 h-5" />}
          loading={isLoadingStats}
        />
      </div>

      {/* Filters */}
      <DashboardFilters
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Assigned Requests */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded">
          {error}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Loan Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
                <div className="text-center py-8">Loading requests...</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No requests found</div>
            ) : (
              requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <ClipboardList className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base">{request.customer?.firstName} {request.customer?.lastName}</h3>
                        {request.assignedAgent && (
                          <p className="text-xs text-muted-foreground">Assigned to: {request.assignedAgent.firstName} {request.assignedAgent.lastName}</p>
                        )}
                        <p className="text-xs sm:text-sm text-muted-foreground">{request.assetBrand} {request.assetModel}</p>
                        <p className="text-xs text-muted-foreground">ID: {request.requestNumber || request.id}</p>
                        {request.inspectionScheduledAt && (
                          <p className="text-xs text-muted-foreground">Inspection: {new Date(request.inspectionScheduledAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(request.currentStatus)}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4 mb-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Requested Amount</p>
                      <p className="font-semibold text-sm sm:text-base">₹{request.requestedAmount?.toLocaleString() ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Offered</p>
                      <p className="font-semibold text-sm sm:text-base text-primary">{request.adminOfferedAmount ? `₹${Number(request.adminOfferedAmount).toLocaleString()}` : '—'}</p>
                      {request.offerMadeDate && (
                        <p className="text-xs text-muted-foreground mt-1">{new Date(request.offerMadeDate).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Loan</p>
                      <p className="font-semibold text-sm sm:text-base">{request.loan?.approvedAmount ? `₹${Number(request.loan?.approvedAmount).toLocaleString()}` : '—'}</p>
                      {request.loan?.disbursedDate && (
                        <p className="text-xs text-muted-foreground mt-1">{new Date(request.loan.disbursedDate).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                      <p className="font-semibold text-sm sm:text-base capitalize">{request.currentStatus.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Assigned Date</p>
                      <p className="font-semibold text-sm sm:text-base">{new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">District</p>
                      <p className="font-semibold text-sm sm:text-base">{request.customer?.district || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-xs text-muted-foreground">Docs: {request._count?.documents || 0}</div>
                    <div className="text-xs text-muted-foreground">Comments: {request._count?.comments || 0}</div>
                    <div className="text-xs text-muted-foreground">Inspections: {request._count?.inspections || 0}</div>
                    {request.loan?.approvedAmount && (
                      <div className="ml-3 text-xs text-muted-foreground">Loan Remaining: ₹{request.loan?.remainingAmount?.toLocaleString() || 0}</div>
                    )}
                  </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      { (request.adminEmiSchedule || request.loan) && (
                        <Button variant="outline" size="sm" onClick={() => {
                          if (request.adminEmiSchedule) {
                            setEmiScheduleMode('preview')
                            setEmiScheduleFor(request.adminEmiSchedule)
                          } else if (request.loan?.emisSchedule) {
                            setEmiScheduleMode('loan')
                            setEmiScheduleFor(request.loan.emisSchedule)
                          }
                          setShowEmiSchedule(true)
                        }}>
                          <FileText className="w-4 h-4 mr-2" />
                          View EMI
                        </Button>
                      )}
                    <RequestActions
                      requestId={request.id}
                      requestStatus={request.currentStatus}
                      district={request.customer?.district || ''}
                      customerId={request.customer?.id}
                      assignedAgentId={request.assignedAgentId ?? request.assignedAgent?.id}
                      dashboardContext="agent"
                      onUpdated={(updatedRequest) => {
                        fetchRequests()
                      }}
                    />
                    <Button variant="outline" size="sm" asChild className="shrink-0">
                      <Link href={`/request/${request.requestNumber ?? request.id}`}>
                        <Eye className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">View Details</span>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )))}
          </div>
        </CardContent>
      </Card>

        {/* Pagination */}
        <Dialog open={showEmiSchedule} onOpenChange={(v) => setShowEmiSchedule(v)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>EMI Schedule</DialogTitle>
            </DialogHeader>
            {emiScheduleFor && (
              <div className="mt-4">
                <EmiScheduleTable mode={emiScheduleMode} rows={emiScheduleFor} />
              </div>
            )}
          </DialogContent>
        </Dialog>
        <DashboardPagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / pageSize)}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}
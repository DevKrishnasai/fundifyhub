"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Clock,
  Eye,
  Smartphone,
  Laptop,
  Car,
  CreditCard,
  ClipboardList,
  FileText,
  Activity,
  MapPin,
  Download,
} from "lucide-react"
import Link from "next/link"
import { getWithResult } from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import EmiScheduleTable from '@/components/request/EmiScheduleTable'
import type { RequestType } from '@fundifyhub/types'
import { ROLES, PENDING_REQUEST_STATUSES } from "@fundifyhub/types"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import logger from "@/lib/logger"
import RequestActions from '@/components/request/RequestActions'
import { StatsCard } from "@/components/dashboard/StatsCard"
import { DashboardFilters } from "@/components/dashboard/DashboardFilters"
import { DashboardPagination } from "@/components/dashboard/DashboardPagination"
import { useDashboardStats } from "@/hooks/useDashboardStats"

// Data will be loaded from admin API endpoints: /admin/get-active-loans and /admin/get-pending-requests

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    case "overdue":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    case "closed":
      return "bg-muted text-muted-foreground"
    case "defaulted":
      return "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-300"
    default:
      return "bg-muted text-muted-foreground"
  }
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    default:
      return "bg-muted text-muted-foreground"
  }
}

const getAssetIcon = (type: string) => {
  switch (type) {
    case "smartphone":
      return <Smartphone className="w-5 h-5" />
    case "laptop":
      return <Laptop className="w-5 h-5" />
    case "vehicle":
      return <Car className="w-5 h-5" />
    default:
      return <CreditCard className="w-5 h-5" />
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isLoading } = useAuth();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [riskFilter, setRiskFilter] = useState("all")
  const [districtFilter, setDistrictFilter] = useState<string>('all')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [activeTab, setActiveTab] = useState("loans")
  const [requests, setRequests] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false)
  const [showEmiSchedule, setShowEmiSchedule] = useState(false)
  const [emiScheduleFor, setEmiScheduleFor] = useState<any | null>(null)
  const [emiScheduleMode, setEmiScheduleMode] = useState<'preview'|'loan'>('preview')
  const [dataError, setDataError] = useState<string | null>(null)
  // request pagination is driven by pageSize and currentPage

  // Fetch dashboard stats
  const { stats, loading: isLoadingStats } = useDashboardStats()

  // Check if user is admin
  useEffect(() => {
    if (!isLoading && (!user || !user.roles?.some((r: string) => Object.values(ROLES).includes(r.toUpperCase())))) {
      router.push('/admin/login')
    }
  }, [user, isLoading, router])

  // Reset pagination when filters or tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm, statusFilter, districtFilter])

  // Fetch admin data (active loans and pending requests)
  useEffect(() => {
    let mounted = true
    async function fetchData() {
      setIsLoadingData(true)
      setDataError(null)
      try {
        // Build query for statuses (if user selected a specific status, pass it; if 'all', don't pass status param)
        const params: string[] = [];
        if (statusFilter && statusFilter !== 'all') {
          params.push('status=' + encodeURIComponent(statusFilter));
        }
        // if a district is selected in the UI, add it. Otherwise leave blank to let the server
        // return all allowed districts (server will restrict district-admins to their districts).
        if (districtFilter && districtFilter !== 'all') {
          params.push('district=' + encodeURIComponent(districtFilter));
        }

        // append pagination params
        const limit = pageSize
        const offset = (currentPage - 1) * pageSize
        params.push('limit=' + String(limit))
        params.push('offset=' + String(offset))

        const [activeResp, pendingResp] = await Promise.all([
          getWithResult(BACKEND_API_CONFIG.ENDPOINTS.ADMIN.GET_ACTIVE_LOANS),
          getWithResult(BACKEND_API_CONFIG.ENDPOINTS.ADMIN.REQUESTS_LIST + (params.length ? '?' + params.join('&') : '')),
        ])

        if (!mounted) return

        const fetchedLoans = (activeResp.ok ? activeResp.data : []) .map((loan: any) => {
          const customer = loan.request?.customer
          const borrower = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown'
          const outstanding = loan.remainingAmount ?? (loan.totalAmount ? loan.totalAmount - (loan.totalPaidAmount || 0) : 0)
          const overdueAmount = (loan.overdueEMIs || 0) * (loan.emiAmount || 0)

          return {
            id: loan.id,
            borrower,
            asset: loan.request?.assetBrand && loan.request?.assetModel ? `${loan.request.assetBrand} ${loan.request.assetModel}` : loan.request?.assetType || 'N/A',
            outstandingAmount: outstanding || 0,
            nextEmiDate: loan.firstEMIDate || null,
            overdueAmount: overdueAmount || 0,
            collectionAttempts: 0,
            status: (loan.status || 'active').toLowerCase(),
            riskLevel: 'medium',
            loanAmount: loan.approvedAmount || loan.totalAmount || 0,
            emiAmount: loan.emiAmount || 0,
          }
        })

        const fetchedRequests = (pendingResp.ok ? pendingResp.data.requests : []) .map((r: any) => ({
          id: r.id,
          requestNumber: r.requestNumber || r.id,
          asset: r.assetBrand && r.assetModel ? `${r.assetBrand} ${r.assetModel}` : r.assetType || 'N/A',
          assetType: r.assetType || 'unknown',
          brand: r.assetBrand || '',
          model: r.assetModel || '',
          condition: r.assetCondition || 'Unknown',
          requestedAmount: r.requestedAmount || 0,
          submittedDate: r.submittedDate || r.createdAt || new Date().toISOString(),
          district: r.district || r.customer?.district || '',
          currentStatus: r.currentStatus || 'PENDING',
          assignedAgentId: r.assignedAgentId || null,
          assignedAgent: r.assignedAgent || null,
          commentsCount: r._count?.comments || 0,
          documentsCount: r._count?.documents || 0,
          inspectionsCount: r._count?.inspections || 0,
          offeredAmount: r.adminOfferedAmount || null,
          offeredTenure: r.adminTenureMonths || null,
          offeredInterest: r.adminInterestRate || null,
          offerMadeDate: r.offerMadeDate || null,
          adminEmiSchedule: r.adminEmiSchedule || null,
          inspectionScheduledAt: r.inspectionScheduledAt || null,
          loanApprovedAmount: r.loan?.approvedAmount || null,
          loanDisbursedDate: r.loan?.disbursedDate || null,
          loanTotalPaidAmount: r.loan?.totalPaidAmount || 0,
          loanRemainingAmount: r.loan?.remainingAmount || 0,
          loanStatus: r.loan?.status || null,
          userName: r.customer ? `${r.customer.firstName || ''} ${r.customer.lastName || ''}`.trim() : 'Unknown',
          userPhone: r.customer?.phoneNumber || r.customer?.phone || '',
        }))

        setLoans(fetchedLoans)
        setRequests(fetchedRequests)
      } catch (err: any) {
        logger.error('Failed to load admin data', err);
        setDataError(err?.message || 'Failed to load data')
      } finally {
        setIsLoadingData(false)
      }
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    if (!isLoading && user && user.roles?.some((r: string) => [ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN].includes(String(r).toUpperCase()))) {
      fetchData()
      // Poll only when admin views the requests tab
      interval = setInterval(() => {
        if (activeTab === 'requests') fetchData();
      }, 15000);
    }

    return () => { mounted = false; if (interval) clearInterval(interval); }
  }, [isLoading, user, activeTab, currentPage, pageSize, statusFilter, districtFilter])

  // Show loading while checking auth
  if (isLoading || !user || !user.roles?.some((r: string) => Object.values(ROLES).includes(r.toUpperCase()))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const filteredLoans = loans.filter((loan: any) => {
    const matchesSearch =
      loan.borrower.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.asset.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || loan.status === statusFilter
    const matchesRisk = riskFilter === "all" || loan.riskLevel === riskFilter
    return matchesSearch && matchesStatus && matchesRisk
  })

  const filteredRequests = requests.filter((request: any) => {
    const matchesSearch =
      request.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const totalDisbursed = loans.reduce((s, l) => s + (l.loanAmount || 0), 0)
  const totalOutstanding = loans.reduce((s, l) => s + (l.outstandingAmount || 0), 0)

  const handleRequestUpdate = (updatedRequest: any) => {
    if (!updatedRequest || !updatedRequest.id) {
      console.warn('handleRequestUpdate called with invalid updatedRequest', updatedRequest);
      return;
    }
    setRequests((prev) => 
      prev.map((p) => p.id === updatedRequest.id ? { ...p, ...updatedRequest } : p)
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage loans and review requests in your district</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Requests"
            value={stats?.totalRequests ?? 0}
            icon={<FileText className="w-5 h-5" />}
            loading={isLoadingStats}
          />
          <StatsCard
            title="Active Loans"
            value={stats?.activeLoans ?? 0}
            icon={<Activity className="w-5 h-5" />}
            loading={isLoadingStats}
          />
          <StatsCard
            title="Total Disbursed"
            value={`₹${(stats?.totalDisbursed ?? 0).toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            loading={isLoadingStats}
          />
          <StatsCard
            title="Pending Reviews"
            value={stats?.pendingCount ?? 0}
            icon={<Clock className="w-5 h-5" />}
            loading={isLoadingStats}
          />
        </div>

        {/* Filters */}
        <DashboardFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          districtFilter={districtFilter}
          onDistrictChange={setDistrictFilter}
          districts={user?.districts?.map(d => ({ label: d, value: d })) || []}
        />

        {/* Tabs to separate loans and pending requests */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="loans">Active Loans</TabsTrigger>
            <TabsTrigger value="requests">Pending Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="loans" className="space-y-4">
            {/* Loans Table */}
            <div className="space-y-4">
              {filteredLoans
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((loan) => (
                <Card key={loan.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 md:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-col md:flex-row md:items-center gap-2">
                            <h3 className="font-semibold text-lg">{loan.borrower}</h3>
                            <div className="flex gap-2">
                              <Badge className={getStatusColor(loan.status)}>
                                {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                              </Badge>
                              <Badge className={getRiskColor(loan.riskLevel)}>
                                {loan.riskLevel.charAt(0).toUpperCase() + loan.riskLevel.slice(1)} Risk
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Loan ID</p>
                              <p className="font-medium">{loan.id}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Asset</p>
                              <p className="font-medium">{loan.asset}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Outstanding</p>
                              <p className="font-medium">₹{loan.outstandingAmount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Next EMI</p>
                              <p className="font-medium">
                                {loan.nextEmiDate ? new Date(loan.nextEmiDate).toLocaleDateString() : "N/A"}
                              </p>
                            </div>
                          </div>

                          {loan.overdueAmount > 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span className="text-red-800 font-medium">
                                  Overdue Amount: ₹{loan.overdueAmount.toLocaleString()}
                                </span>
                                <span className="text-red-600 text-sm">
                                  ({loan.collectionAttempts} collection attempts)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/request/${loan.id.replace("LN", "LR")}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredLoans.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No loans found matching your criteria.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {/* Pending Requests Section */}
            <div className="space-y-4">
              {filteredRequests
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((request: any) => (
                  (!request || !request.id) ? null : (
                <Card key={request.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                          {getAssetIcon(request.assetType)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg truncate">{request.asset}</h3>
                          <p className="text-sm text-muted-foreground">Request ID: {request.requestNumber ?? request.id}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="w-fit">
                        <Clock className="w-3 h-3 mr-1" />
                        {request.currentStatus.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">User</p>
                        <p className="font-semibold text-sm sm:text-base">{request.userName}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{request.userPhone}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Offered</p>
                        <p className="font-semibold text-sm sm:text-base text-primary">{request.offeredAmount ? `₹${Number(request.offeredAmount).toLocaleString()}` : '—'}</p>
                        {request.offerMadeDate && (
                          <p className="text-xs text-muted-foreground mt-1">{new Date(request.offerMadeDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Loan / Disbursed</p>
                        <p className="font-semibold text-sm sm:text-base">{request.loanApprovedAmount ? `₹${Number(request.loanApprovedAmount).toLocaleString()}` : '—'}</p>
                        {request.loanDisbursedDate && (
                          <p className="text-xs text-muted-foreground mt-1">{new Date(request.loanDisbursedDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Asset Details</p>
                        <p className="font-semibold text-sm sm:text-base truncate">
                          {request.brand} {request.model}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {request.condition}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Requested Amount</p>
                        <p className="font-semibold text-sm sm:text-base text-primary">
                          ₹{request.requestedAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Submitted</p>
                        <p className="font-semibold text-sm sm:text-base">
                          {new Date(request.submittedDate).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs sm:text-sm text-muted-foreground">{request.district}</span>
                        </div>
                        {request.inspectionScheduledAt && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs sm:text-sm text-muted-foreground">Inspection: {new Date(request.inspectionScheduledAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">Docs: {request.documentsCount}</div>
                        <div className="text-xs text-muted-foreground">Comments: {request.commentsCount}</div>
                        <div className="text-xs text-muted-foreground">Inspections: {request.inspectionsCount}</div>
                        {request.loanApprovedAmount && (
                          <div className="ml-3 text-xs text-muted-foreground">Loan Remaining: ₹{request.loanRemainingAmount?.toLocaleString() || 0}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                      {request.assignedAgent && (
                        <div className="text-xs text-muted-foreground mr-2">Assigned to: {request.assignedAgent.firstName} {request.assignedAgent.lastName}</div>
                      )}
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
                        district={request.district}
                        customerId={request.customer?.id}
                        assignedAgentId={request.assignedAgentId ?? request.assignedAgent?.id}
                        dashboardContext="admin"
                        onUpdated={handleRequestUpdate}
                      />
                      <Button variant="outline" size="sm" asChild className="shrink-0">
                        <Link href={`/asset-detail/${request.requestNumber ?? request.id}`}>
                          <Eye className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">View Details</span>
                        </Link>
                      </Button>
                    </div>
                    </div>
                  </CardContent>
                </Card>
              )))}

              {filteredRequests.length === 0 && (
                <Card>
                  <CardContent className="p-8 sm:p-12 text-center">
                    <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">No pending requests</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">All loan requests have been reviewed.</p>
                  </CardContent>
                </Card>
              )}
            </div>
            {/* Pagination controls for requests list */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">Showing {filteredRequests.length} requests</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>
                    Previous
                  </Button>
                  <Button size="sm" onClick={() => setCurrentPage(currentPage + 1)}>
                    Next
                  </Button>
                </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* EMI Schedule Dialog */}
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

        {/* Pagination */}
        <DashboardPagination
          currentPage={currentPage}
          totalPages={Math.ceil((activeTab === "loans" ? filteredLoans.length : filteredRequests.length) / pageSize)}
          totalItems={activeTab === "loans" ? filteredLoans.length : filteredRequests.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Bell,
  Plus,
  Smartphone,
  Laptop,
  Car,
  Clock,
  CheckCircle,
  Calendar,
  IndianRupee,
  Eye,
  CreditCard,
  User,
  LogOut,
  Filter,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { getWithResult } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import toast from "@/lib/toast"
import { REQUEST_STATUS, ALLOWED_UPDATE_STATUSES, PENDING_REQUEST_STATUSES, LOAN_STATUS } from '@fundifyhub/types'

// Client-side state will hold paginated requests fetched from backend
const notifications: any[] = []

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

// Payment dialog removed for requests – requests are shown as cards with actions below

export default function UserDashboard() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [requests, setRequests] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(10)
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    // whenever page or statusFilter changes, fetch the matching page
    fetchRequests(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter])

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

  // Server-side filtering in place. Use the returned requests directly.
  const filteredLoans = requests

  // no-op payment handler removed — requests are not loans and do not support in-page payments here

  return (
    <div className="min-h-screen bg-background">
      {/* Header removed — global Navbar renders the app header */}

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, John!</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your loan requests and track your repayments
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Active Loans</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {requests.filter((r) => r.loan && r.loan.status === LOAN_STATUS.ACTIVE).length}
                  </p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {requests.filter((r) => PENDING_REQUEST_STATUSES.includes(r.currentStatus)).length}
                  </p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Borrowed</p>
                  <p className="text-xl sm:text-2xl font-bold">₹74,000</p>
                </div>
                <IndianRupee className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Next EMI</p>
                  <p className="text-xl sm:text-2xl font-bold">₹7,500</p>
                </div>
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Loan Requests */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-bold">Your Loan Requests</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search by ref, brand or model"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                    className="w-[220px]"
                  />
                  <Button size="sm" onClick={() => { setPage(1); fetchRequests(1); }}>Search</Button>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full sm:w-auto" asChild>
                  <Link href="/upload-asset">
                    <Plus className="w-4 h-4 mr-2" />
                    Pledge New Asset
                  </Link>
                </Button>
              </div>
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
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
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

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto bg-transparent" asChild>
                          <Link href={`/asset-detail/${req.requestNumber ?? req.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </Button>

                        {/* Editing is not allowed once customer submits assets; Edit button intentionally removed */}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button size="sm" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

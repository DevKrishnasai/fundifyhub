"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Download,
  Phone,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  MapPin,
  Clock,
  XCircle,
  Eye,
  User,
  Smartphone,
  Laptop,
  Car,
  CreditCard,
} from "lucide-react"
import Link from "next/link"
import { apiGet } from "@/lib/api-client"
import { API_CONFIG, apiUrl } from '@/lib/utils'

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
  const { user, isLoading } = useAuth()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [riskFilter, setRiskFilter] = useState("all")
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [collectionNote, setCollectionNote] = useState("")
  const [actionType, setActionType] = useState("")
  const [activeTab, setActiveTab] = useState("loans")
  const [requests, setRequests] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false)
  const [selectedLoanForCollection, setSelectedLoanForCollection] = useState<any>(null)
  const [collectionFormData, setCollectionFormData] = useState({
    agent: "",
    pickupDate: "",
  })

  // Check if user is admin
  useEffect(() => {
    if (!isLoading && (!user || !user.roles?.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase())))) {
      router.push('/admin/login')
    }
  }, [user, isLoading, router])

  // Fetch admin data (active loans and pending requests)
  useEffect(() => {
    let mounted = true
    async function fetchData() {
      setIsLoadingData(true)
      setDataError(null)
      try {
        const [activeResp, pendingResp] = await Promise.all([
          apiGet(API_CONFIG.ENDPOINTS.ADMIN.GET_ACTIVE_LOANS),
          apiGet(API_CONFIG.ENDPOINTS.ADMIN.GET_PENDING_REQUESTS),
        ])

        if (!mounted) return

        const fetchedLoans = (activeResp.data || []).map((loan: any) => {
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

        const fetchedRequests = (pendingResp.data || []).map((r: any) => ({
          id: r.id,
          asset: r.assetBrand && r.assetModel ? `${r.assetBrand} ${r.assetModel}` : r.assetType || 'N/A',
          assetType: r.assetType || 'unknown',
          brand: r.assetBrand || '',
          model: r.assetModel || '',
          condition: r.assetCondition || 'Unknown',
          requestedAmount: r.requestedAmount || 0,
          submittedDate: r.submittedDate || r.createdAt || new Date().toISOString(),
          district: r.district || r.customer?.district || '',
          userName: r.customer ? `${r.customer.firstName || ''} ${r.customer.lastName || ''}`.trim() : 'Unknown',
          userPhone: r.customer?.phoneNumber || r.customer?.phone || '',
        }))

        setLoans(fetchedLoans)
        setRequests(fetchedRequests)
      } catch (err: any) {
        console.error('Failed to load admin data', err)
        setDataError(err?.message || 'Failed to load data')
      } finally {
        setIsLoadingData(false)
      }
    }

    if (!isLoading && user && user.roles?.some((r: string) => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()))) {
      fetchData()
    }

    return () => { mounted = false }
  }, [isLoading, user])

  // Show loading while checking auth
  if (isLoading || !user || !user.roles?.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()))) {
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

  const handleCollectionAction = (loan: any, action: string) => {
    setSelectedLoan(loan)
    setActionType(action)
    setCollectionNote("")
  }

  const submitCollectionAction = () => {
    setSelectedLoan(null)
    setActionType("")
    setCollectionNote("")
  }

  const handleAssignCollection = (loan: any) => {
    setSelectedLoanForCollection(loan)
    setCollectionFormData({ agent: "", pickupDate: "" })
    setIsCollectionDialogOpen(true)
  }

  const submitCollectionAssignment = () => {
    setIsCollectionDialogOpen(false)
    setSelectedLoanForCollection(null)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                  <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-200" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Loans</p>
                  <p className="text-lg font-semibold">{loans.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900">
                  <Clock className="w-4 h-4 text-orange-600 dark:text-orange-200" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reviews</p>
                  <p className="text-lg font-semibold">{requests.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-200" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-lg font-semibold">{loans.filter(l => l.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-200" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-lg font-semibold">{loans.filter(l => l.status === 'overdue').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Disbursed</p>
                <p className="text-lg font-semibold">
                  ₹{totalDisbursed.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-lg font-semibold">
                  ₹{totalOutstanding.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs to separate loans and pending requests */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="loans">Active Loans</TabsTrigger>
            <TabsTrigger value="requests">Pending Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="loans" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search by borrower name, loan ID, or asset..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk</SelectItem>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Loans Table */}
            <div className="space-y-4">
              {filteredLoans.map((loan) => (
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

                          {loan.status === "active" && (
                            <Button size="sm" onClick={() => handleAssignCollection(loan)}>
                              <MapPin className="w-4 h-4 mr-1" />
                              Assign Collection
                            </Button>
                          )}

                          {loan.status === "overdue" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleCollectionAction(loan, "call")}>
                                <Phone className="w-4 h-4 mr-1" />
                                Call
                              </Button>
                            </div>
                          )}
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
            <Card>
              <CardContent className="p-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name, asset, or request ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {filteredRequests.map((request: any) => (
                <Card key={request.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                          {getAssetIcon(request.assetType)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base sm:text-lg truncate">{request.asset}</h3>
                          <p className="text-sm text-muted-foreground">Request ID: {request.id}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="w-fit">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">User</p>
                        <p className="font-semibold text-sm sm:text-base">{request.userName}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{request.userPhone}</p>
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
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/request/${request.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

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
          </TabsContent>
        </Tabs>

        {/* Collection Action Dialog */}
        <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionType === "call" ? "Record Collection Call" : "Mark Loan as Default"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Borrower</Label>
                <p className="font-medium">{selectedLoan?.borrower}</p>
              </div>
              <div>
                <Label>Loan ID</Label>
                <p className="font-medium">{selectedLoan?.id}</p>
              </div>
              <div>
                <Label>Overdue Amount</Label>
                <p className="font-medium text-red-600">₹{selectedLoan?.overdueAmount?.toLocaleString()}</p>
              </div>
              <div>
                <Label htmlFor="collection-note">{actionType === "call" ? "Call Notes" : "Default Reason"}</Label>
                <Textarea
                  id="collection-note"
                  placeholder={
                    actionType === "call"
                      ? "Enter call details and borrower response..."
                      : "Enter reason for marking as default..."
                  }
                  value={collectionNote}
                  onChange={(e) => setCollectionNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={submitCollectionAction} className="flex-1">
                  {actionType === "call" ? "Save Call Record" : "Mark as Default"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedLoan(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Inline Collection Assignment Dialog */}
        <Dialog open={isCollectionDialogOpen} onOpenChange={setIsCollectionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Asset Collection</DialogTitle>
              <DialogDescription>
                Assign an agent or yourself to collect the asset for loan {selectedLoanForCollection?.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Borrower Details</Label>
                <Card className="bg-muted/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{selectedLoanForCollection?.borrower}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Asset:</span>
                      <span className="font-medium">{selectedLoanForCollection?.asset}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Loan Amount:</span>
                      <span className="font-medium">₹{selectedLoanForCollection?.loanAmount?.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label htmlFor="agent-select" className="text-sm font-medium mb-2 block">
                  Select Agent or Assign to Yourself
                </Label>
                <Select
                  value={collectionFormData.agent}
                  onValueChange={(value) => setCollectionFormData((prev) => ({ ...prev, agent: value }))}
                >
                  <SelectTrigger id="agent-select">
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="myself">Myself (Admin)</SelectItem>
                    <SelectItem value="vikram">Vikram Desai - Senior Agent</SelectItem>
                    <SelectItem value="priya">Priya Sharma - Senior Agent</SelectItem>
                    <SelectItem value="amit">Amit Singh - Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pickup-date" className="text-sm font-medium mb-2 block">
                  Scheduled Pickup Date
                </Label>
                <Input
                  id="pickup-date"
                  type="date"
                  value={collectionFormData.pickupDate}
                  onChange={(e) => setCollectionFormData((prev) => ({ ...prev, pickupDate: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => setIsCollectionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={submitCollectionAssignment}
                  disabled={!collectionFormData.agent || !collectionFormData.pickupDate}
                >
                  Assign Collection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
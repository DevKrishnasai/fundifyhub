"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Smartphone,
  Laptop,
  Car,
  CreditCard,
  IndianRupee,
  FileText,
  MessageSquare,
  Clock,
  AlertCircle,
  XCircle,
  Percent,
  TrendingUp,
  Info,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useSearchParams, useParams, useRouter } from "next/navigation"
import apiClient from "@/lib/api-client"
import RequestActions from "@/components/request/RequestActions"

interface RequestType {
  id: string;
  requestNumber: string | null;
  customerId: string;
  requestedAmount: number;
  district: string;
  currentStatus: string;
  purchaseYear: number | null;
  assetType: string;
  assetBrand: string;
  assetModel: string;
  assetCondition: string;
  AdditionalDescription: string | null;
  adminOfferedAmount: number | null;
  adminTenureMonths: number | null;
  adminInterestRate: number | null;
  offerMadeDate: string | null;
  penaltyPercentage: number | null;
  lateFeePercentage: number | null;
  adminRequestedInfo: string | null;
  submittedDate: string;
  loan?: LoanType | null;
  documents?: DocumentType[];
  comments?: CommentType[];
  assignedAgentId?: string | null;
}

interface LoanType {
  id: string;
  approvedAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  totalInterest: number;
  totalAmount: number;
  status: string;
  disbursedDate: string | null;
  firstEMIDate: string | null;
}

interface EMIScheduleType {
  id: string;
  emiNumber: number;
  dueDate: string;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  status: string;
  paidDate: string | null;
  lateFee: number;
}

interface DocumentType {
  id: string;
  fileKey: string;
  fileName: string;
  documentType: string;
  documentCategory: string;
}

interface CommentType {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  author?: {
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

function getAssetIcon(type: string) {
  const lowerType = type.toLowerCase()
  if (lowerType.includes('phone') || lowerType.includes('mobile')) return <Smartphone className="w-5 h-5" />
  if (lowerType.includes('laptop') || lowerType.includes('computer')) return <Laptop className="w-5 h-5" />
  if (lowerType.includes('vehicle') || lowerType.includes('car') || lowerType.includes('bike')) return <Car className="w-5 h-5" />
  return <CreditCard className="w-5 h-5" />
}

function getStatusBadge(status: string) {
  const statusUpper = status.toUpperCase()
  if (statusUpper.includes('ACTIVE') || statusUpper.includes('DISBURSED')) {
    return <Badge className="bg-chart-3/10 text-chart-3 hover:bg-chart-3/20">Active</Badge>
  }
  if (statusUpper === 'PENDING') {
    return <Badge variant="secondary">Pending</Badge>
  }
  if (statusUpper.includes('REJECT')) {
    return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Rejected</Badge>
  }
  if (statusUpper === 'CLOSED') {
    return <Badge variant="outline">Closed</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const searchParams = useSearchParams()
  const isAdminView = searchParams.get("admin") === "true"
  
  const [requestData, setRequestData] = useState<RequestType | null>(null)
  const [emiSchedule, setEmiSchedule] = useState<EMIScheduleType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchRequestData = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get(`/api/v1/requests/${id}`)
        if (response.data.success) {
          setRequestData(response.data.data)
          if (response.data.data.loan?.id) {
            const emiResponse = await apiClient.get(`/api/v1/loans/${response.data.data.loan.id}/emis`)
            if (emiResponse.data.success) {
              setEmiSchedule(emiResponse.data.data)
            }
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load request details')
      } finally {
        setLoading(false)
      }
    }
    fetchRequestData()
  }, [id])

  const handleAddComment = async () => {
    if (!newComment.trim() || !requestData) return
    try {
      setIsSubmitting(true)
      setActionError(null)
      await apiClient.post(`/api/v1/requests/${id}/comments`, {
        content: newComment,
        commentType: 'GENERAL'
      })
      setNewComment("")
      window.location.reload()
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to add comment'
      setActionError(errorMsg)
      console.error('Failed to add comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    )
  }

  if (error || !requestData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Error Loading Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'Request not found'}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const showLoanDetails = requestData.loan !== null && requestData.loan !== undefined
  const hasOffer = requestData.adminOfferedAmount !== null && requestData.adminOfferedAmount !== undefined
  const assetPhotos = requestData.documents?.filter(doc => doc.documentCategory === 'ASSET') || []

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Action Error Alert */}
        {actionError && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-destructive mb-1">Action Failed</p>
              <p className="text-sm text-destructive/90">{actionError}</p>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-destructive hover:text-destructive/80"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Request Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                {getAssetIcon(requestData.assetType)}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">
                  {requestData.assetBrand} {requestData.assetModel}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Request ID: {requestData.requestNumber || requestData.id.slice(0, 8)}
                </p>
              </div>
            </div>
            <div className="shrink-0">{getStatusBadge(requestData.currentStatus)}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Action Card */}
            <Card className="border-2 border-primary/30 bg-linear-to-br from-primary/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Available Actions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Actions available for current request status.
                </p>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-background rounded-lg border mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Requested Amount</p>
                  <p className="text-3xl font-bold">₹{requestData.requestedAmount.toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <RequestActions 
                    requestId={requestData.id}
                    requestStatus={requestData.currentStatus}
                    district={requestData.district}
                    customerId={requestData.customerId}
                    assignedAgentId={requestData.assignedAgentId}
                    onUpdated={(updatedData) => {
                      // Reload page to show updated data
                      window.location.reload();
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Loan Offer Details */}
            {hasOffer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Loan Offer Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <IndianRupee className="w-4 h-4 text-primary" />
                        <p className="text-xs text-muted-foreground">Offered Amount</p>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        ₹{requestData.adminOfferedAmount?.toLocaleString() || '0'}
                      </p>
                    </div>

                    <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-accent" />
                        <p className="text-xs text-muted-foreground">Tenure</p>
                      </div>
                      <p className="text-2xl font-bold text-accent">
                        {requestData.adminTenureMonths || 0} <span className="text-sm">mo</span>
                      </p>
                    </div>

                    <div className="p-4 bg-chart-3/5 rounded-lg border border-chart-3/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Percent className="w-4 h-4 text-chart-3" />
                        <p className="text-xs text-muted-foreground">Interest Rate</p>
                      </div>
                      <p className="text-2xl font-bold text-chart-3">
                        {requestData.adminInterestRate || 0}% <span className="text-sm">p.a.</span>
                      </p>
                    </div>

                    <div className="p-4 bg-orange-500/5 rounded-lg border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <p className="text-xs text-muted-foreground">Penalty %</p>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">
                        {requestData.penaltyPercentage || 4}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Late payment</p>
                    </div>

                    <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-red-600" />
                        <p className="text-xs text-muted-foreground">Late Fee %</p>
                      </div>
                      <p className="text-2xl font-bold text-red-600">
                        {requestData.lateFeePercentage || 0.01}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Per day overdue</p>
                    </div>

                    <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        <p className="text-xs text-muted-foreground">EMI Amount</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        ₹{requestData.loan?.emiAmount?.toLocaleString() || 'TBD'}
                      </p>
                    </div>
                  </div>

                  {requestData.offerMadeDate && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Offer made:</strong> {new Date(requestData.offerMadeDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer Offer Response Card */}
            {requestData.currentStatus === 'OFFER_SENT' && !isAdminView && hasOffer && (
              <Card className="border-2 border-primary/30 bg-linear-to-br from-primary/5 to-background">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    Action Required
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    The admin has made you an offer. Please review and respond.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-1">Requested</p>
                      <p className="text-xl font-bold">₹{requestData.requestedAmount.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-1">Offered</p>
                      <p className="text-xl font-bold text-primary">
                        ₹{requestData.adminOfferedAmount?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <RequestActions 
                      requestId={requestData.id}
                      requestStatus={requestData.currentStatus}
                      district={requestData.district}
                      customerId={requestData.customerId}
                      assignedAgentId={requestData.assignedAgentId}
                      dashboardContext="customer"
                      onUpdated={(updatedData) => {
                        window.location.reload();
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Asset Details */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Asset Type</p>
                    <p className="font-semibold capitalize">{requestData.assetType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Condition</p>
                    <p className="font-semibold">{requestData.assetCondition}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Brand</p>
                    <p className="font-semibold">{requestData.assetBrand}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Model</p>
                    <p className="font-semibold">{requestData.assetModel}</p>
                  </div>
                  {requestData.purchaseYear && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Purchase Year</p>
                      <p className="font-semibold">{requestData.purchaseYear}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">District</p>
                    <p className="font-semibold">{requestData.district}</p>
                  </div>
                </div>
                {requestData.AdditionalDescription && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm leading-relaxed">{requestData.AdditionalDescription}</p>
                  </div>
                )}

                {/* Asset Photos from Documents */}
                {assetPhotos.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Asset Photos</p>
                    <div className="grid grid-cols-2 gap-3">
                      {assetPhotos.map((doc) => (
                        <div
                          key={doc.id}
                          className="relative aspect-square rounded-lg overflow-hidden bg-muted border"
                        >
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                            <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                            <p className="text-xs text-muted-foreground text-center">{doc.fileName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Loan & EMI Details */}
            {showLoanDetails && requestData.loan && (
              <Card>
                <CardHeader>
                  <CardTitle>Loan Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Approved Amount</p>
                      <p className="font-semibold">₹{requestData.loan.approvedAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Interest Rate</p>
                      <p className="font-semibold">{requestData.loan.interestRate}% p.a.</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tenure</p>
                      <p className="font-semibold">{requestData.loan.tenureMonths} months</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">EMI Amount</p>
                      <p className="font-semibold">₹{requestData.loan.emiAmount.toLocaleString()}</p>
                    </div>
                  </div>

                  {emiSchedule.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          View EMI Schedule ({emiSchedule.length} EMIs)
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>EMI Schedule</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>EMI #</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>EMI</TableHead>
                                <TableHead>Principal</TableHead>
                                <TableHead>Interest</TableHead>
                                <TableHead>Late Fee</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {emiSchedule.map((emi) => (
                                <TableRow key={emi.id}>
                                  <TableCell>{emi.emiNumber}</TableCell>
                                  <TableCell>{new Date(emi.dueDate).toLocaleDateString()}</TableCell>
                                  <TableCell>₹{emi.emiAmount.toLocaleString()}</TableCell>
                                  <TableCell>₹{emi.principalAmount.toLocaleString()}</TableCell>
                                  <TableCell>₹{emi.interestAmount.toLocaleString()}</TableCell>
                                  <TableCell>
                                    {emi.lateFee > 0 ? `₹${emi.lateFee.toLocaleString()}` : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={emi.status === 'PAID' ? 'default' : 'secondary'}>
                                      {emi.status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Comments ({requestData.comments?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {requestData.comments && requestData.comments.length > 0 ? (
                  requestData.comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">
                          {comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                )}

                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-20"
                  />
                  <Button
                    onClick={handleAddComment}
                    size="sm"
                    disabled={!newComment.trim() || isSubmitting}
                  >
                    Add Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {getStatusBadge(requestData.currentStatus)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Requested Amount</p>
                  <p className="text-lg font-bold">₹{requestData.requestedAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                  <p className="text-sm">{new Date(requestData.submittedDate).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Download Agreement
                </Button>
                {isAdminView && (
                  <Button variant="outline" className="w-full" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Customer
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

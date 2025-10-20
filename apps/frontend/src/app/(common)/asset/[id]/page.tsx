"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Smartphone,
  Laptop,
  Car,
  CreditCard,
  IndianRupee,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useSearchParams, useParams } from "next/navigation"

// Mock data for demonstration
const assetDetails = {
  id: "LR001",
  asset: "iPhone 14 Pro",
  type: "phone",
  requestedAmount: 45000,
  approvedAmount: 42000,
  status: "active", // Can be: pending, cancelled, rejected, active, closed
  submittedDate: "2025-01-15",
  approvedDate: "2025-01-18",
  interestRate: 12,
  tenure: 6,
  nextEMI: "2025-02-15",
  emiAmount: 7500,
  description: "iPhone 14 Pro 128GB in excellent condition with original box and accessories",
  condition: "Excellent",
  purchaseDate: "2024-06-15",
  originalPrice: 79900,
  photos: ["/iphone-14-pro-front.jpg", "/iphone-14-pro-back.jpg"],
  hasConditionalApproval: true, // Set to true to show conditional approval card
  conditionalAmount: 40000,
  adminMessage:
    "Based on current market evaluation and asset condition, we can approve your loan for ₹40,000 instead of the requested ₹45,000. This amount reflects the current market value of your iPhone 14 Pro.",
  timeline: [
    {
      date: "2025-01-15",
      status: "submitted",
      title: "Application Submitted",
      description: "Loan request submitted with asset details and documents",
    },
    {
      date: "2025-01-16",
      status: "under_review",
      title: "Under Review",
      description: "District admin reviewing the application",
    },
    {
      date: "2025-01-18",
      status: "approved",
      title: "Loan Approved",
      description: "Loan approved for ₹42,000 at 12% interest rate",
    },
    {
      date: "2025-01-20",
      status: "inspection",
      title: "Asset Inspection",
      description: "Field agent inspected and verified the asset",
    },
    {
      date: "2025-01-22",
      status: "disbursed",
      title: "Amount Disbursed",
      description: "Loan amount transferred to borrower's account",
    },
  ],
  comments: [
    {
      id: 1,
      author: "District Admin",
      role: "admin",
      date: "2025-01-18",
      message: "Asset condition verified. Approving loan for ₹42,000 based on current market value.",
    },
    {
      id: 2,
      author: "Field Agent",
      role: "agent",
      date: "2025-01-20",
      message: "Physical inspection completed. Asset matches the photos and description provided.",
    },
  ],
}

const emiSchedule = [
  { month: 1, date: "2025-02-15", amount: 7500, principal: 6000, interest: 1500, status: "upcoming" },
  { month: 2, date: "2025-03-15", amount: 7500, principal: 6060, interest: 1440, status: "upcoming" },
  { month: 3, date: "2025-04-15", amount: 7500, principal: 6121, interest: 1379, status: "upcoming" },
  { month: 4, date: "2025-05-15", amount: 7500, principal: 6183, interest: 1317, status: "upcoming" },
  { month: 5, date: "2025-06-15", amount: 7500, principal: 6245, interest: 1255, status: "upcoming" },
  { month: 6, date: "2025-07-15", amount: 7500, principal: 6308, interest: 1192, status: "upcoming" },
]

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
    case "active":
      return <Badge className="bg-chart-3/10 text-chart-3 hover:bg-chart-3/20">Active</Badge>
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "rejected":
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Rejected</Badge>
    case "closed":
      return <Badge variant="outline">Closed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getTimelineIcon(status: string) {
  switch (status) {
    case "submitted":
    case "under_review":
    case "inspection":
      return <Clock className="w-4 h-4" />
    case "approved":
    case "disbursed":
      return <CheckCircle className="w-4 h-4 text-chart-3" />
    case "rejected":
      return <XCircle className="w-4 h-4 text-destructive" />
    default:
      return <AlertCircle className="w-4 h-4" />
  }
}

export default function AssetDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [newComment, setNewComment] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const searchParams = useSearchParams()
  const isAdminView = searchParams.get("admin") === "true"

  const handleAddComment = () => {
    if (newComment.trim()) {
      // Add comment logic here
      setNewComment("")
    }
  }

  const handleAcceptConditionalApproval = () => {
    // Handle accept logic here
    console.log("Accepted conditional approval")
  }

  const handleRejectConditionalApproval = () => {
    if (rejectionReason.trim()) {
      // Handle reject logic here
      console.log("Rejected with reason:", rejectionReason)
      setRejectionReason("")
    }
  }

  const handleAdminAccept = () => {
    console.log("Admin accepted loan request")
  }

  const handleAdminReject = () => {
    if (rejectionReason.trim()) {
      console.log("Admin rejected with reason:", rejectionReason)
      setRejectionReason("")
    }
  }

  const handleAdminNegotiate = () => {
    console.log("Admin initiated negotiation")
  }

  const showLoanDetails = !["pending", "cancelled", "rejected"].includes(assetDetails.status)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href={isAdminView ? "/admin/loans" : "/dashboard"}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base sm:text-lg lg:text-xl">
              {isAdminView ? "AssetLend Admin" : "AssetLend"}
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Asset Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                {getAssetIcon(assetDetails.type)}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{assetDetails.asset}</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Loan ID: {assetDetails.id}</p>
              </div>
            </div>
            <div className="shrink-0">{getStatusBadge(assetDetails.status)}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {isAdminView && assetDetails.status === "pending" && (
              <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/8 via-background to-accent/8 shadow-xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-20 translate-x-20" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/10 to-transparent rounded-full translate-y-16 -translate-x-16" />
                <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-bl from-chart-3/5 to-transparent rounded-full" />

                <CardHeader className="relative pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-xl sm:text-2xl lg:text-3xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">
                        Admin Action Required
                      </CardTitle>
                    </div>
                    <Badge className="bg-gradient-to-r from-primary/15 to-accent/15 text-primary border-primary/30 text-xs sm:text-sm w-fit font-semibold px-3 py-1">
                      🔔 Loan Request Review
                    </Badge>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
                    Review this loan request and make a decision. You can accept, reject, or negotiate the requested
                    amount.
                  </p>
                </CardHeader>

                <CardContent className="relative space-y-5 sm:space-y-6">
                  <div className="p-4 sm:p-5 lg:p-6 bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-sm rounded-2xl border border-border/60 shadow-md">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <IndianRupee className="w-5 h-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-accent">Requested Amount</p>
                          <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                          ₹{assetDetails.requestedAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-5">
                    <Button
                      onClick={handleAdminAccept}
                      className="w-full h-14 sm:h-16 text-base sm:text-lg font-bold bg-gradient-to-r from-chart-3 via-chart-3/95 to-chart-3/90 hover:from-chart-3/95 hover:via-chart-3/90 hover:to-chart-3/85 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] rounded-xl"
                      size="lg"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircle className="w-6 h-6" />
                        <span>Accept Request</span>
                      </div>
                    </Button>

                    <Button
                      onClick={handleAdminNegotiate}
                      variant="outline"
                      className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-transparent border-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 rounded-xl"
                      size="lg"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <MessageSquare className="w-5 h-5" />
                        <span>Negotiate Amount</span>
                      </div>
                    </Button>

                    <div className="space-y-3 sm:space-y-4">
                      <Textarea
                        placeholder="Reason for rejection (required)"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="min-h-[80px] sm:min-h-[100px] resize-none bg-card/60 border-border/60 focus:border-primary/60 rounded-xl text-sm sm:text-base"
                      />
                      <Button
                        variant="outline"
                        onClick={handleAdminReject}
                        disabled={!rejectionReason.trim()}
                        className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-transparent border-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        size="lg"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <XCircle className="w-5 h-5" />
                          <span>Reject Request</span>
                        </div>
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 bg-muted/40 border border-border/40 rounded-xl">
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      💡 <strong>Note:</strong> Your decision will be immediately communicated to the borrower. Make
                      sure to review all asset details before making a decision.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {assetDetails.hasConditionalApproval && !isAdminView && (
              <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/8 via-background to-accent/8 shadow-xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-20 translate-x-20" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/10 to-transparent rounded-full translate-y-16 -translate-x-16" />
                <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-gradient-to-bl from-chart-3/5 to-transparent rounded-full" />

                <CardHeader className="relative pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                        <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                      </div>
                      <CardTitle className="text-xl sm:text-2xl lg:text-3xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">
                        Action Required
                      </CardTitle>
                    </div>
                    <Badge className="bg-gradient-to-r from-primary/15 to-accent/15 text-primary border-primary/30 text-xs sm:text-sm w-fit font-semibold px-3 py-1">
                      🔔 Loan Decision Pending
                    </Badge>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
                    The admin has reviewed your application and made a counter-offer. Please review and respond below.
                  </p>
                </CardHeader>

                <CardContent className="relative space-y-5 sm:space-y-6">
                  <div className="p-4 sm:p-5 lg:p-6 bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-sm rounded-2xl border border-border/60 shadow-md">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="w-5 h-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-semibold text-accent">Admin Message</p>
                          <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
                          {assetDetails.adminMessage}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="p-5 sm:p-6 bg-gradient-to-br from-destructive/8 to-destructive/5 border-2 border-destructive/25 rounded-2xl text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-destructive/20 rounded-full flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-destructive" />
                        </div>
                        <p className="text-sm font-semibold text-destructive">Requested Amount</p>
                      </div>
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-destructive mb-1">
                        ₹{assetDetails.requestedAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-destructive/70">Original request</p>
                    </div>
                    <div className="p-5 sm:p-6 bg-gradient-to-br from-chart-3/8 to-chart-3/5 border-2 border-chart-3/25 rounded-2xl text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-chart-3/30 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-chart-3" />
                        </div>
                        <p className="text-sm font-semibold text-chart-3">Approved Amount</p>
                      </div>
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-chart-3 mb-1">
                        ₹{assetDetails.conditionalAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-chart-3/70">Admin approved</p>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-5">
                    <Button
                      onClick={handleAcceptConditionalApproval}
                      className="w-full h-14 sm:h-16 text-base sm:text-lg font-bold bg-gradient-to-r from-chart-3 via-chart-3/95 to-chart-3/90 hover:from-chart-3/95 hover:via-chart-3/90 hover:to-chart-3/85 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] rounded-xl"
                      size="lg"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircle className="w-6 h-6" />
                        <span>Accept ₹{assetDetails.conditionalAmount.toLocaleString()}</span>
                      </div>
                    </Button>

                    <div className="space-y-3 sm:space-y-4">
                      <Textarea
                        placeholder="Reason for rejection (optional but recommended)"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="min-h-[80px] sm:min-h-[100px] resize-none bg-card/60 border-border/60 focus:border-primary/60 rounded-xl text-sm sm:text-base"
                      />
                      <Button
                        variant="outline"
                        onClick={handleRejectConditionalApproval}
                        className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-transparent border-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-300 rounded-xl"
                        size="lg"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <XCircle className="w-5 h-5" />
                          <span>Reject Offer</span>
                        </div>
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 bg-muted/40 border border-border/40 rounded-xl">
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      💡 <strong>Note:</strong> Once you accept, the loan will be processed within 24 hours. If you
                      reject, you can submit a new application with different terms.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Asset Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Asset Type</p>
                    <p className="text-sm sm:text-base font-semibold capitalize">{assetDetails.type}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Condition</p>
                    <p className="text-sm sm:text-base font-semibold">{assetDetails.condition}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Purchase Date</p>
                    <p className="text-sm sm:text-base font-semibold">
                      {new Date(assetDetails.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Original Price</p>
                    <p className="text-sm sm:text-base font-semibold">₹{assetDetails.originalPrice.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-sm sm:text-base font-semibold leading-relaxed">{assetDetails.description}</p>
                </div>

                {/* Asset Photos */}
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3">Asset Photos</p>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {assetDetails.photos.map((photo, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/30 transition-colors"
                      >
                        <Image
                          src={photo || `/placeholder.svg?height=200&width=200&query=asset photo`}
                          alt={`${assetDetails.asset} photo ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {showLoanDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Loan Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Requested</p>
                      <p className="text-sm sm:text-base font-semibold">
                        ₹{assetDetails.requestedAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Approved</p>
                      <p className="text-sm sm:text-base font-semibold">
                        ₹{assetDetails.approvedAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Interest Rate</p>
                      <p className="text-sm sm:text-base font-semibold">{assetDetails.interestRate}% p.a.</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tenure</p>
                      <p className="text-sm sm:text-base font-semibold">{assetDetails.tenure} months</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">EMI Amount</p>
                      <p className="text-sm sm:text-base font-semibold">₹{assetDetails.emiAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Next EMI</p>
                      <p className="text-sm sm:text-base font-semibold">
                        {new Date(assetDetails.nextEMI).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                      <p className="text-sm sm:text-base font-semibold">
                        {new Date(assetDetails.submittedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Approved</p>
                      <p className="text-sm sm:text-base font-semibold">
                        {new Date(assetDetails.approvedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto bg-transparent" size="sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        View EMI Schedule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
                      <DialogHeader>
                        <DialogTitle>EMI Schedule</DialogTitle>
                      </DialogHeader>
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm">Month</TableHead>
                              <TableHead className="text-xs sm:text-sm">Due Date</TableHead>
                              <TableHead className="text-xs sm:text-sm">EMI</TableHead>
                              <TableHead className="text-xs sm:text-sm">Principal</TableHead>
                              <TableHead className="text-xs sm:text-sm">Interest</TableHead>
                              <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {emiSchedule.map((emi) => (
                              <TableRow key={emi.month}>
                                <TableCell className="text-xs sm:text-sm">{emi.month}</TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  {new Date(emi.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">₹{emi.amount.toLocaleString()}</TableCell>
                                <TableCell className="text-xs sm:text-sm">₹{emi.principal.toLocaleString()}</TableCell>
                                <TableCell className="text-xs sm:text-sm">₹{emi.interest.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs capitalize">
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
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {assetDetails.comments.map((comment) => (
                  <div key={comment.id} className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm sm:text-base">{comment.author}</span>
                        <Badge variant="outline" className="text-xs">
                          {comment.role}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base leading-relaxed">{comment.message}</p>
                  </div>
                ))}

                {/* Add Comment */}
                <div className="space-y-3">
                  <Textarea
                    placeholder={isAdminView ? "Add admin comment..." : "Add a comment..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] sm:min-h-[100px] resize-none"
                  />
                  <Button onClick={handleAddComment} size="sm" className="w-full sm:w-auto">
                    Add Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {assetDetails.timeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        {getTimelineIcon(event.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <h4 className="font-semibold text-sm sm:text-base">{event.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isAdminView && assetDetails.status === "active" && (
                  <Button className="w-full" size="sm" asChild>
                    <Link href={`/repayment/${assetDetails.id}`}>
                      <IndianRupee className="w-4 h-4 mr-2" />
                      Make Payment
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full bg-transparent" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Download Agreement
                </Button>
                {isAdminView && (
                  <Button variant="outline" className="w-full bg-transparent" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Borrower
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

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
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
import { useState } from "react"

// TODO: Replace with actual API call to fetch loan requests
const loanRequests: any[] = []

// TODO: Replace with actual API call to fetch notifications
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
    case "active":
      return <Badge className="bg-chart-3/10 text-chart-3 hover:bg-chart-3/20">Active</Badge>
    case "pending":
      return <Badge variant="secondary">Pending</Badge>
    case "rejected":
      return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">Rejected</Badge>
    case "closed":
      return <Badge variant="outline">Closed</Badge>
    case "at-risk":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">At Risk</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

interface PaymentDialogProps {
  loan: (typeof loanRequests)[0]
  onPaymentSuccess: (loanId: string, amount: number) => void
}

function PaymentDialog({ loan, onPaymentSuccess }: PaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState(loan.emiAmount?.toString() || "0")
  const [paymentType, setPaymentType] = useState("emi")
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePayment = async () => {
    setIsProcessing(true)

    // Simulate payment gateway redirect
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // In real implementation, this would redirect to Razorpay/Stripe/PayU
    const paymentGatewayUrl = `https://checkout.razorpay.com/v1/checkout.js?key_id=rzp_test_123&amount=${(loan.remainingAmount || 0) * 100}&currency=INR&name=AssetLend&description=EMI Payment for ${loan.asset}&order_id=order_${Date.now()}&callback_url=${window.location.origin}/payment-callback`

    // TODO: Integrate with actual payment gateway
    const paymentSuccess = false // Replace with actual payment processing

    if (paymentSuccess) {
      onPaymentSuccess(loan.id, Number.parseInt(paymentAmount))
    }

    setIsProcessing(false)
  }

  if (!loan.emiAmount || !loan.remainingAmount) return null

  const totalAmount = paymentType === "full" ? loan.remainingAmount : Number.parseInt(paymentAmount)
  const processingFee = Math.round(totalAmount * 0.02) // 2% processing fee
  const gst = Math.round(processingFee * 0.18) // 18% GST on processing fee
  const finalAmount = totalAmount + processingFee + gst

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-linear-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <IndianRupee className="w-4 h-4 mr-2 relative z-10" />
          <span className="relative z-10">Pay Now</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Payment Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative bg-linear-to-br from-primary/10 via-primary/5 to-accent/10 rounded-xl p-6 border border-primary/20">
            <div className="absolute top-4 right-4">
              {loan.overdueAmount && loan.overdueAmount > 0 && (
                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                {getAssetIcon(loan.type)}
              </div>
              <div>
                <h3 className="font-bold text-lg">{loan.asset}</h3>
                <p className="text-sm text-muted-foreground">Loan ID: {loan.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
                <p className="font-bold text-lg">₹{loan.emiAmount.toLocaleString()}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                <p className="font-bold text-lg">₹{loan.remainingAmount.toLocaleString()}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Next EMI Date</p>
                <p className="font-semibold">{loan.nextEMI ? new Date(loan.nextEMI).toLocaleDateString() : "N/A"}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Progress</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((loan.paidEmis || 0) / (loan.totalEmis || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold">
                    {loan.paidEmis || 0}/{loan.totalEmis || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Type</Label>
            <div className="grid grid-cols-1 gap-3">
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  paymentType === "emi" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setPaymentType("emi")}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Regular EMI</p>
                    <p className="text-sm text-muted-foreground">Monthly installment payment</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{loan.emiAmount.toLocaleString()}</p>
                    {loan.overdueAmount && loan.overdueAmount > 0 && (
                      <p className="text-xs text-destructive">+ ₹{loan.overdueAmount.toLocaleString()} overdue</p>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  paymentType === "partial" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setPaymentType("partial")}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Partial Payment</p>
                    <p className="text-sm text-muted-foreground">Pay any amount towards loan</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">Custom</p>
                  </div>
                </div>
              </div>

              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  paymentType === "full" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setPaymentType("full")}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Full Settlement</p>
                    <p className="text-sm text-muted-foreground">Close loan completely</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{loan.remainingAmount.toLocaleString()}</p>
                    <Badge variant="outline" className="text-xs">
                      Save Interest
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {paymentType === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="paymentAmount" className="text-base font-semibold">
                Payment Amount
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="paymentAmount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-10 text-lg font-semibold"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum: ₹{Math.min(1000, loan.emiAmount).toLocaleString()} | Maximum: ₹
                {loan.remainingAmount.toLocaleString()}
              </p>
            </div>
          )}

          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-base mb-3">Payment Breakdown</h4>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {paymentType === "full"
                    ? "Settlement Amount"
                    : paymentType === "emi"
                      ? "EMI Amount"
                      : "Payment Amount"}
                </span>
                <span className="font-semibold">₹{totalAmount.toLocaleString()}</span>
              </div>

              {loan.overdueAmount && loan.overdueAmount > 0 && paymentType === "emi" && (
                <div className="flex justify-between">
                  <span className="text-destructive">Overdue Amount</span>
                  <span className="font-semibold text-destructive">₹{loan.overdueAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processing Fee (2%)</span>
                <span>₹{processingFee.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (18%)</span>
                <span>₹{gst.toLocaleString()}</span>
              </div>

              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total Amount</span>
                  <span className="font-bold text-xl text-primary">₹{finalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handlePayment}
              disabled={isProcessing || !paymentAmount}
              className="w-full h-14 text-lg font-semibold relative overflow-hidden group"
              size="lg"
            >
              <div className="absolute inset-0 bg-linear-to-r from-primary to-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Redirecting to Payment Gateway...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 relative z-10">
                  <CreditCard className="w-5 h-5" />
                  <span>Pay ₹{finalAmount.toLocaleString()}</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              )}
            </Button>

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>256-bit SSL Encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                <span>Powered by Razorpay</span>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 rounded-lg p-4">
            <h5 className="font-semibold mb-2 text-sm">Accepted Payment Methods</h5>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>UPI</span>
              <span>•</span>
              <span>Net Banking</span>
              <span>•</span>
              <span>Credit/Debit Cards</span>
              <span>•</span>
              <span>Wallets</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function UserDashboard() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [loans, setLoans] = useState(loanRequests)

  const filteredLoans = statusFilter === "all" ? loans : loans.filter((loan) => loan.status === statusFilter)

  const handlePaymentSuccess = (loanId: string, amount: number) => {
    setLoans((prev) =>
      prev.map((loan) => {
        if (loan.id === loanId && loan.remainingAmount && loan.emiAmount) {
          const newRemainingAmount = Math.max(0, loan.remainingAmount - amount)
          const newPaidEmis = amount >= loan.emiAmount ? (loan.paidEmis || 0) + 1 : loan.paidEmis || 0

          return {
            ...loan,
            remainingAmount: newRemainingAmount,
            paidEmis: newPaidEmis,
            status: newRemainingAmount === 0 ? "closed" : "active",
            overdueAmount: 0,
          }
        }
        return loan
      }),
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg sm:text-xl">AssetLend</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  {notifications.some((n) => n.urgent) && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-destructive rounded-full"></div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-muted/50 ${
                        notification.urgent ? "bg-destructive/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                            className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                            notification.urgent ? "bg-destructive" : "bg-primary"
                          }`}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t">
                  <Button variant="outline" className="w-full bg-transparent" size="sm">
                    View All Notifications
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-2">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-semibold">JD</span>
                  </div>
                  <span className="font-medium text-sm sm:text-base hidden sm:block">John Doe</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Profile Menu</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/profile">
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

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
                    {loans.filter((loan) => loan.status === "active").length}
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
                    {loans.filter((loan) => loan.status === "pending").length}
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
              {filteredLoans.map((loan) => (
                <Card key={loan.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          {getAssetIcon(loan.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">{loan.asset}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">ID: {loan.id}</p>
                        </div>
                      </div>
                      {getStatusBadge(loan.status)}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Requested Amount</p>
                        <p className="font-semibold text-sm sm:text-base">₹{loan.amount.toLocaleString()}</p>
                      </div>
                      {loan.approvedAmount && (
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Approved Amount</p>
                          <p className="font-semibold text-sm sm:text-base">₹{loan.approvedAmount.toLocaleString()}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Submitted</p>
                        <p className="font-semibold text-sm sm:text-base">
                          {new Date(loan.submittedDate).toLocaleDateString()}
                        </p>
                      </div>
                      {loan.nextEMI && (
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Next EMI</p>
                          <p className="font-semibold text-sm sm:text-base">
                            {new Date(loan.nextEMI).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {loan.status === "active" && loan.paidEmis !== null && loan.totalEmis !== null && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs sm:text-sm text-muted-foreground">Repayment Progress</p>
                          <p className="text-xs sm:text-sm font-semibold">
                            {loan.paidEmis}/{loan.totalEmis} EMIs
                          </p>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(loan.paidEmis / loan.totalEmis) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {loan.status === "rejected" && loan.rejectionReason && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                        <p className="text-xs sm:text-sm text-destructive">{loan.rejectionReason}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" size="sm" className="w-full sm:w-auto bg-transparent" asChild>
                        <Link href={`/asset-detail/${loan.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                      {loan.status === "active" && loan.emiAmount && (
                        <PaymentDialog loan={loan} onPaymentSuccess={handlePaymentSuccess} />
                      )}
                      {loan.status === "pending" && (
                        <Button variant="outline" size="sm" className="w-full sm:w-auto bg-transparent" disabled>
                          Under Review
                        </Button>
                      )}
                      {loan.status === "rejected" && (
                        <Button size="sm" className="w-full sm:w-auto" asChild>
                          <Link href="/upload-asset">Apply Again</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

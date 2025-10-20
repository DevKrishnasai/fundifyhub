"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Camera,
  Upload,
  X,
  FileText,
  CheckCircle,
  CreditCard,
  User,
  MapPin,
  IndianRupee,
  Download,
  PenTool,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"

// Mock data for the loan request
const loanRequest = {
  id: "LR001",
  userId: "U001",
  userName: "Rahul Kumar",
  userPhone: "+91 9876543210",
  asset: "iPhone 14 Pro",
  assetType: "smartphone",
  brand: "Apple",
  model: "iPhone 14 Pro",
  condition: "excellent",
  approvedAmount: 42000,
  interestRate: 12,
  tenure: 6,
  planType: "monthly",
  emiAmount: 7500,
  district: "Mumbai",
  pickupDate: "2025-01-25",
  pickupTime: "14:00",
  pickupLocation: "Bandra West, Mumbai",
  status: "approved",
  inspectionStatus: "pending", // pending, completed, agreement_pending, agreement_signed, disbursed
  originalPhotos: ["/iphone-14-pro-front.jpg", "/iphone-14-pro-back.jpg"],
  inspectionPhotos: [],
  agreementUrl: null,
  disbursementMode: null,
  paymentProof: null,
}

interface InspectionPhoto {
  id: string
  file: File
  preview: string
  description: string
}

export default function InspectionPage() {
  const params = useParams()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1) // 1: Inspection, 2: Agreement, 3: Disbursement
  const [inspectionPhotos, setInspectionPhotos] = useState<InspectionPhoto[]>([])
  const [inspectionNotes, setInspectionNotes] = useState("")
  const [finalValuation, setFinalValuation] = useState(loanRequest.approvedAmount.toString())
  const [agreementSigned, setAgreementSigned] = useState(false)
  const [disbursementMode, setDisbursementMode] = useState("")
  const [disbursementDetails, setDisbursementDetails] = useState({
    upiId: "",
    accountNumber: "",
    ifscCode: "",
    accountHolder: "",
    cashLocation: "",
  })
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInspectionPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const id = Math.random().toString(36).substr(2, 9)
        const preview = URL.createObjectURL(file)
        setInspectionPhotos((prev) => [...prev, { id, file, preview, description: "" }])
      }
    })
  }

  const removeInspectionPhoto = (id: string) => {
    setInspectionPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) URL.revokeObjectURL(photo.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const updatePhotoDescription = (id: string, description: string) => {
    setInspectionPhotos((prev) => prev.map((photo) => (photo.id === id ? { ...photo, description } : photo)))
  }

  const handlePaymentProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPaymentProof(file)
    }
  }

  const submitInspection = async () => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    setCurrentStep(2)
  }

  const generateAgreement = async () => {
    setIsSubmitting(true)
    // Simulate PDF generation
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    // In real app, this would generate and return a PDF URL
  }

  const signAgreement = async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setAgreementSigned(true)
    setIsSubmitting(false)
    setCurrentStep(3)
  }

  const processDisbursement = async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    router.push("/dashboard")
  }

  const getStepStatus = (step: number) => {
    if (step < currentStep) return "completed"
    if (step === currentStep) return "active"
    return "pending"
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
            <span className="font-bold text-xl">AssetLend</span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline">Inspection Process</Badge>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">AG</span>
              </div>
              <span className="font-medium">Agent</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">Loan Processing - {loanRequest.id}</h1>

          <div className="flex items-center gap-4 mb-8">
            <div
              className={`flex items-center gap-2 ${getStepStatus(1) === "completed" ? "text-chart-3" : getStepStatus(1) === "active" ? "text-primary" : "text-muted-foreground"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  getStepStatus(1) === "completed"
                    ? "bg-chart-3 text-white"
                    : getStepStatus(1) === "active"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                }`}
              >
                {getStepStatus(1) === "completed" ? <CheckCircle className="w-5 h-5" /> : "1"}
              </div>
              <span className="font-medium">Asset Inspection</span>
            </div>
            <div className={`h-px flex-1 ${currentStep >= 2 ? "bg-primary" : "bg-border"}`}></div>

            <div
              className={`flex items-center gap-2 ${getStepStatus(2) === "completed" ? "text-chart-3" : getStepStatus(2) === "active" ? "text-primary" : "text-muted-foreground"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  getStepStatus(2) === "completed"
                    ? "bg-chart-3 text-white"
                    : getStepStatus(2) === "active"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                }`}
              >
                {getStepStatus(2) === "completed" ? <CheckCircle className="w-5 h-5" /> : "2"}
              </div>
              <span className="font-medium">Agreement Signing</span>
            </div>
            <div className={`h-px flex-1 ${currentStep >= 3 ? "bg-primary" : "bg-border"}`}></div>

            <div
              className={`flex items-center gap-2 ${getStepStatus(3) === "completed" ? "text-chart-3" : getStepStatus(3) === "active" ? "text-primary" : "text-muted-foreground"}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  getStepStatus(3) === "completed"
                    ? "bg-chart-3 text-white"
                    : getStepStatus(3) === "active"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                }`}
              >
                {getStepStatus(3) === "completed" ? <CheckCircle className="w-5 h-5" /> : "3"}
              </div>
              <span className="font-medium">Disbursement</span>
            </div>
          </div>
        </div>

        {/* Loan Details Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Borrower</p>
                  <p className="font-semibold">{loanRequest.userName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Asset</p>
                  <p className="font-semibold">{loanRequest.asset}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <IndianRupee className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Approved Amount</p>
                  <p className="font-semibold">₹{loanRequest.approvedAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{loanRequest.district}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Asset Inspection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Asset Inspection Photos
                </CardTitle>
                <p className="text-muted-foreground">Upload detailed photos of the asset during physical inspection</p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="original" className="w-full">
                  <TabsList>
                    <TabsTrigger value="original">Original Photos</TabsTrigger>
                    <TabsTrigger value="inspection">Inspection Photos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="original" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {loanRequest.originalPhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo || "/placeholder.svg"}
                            alt={`Original photo ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          <Badge className="absolute top-2 left-2 bg-primary/90">Original</Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="inspection" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {inspectionPhotos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.preview || "/placeholder.svg"}
                            alt="Inspection photo"
                            className="w-full h-48 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeInspectionPhoto(photo.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <div className="mt-2">
                            <Input
                              placeholder="Photo description..."
                              value={photo.description}
                              onChange={(e) => updatePhotoDescription(photo.id, e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      ))}

                      <label className="border-2 border-dashed border-border rounded-lg p-4 h-48 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground text-center">Upload Inspection Photos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleInspectionPhotoUpload}
                        />
                      </label>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inspection Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="finalValuation">Final Asset Valuation (₹)</Label>
                  <Input
                    id="finalValuation"
                    value={finalValuation}
                    onChange={(e) => setFinalValuation(e.target.value)}
                    placeholder="Final assessed value"
                  />
                </div>
                <div>
                  <Label htmlFor="inspectionNotes">Inspection Notes</Label>
                  <Textarea
                    id="inspectionNotes"
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="Detailed notes about asset condition, any damages, accessories included, etc."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={submitInspection}
                disabled={inspectionPhotos.length < 2 || !inspectionNotes || isSubmitting}
                size="lg"
              >
                {isSubmitting ? "Submitting..." : "Complete Inspection"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Agreement Signing */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Loan Agreement
                </CardTitle>
                <p className="text-muted-foreground">Review and sign the digital loan agreement</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-4">Loan Agreement Summary</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Principal Amount</p>
                      <p className="font-semibold">₹{finalValuation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="font-semibold">{loanRequest.interestRate}% per annum</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tenure</p>
                      <p className="font-semibold">{loanRequest.tenure} months</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly EMI</p>
                      <p className="font-semibold">₹{loanRequest.emiAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Processing Fee</p>
                      <p className="font-semibold">₹500</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Repayment</p>
                      <p className="font-semibold">₹{(loanRequest.emiAmount * loanRequest.tenure).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={generateAgreement} disabled={isSubmitting}>
                    {isSubmitting ? "Generating..." : "Generate Agreement PDF"}
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download Agreement
                  </Button>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <PenTool className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Digital Signature Required</h4>
                      <p className="text-sm text-muted-foreground">
                        Please review the agreement and provide your digital signature
                      </p>
                    </div>
                  </div>

                  {!agreementSigned ? (
                    <Button onClick={signAgreement} disabled={isSubmitting}>
                      {isSubmitting ? "Processing..." : "Sign Agreement Digitally"}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-chart-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Agreement Signed Successfully</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {agreementSigned && (
              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep(3)} size="lg">
                  Proceed to Disbursement
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Disbursement */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5" />
                  Loan Disbursement
                </CardTitle>
                <p className="text-muted-foreground">Choose disbursement method and process payment</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="disbursementMode">Disbursement Mode</Label>
                  <Select value={disbursementMode} onValueChange={setDisbursementMode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select disbursement method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI Transfer</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash Pickup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {disbursementMode === "upi" && (
                  <div>
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      value={disbursementDetails.upiId}
                      onChange={(e) => setDisbursementDetails((prev) => ({ ...prev, upiId: e.target.value }))}
                      placeholder="user@paytm"
                    />
                  </div>
                )}

                {disbursementMode === "bank" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={disbursementDetails.accountNumber}
                        onChange={(e) => setDisbursementDetails((prev) => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        value={disbursementDetails.ifscCode}
                        onChange={(e) => setDisbursementDetails((prev) => ({ ...prev, ifscCode: e.target.value }))}
                        placeholder="IFSC code"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="accountHolder">Account Holder Name</Label>
                      <Input
                        id="accountHolder"
                        value={disbursementDetails.accountHolder}
                        onChange={(e) => setDisbursementDetails((prev) => ({ ...prev, accountHolder: e.target.value }))}
                        placeholder="Account holder name"
                      />
                    </div>
                  </div>
                )}

                {disbursementMode === "cash" && (
                  <div>
                    <Label htmlFor="cashLocation">Cash Pickup Location</Label>
                    <Input
                      id="cashLocation"
                      value={disbursementDetails.cashLocation}
                      onChange={(e) => setDisbursementDetails((prev) => ({ ...prev, cashLocation: e.target.value }))}
                      placeholder="Address for cash pickup"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="paymentProof">Upload Payment Proof</Label>
                  <div className="mt-2">
                    <label className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {paymentProof ? paymentProof.name : "Upload payment screenshot or receipt"}
                      </span>
                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={handlePaymentProofUpload} />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={processDisbursement}
                disabled={!disbursementMode || !paymentProof || isSubmitting}
                size="lg"
              >
                {isSubmitting ? "Processing..." : "Complete Disbursement"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

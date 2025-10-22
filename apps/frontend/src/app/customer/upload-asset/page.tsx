"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Upload, X, Camera, FileText, MapPin, CreditCard, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const assetTypes = [
  { value: "smartphone", label: "Smartphone" },
  { value: "laptop", label: "Laptop" },
  { value: "tablet", label: "Tablet" },
  { value: "camera", label: "Camera" },
  { value: "gaming-console", label: "Gaming Console" },
  { value: "smartwatch", label: "Smartwatch" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "car", label: "Car" },
  { value: "jewelry", label: "Jewelry" },
  { value: "other", label: "Other" },
]

const assetConditions = [
  { value: "excellent", label: "Excellent - Like new" },
  { value: "good", label: "Good - Minor wear" },
  { value: "fair", label: "Fair - Visible wear" },
  { value: "poor", label: "Poor - Significant wear" },
]

const districts = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Pimpri-Chinchwad",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Faridabad",
]

interface AssetPhoto {
  id: string
  file: File
  preview: string
}

interface IDProof {
  id: string
  file: File
  preview: string
  type: string
}

export default function UploadAssetPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [assetPhotos, setAssetPhotos] = useState<AssetPhoto[]>([])
  const [idProofs, setIdProofs] = useState<IDProof[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [formData, setFormData] = useState({
    assetType: "",
    assetBrand: "",
    assetModel: "",
    assetCondition: "",
    purchaseYear: "",
    description: "",
    district: "",
    requestedAmount: "",
  })

  const handleAssetPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const id = Math.random().toString(36).substr(2, 9)
        const preview = URL.createObjectURL(file)
        setAssetPhotos((prev) => [...prev, { id, file, preview }])
      }
    })
  }

  const handleIDProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        const id = Math.random().toString(36).substr(2, 9)
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : ""
        setIdProofs((prev) => [...prev, { id, file, preview, type: file.type }])
      }
    })
  }

  const removeAssetPhoto = (id: string) => {
    setAssetPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) URL.revokeObjectURL(photo.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const removeIDProof = (id: string) => {
    setIdProofs((prev) => {
      const proof = prev.find((p) => p.id === id)
      if (proof && proof.preview) URL.revokeObjectURL(proof.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressIntervals = [10, 25, 40, 60, 75, 90, 100]
      
      for (const progress of progressIntervals) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        setUploadProgress(progress)
      }

      // Final processing
      await new Promise((resolve) => setTimeout(resolve, 500))

      setIsSubmitted(true)
      
      toast({
        title: "Loan request submitted!",
        description: "Your asset has been uploaded successfully. We'll review your request within 24 hours.",
      })

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push("/dashboard")
      }, 3000)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Something went wrong. Please try again.",
      })
      setIsSubmitting(false)
      setUploadProgress(0)
    }
  }

  const canProceedToStep2 = assetPhotos.length >= 2 && formData.assetType && formData.assetBrand && formData.assetModel
  const canProceedToStep3 = formData.assetCondition && formData.requestedAmount
  const canSubmit = idProofs.length >= 1 && formData.district

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-chart-3/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-chart-3" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Request Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your loan request has been submitted successfully. Our district admin will review it within 24 hours.
            </p>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg sm:text-xl">AssetLend</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xs sm:text-sm font-semibold">JD</span>
            </div>
            <span className="font-medium text-sm sm:text-base hidden sm:block">John Doe</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Pledge Your Asset</h1>
            <Badge variant="outline" className="w-fit">
              Step {currentStep} of 3
            </Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2">
            <div
              className={`flex items-center gap-2 whitespace-nowrap ${currentStep >= 1 ? "text-primary" : "text-muted-foreground"}`}
            >
              <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                1
              </div>
              <span className="font-medium text-sm sm:text-base">Asset Photos</span>
            </div>
            <div className={`h-px flex-1 min-w-4 ${currentStep >= 2 ? "bg-primary" : "bg-border"}`}></div>
            <div
              className={`flex items-center gap-2 whitespace-nowrap ${currentStep >= 2 ? "text-primary" : "text-muted-foreground"}`}
            >
              <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                2
              </div>
              <span className="font-medium text-sm sm:text-base">Asset Details</span>
            </div>
            <div className={`h-px flex-1 min-w-4 ${currentStep >= 3 ? "bg-primary" : "bg-border"}`}></div>
            <div
              className={`flex items-center gap-2 whitespace-nowrap ${currentStep >= 3 ? "text-primary" : "text-muted-foreground"}`}
            >
              <div
                className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${currentStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                3
              </div>
              <span className="font-medium text-sm sm:text-base">Loan Summary</span>
            </div>
          </div>
        </div>

        {/* Step 1: Asset Photos & Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                  Upload Asset Photos
                </CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Upload at least 2 clear photos of your asset from different angles
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  {assetPhotos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.preview || "/placeholder.svg"}
                        alt="Asset photo"
                        className="w-full h-24 sm:h-32 object-cover rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeAssetPhoto(photo.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  <label className="border-2 border-dashed border-border rounded-lg p-3 sm:p-4 h-24 sm:h-32 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mb-1 sm:mb-2" />
                    <span className="text-xs sm:text-sm text-muted-foreground text-center">Click to upload</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleAssetPhotoUpload} />
                  </label>
                </div>

                {assetPhotos.length < 2 && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Please upload at least 2 photos to continue
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Basic Asset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assetType" className="text-sm sm:text-base">
                      Asset Type *
                    </Label>
                    <Select value={formData.assetType} onValueChange={(value) => handleInputChange("assetType", value)}>
                      <SelectTrigger className="h-10 sm:h-auto">
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                      <SelectContent>
                        {assetTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="assetBrand" className="text-sm sm:text-base">
                      Brand *
                    </Label>
                    <Input
                      id="assetBrand"
                      placeholder="e.g., Apple, Samsung, HP"
                      value={formData.assetBrand}
                      onChange={(e) => handleInputChange("assetBrand", e.target.value)}
                      className="h-10 sm:h-auto"
                    />
                  </div>

                  <div>
                    <Label htmlFor="assetModel" className="text-sm sm:text-base">
                      Model *
                    </Label>
                    <Input
                      id="assetModel"
                      placeholder="e.g., iPhone 14 Pro, MacBook Air M2"
                      value={formData.assetModel}
                      onChange={(e) => handleInputChange("assetModel", e.target.value)}
                      className="h-10 sm:h-auto"
                    />
                  </div>

                  <div>
                    <Label htmlFor="purchaseYear" className="text-sm sm:text-base">
                      Purchase Year
                    </Label>
                    <Input
                      id="purchaseYear"
                      placeholder="e.g., 2023"
                      value={formData.purchaseYear}
                      onChange={(e) => handleInputChange("purchaseYear", e.target.value)}
                      className="h-10 sm:h-auto"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2}
                size="lg"
                className="w-full sm:w-auto"
              >
                Continue to Asset Details
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Asset Details & Valuation */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Asset Condition & Loan Details</CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Help us assess your asset's current condition and loan requirements
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="assetCondition" className="text-sm sm:text-base">
                    Asset Condition *
                  </Label>
                  <Select
                    value={formData.assetCondition}
                    onValueChange={(value) => handleInputChange("assetCondition", value)}
                  >
                    <SelectTrigger className="h-10 sm:h-auto">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetConditions.map((condition) => (
                        <SelectItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="requestedAmount" className="text-sm sm:text-base">
                    Requested Loan Amount *
                  </Label>
                  <Input
                    id="requestedAmount"
                    placeholder="₹ 40,000"
                    value={formData.requestedAmount}
                    onChange={(e) => handleInputChange("requestedAmount", e.target.value)}
                    className="h-10 sm:h-auto"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Enter the amount you need</p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm sm:text-base">
                    Additional Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Any additional details about your asset (accessories, warranty, etc.)"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto">
                Back to Photos
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedToStep3}
                size="lg"
                className="w-full sm:w-auto"
              >
                Continue to Loan Summary
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Loan Summary & Submission */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Loan Request Summary</CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Review your loan request details before submission
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Asset Information */}
                  <div>
                    <h3 className="font-semibold text-base mb-3">Asset Information</h3>
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Asset Type</p>
                        <p className="font-medium text-sm sm:text-base">
                          {assetTypes.find((t) => t.value === formData.assetType)?.label}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Brand & Model</p>
                        <p className="font-medium text-sm sm:text-base">
                          {formData.assetBrand} {formData.assetModel}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Condition</p>
                        <p className="font-medium text-sm sm:text-base">
                          {assetConditions.find((c) => c.value === formData.assetCondition)?.label}
                        </p>
                      </div>
                      {formData.purchaseYear && (
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Purchase Year</p>
                          <p className="font-medium text-sm sm:text-base">{formData.purchaseYear}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Loan Details */}
                  <div>
                    <h3 className="font-semibold text-base mb-3">Loan Details</h3>
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Requested Amount</p>
                        <p className="font-semibold text-lg text-primary">₹{formData.requestedAmount}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Processing District</p>
                        <p className="font-medium text-sm sm:text-base">{formData.district}</p>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Documents */}
                  <div>
                    <h3 className="font-semibold text-base mb-3">Uploaded Documents</h3>
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Asset Photos</p>
                        <p className="font-medium text-sm sm:text-base">{assetPhotos.length} photos uploaded</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">ID Verification</p>
                        <p className="font-medium text-sm sm:text-base">{idProofs.length} document(s) uploaded</p>
                      </div>
                    </div>
                  </div>

                  {formData.description && (
                    <div>
                      <h3 className="font-semibold text-base mb-3">Additional Notes</h3>
                      <p className="text-sm sm:text-base text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {formData.description}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  Upload ID Proof
                </CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Upload a clear photo of your Aadhaar card or PAN card
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  {idProofs.map((proof) => (
                    <div key={proof.id} className="relative group">
                      {proof.preview ? (
                        <img
                          src={proof.preview || "/placeholder.svg"}
                          alt="ID proof"
                          className="w-full h-24 sm:h-32 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-full h-24 sm:h-32 bg-muted rounded-lg border flex items-center justify-center">
                          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeIDProof(proof.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  <label className="border-2 border-dashed border-border rounded-lg p-3 sm:p-4 h-24 sm:h-32 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground mb-1 sm:mb-2" />
                    <span className="text-xs sm:text-sm text-muted-foreground text-center">Upload ID</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleIDProofUpload}
                    />
                  </label>
                </div>

                {idProofs.length < 1 && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Please upload at least one ID proof to continue
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  Select District
                </CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground">Choose your district for local processing</p>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="district" className="text-sm sm:text-base">
                    District *
                  </Label>
                  <Select value={formData.district} onValueChange={(value) => handleInputChange("district", value)}>
                    <SelectTrigger className="h-10 sm:h-auto">
                      <SelectValue placeholder="Select your district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">
                Back to Details
              </Button>
              <div className="space-y-4">
                {isSubmitting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading your request...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}
                
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Spinner size="sm" />
                      <span>Submitting Request...</span>
                    </div>
                  ) : (
                    "Submit Loan Request"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

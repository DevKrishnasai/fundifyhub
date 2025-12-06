"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AppLayout, PageContainer, PageHeader } from "@/components/layout/AppLayout"
import { 
  ROLES, 
  ASSET_TYPE_OPTIONS, 
  ASSET_CONDITION_OPTIONS, 
  DOCUMENT_TYPE 
} from "@fundifyhub/types"
import { useDistricts } from "@/hooks/queries"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { 
  CategorizedDocumentUpload, 
  validateCategorizedDocuments,
  type CategorizedDocument 
} from "@/components/document/CategorizedDocumentUpload"
import { redirect } from "next/navigation"
import { 
  Package, 
  IndianRupee, 
  AlertCircle,
  CheckCircle,
  Loader2,
  FileStack,
  Sparkles,
  ArrowRight,
  X,
  RotateCcw
} from "lucide-react"
import { toast } from "sonner"

interface FormData {
  assetType: string
  assetBrand: string
  assetModel: string
  assetCondition: string
  purchaseYear: string
  originalPrice: string
  requestedAmount: string
  districtId: string
  description: string
}

const initialFormData: FormData = {
  assetType: "",
  assetBrand: "",
  assetModel: "",
  assetCondition: "",
  purchaseYear: "",
  originalPrice: "",
  requestedAmount: "",
  districtId: "",
  description: ""
}

const STORAGE_KEY = "fundifyhub_submit_request_draft"

interface SavedDraft {
  formData: FormData
  documents: CategorizedDocument[]
  savedAt: string
}

function UploadAssetSkeleton() {
  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageContainer>
    </AppLayout>
  )
}

function UploadAssetContent() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [documents, setDocuments] = useState<CategorizedDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  // Fetch districts from API
  const { data: districts, isLoading: districtsLoading } = useDistricts()

  const userRoles = user?.roles?.map((r: string) => r.toUpperCase()) || []
  const isCustomer = userRoles.includes(ROLES.CUSTOMER)

  // Only customers can upload assets
  if (!authLoading && user && !isCustomer) {
    redirect("/dashboard")
  }

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(STORAGE_KEY)
      if (savedDraft) {
        const draft: SavedDraft = JSON.parse(savedDraft)
        // Check if draft is less than 24 hours old
        const savedAt = new Date(draft.savedAt)
        const now = new Date()
        const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60)
        
        if (hoursDiff < 24 && draft.formData) {
          setHasDraft(true)
          // Auto-restore if there's meaningful data
          const hasData = draft.formData.assetType || draft.formData.assetBrand || 
                         draft.formData.requestedAmount || draft.documents?.length > 0
          if (hasData) {
            setFormData(draft.formData)
            setDocuments(draft.documents || [])
            setDraftLoaded(true)
            toast.success("Previous draft restored")
          }
        } else {
          // Clear expired draft
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      // Silent fail - draft recovery is not critical
    }
  }, [])

  // Save draft to localStorage whenever form or documents change
  const saveDraft = useCallback(() => {
    if (success) return // Don't save after successful submission
    
    try {
      const draft: SavedDraft = {
        formData,
        documents,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // Silent fail - draft saving is not critical
    }
  }, [formData, documents, success])

  useEffect(() => {
    // Debounce save to avoid excessive writes
    const timeout = setTimeout(saveDraft, 1000)
    return () => clearTimeout(timeout)
  }, [saveDraft])

  // Clear draft on successful submission
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setHasDraft(false)
    } catch {
      // Silent fail
    }
  }, [])

  // Scroll to error when it changes
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [error])

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleDocumentsChange = (docs: CategorizedDocument[]) => {
    setDocuments(docs)
    setError(null)
  }

  const validateForm = (): boolean => {
    setShowValidation(true)
    
    if (!formData.assetType) {
      setError("Please select an asset type")
      return false
    }
    if (!formData.assetBrand.trim()) {
      setError("Please enter the asset brand")
      return false
    }
    if (!formData.assetModel.trim()) {
      setError("Please enter the asset model")
      return false
    }
    if (!formData.assetCondition) {
      setError("Please select the asset condition")
      return false
    }
    if (!formData.purchaseYear || parseInt(formData.purchaseYear) < 2000 || parseInt(formData.purchaseYear) > new Date().getFullYear()) {
      setError("Please enter a valid purchase year")
      return false
    }
    if (!formData.requestedAmount || parseInt(formData.requestedAmount) < 1000) {
      setError("Please enter a valid requested amount (minimum ₹1,000)")
      return false
    }
    if (!formData.districtId) {
      setError("Please select your district")
      return false
    }
    
    // Validate documents
    const docValidation = validateCategorizedDocuments(documents)
    if (!docValidation.valid) {
      setError(docValidation.errors.join(". "))
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)
      setError(null)

      // Prepare asset data with all documents in a single array
      const assetData = {
        assetType: formData.assetType,
        assetBrand: formData.assetBrand.trim(),
        assetModel: formData.assetModel.trim(),
        assetCondition: formData.assetCondition,
        purchaseYear: parseInt(formData.purchaseYear),
        originalPrice: formData.originalPrice ? parseInt(formData.originalPrice) : null,
        requestedAmount: parseInt(formData.requestedAmount),
        districtId: formData.districtId,
        AdditionalDescription: formData.description.trim(),
        // Send all documents with their categories
        documents: documents.map(doc => ({
          fileKey: doc.fileKey,
          fileName: doc.fileName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          documentType: doc.documentType
        }))
      }

      const res = await apiClient.post(BACKEND_API_CONFIG.ENDPOINTS.USER.UPLOAD_ASSET, assetData)

      if (res.data?.success) {
        setSuccess(true)
        clearDraft() // Clear saved draft on successful submission
        // Redirect to requests page after short delay
        setTimeout(() => {
          router.push("/requests")
        }, 2000)
      } else {
        throw new Error(res.data?.message || "Failed to submit request")
      }
    } catch (err: unknown) {
      console.error("Failed to submit request:", err)
      // Extract error message from axios error response
      let errorMessage = "Failed to submit request. Please try again."
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { message?: string } } }
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message
        }
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <UploadAssetSkeleton />
  }

  if (!user) {
    return null
  }

  // Success state
  if (success) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-20 h-20 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4 bg-linear-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Request Submitted Successfully!
            </h1>
            <p className="text-muted-foreground mb-8 text-lg">
              Your loan request has been submitted and is now under review. 
              You&apos;ll receive updates on the status of your request.
            </p>
            <Button size="lg" onClick={() => router.push("/requests")} className="gap-2">
              View My Requests
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  const currentYear = new Date().getFullYear()
  const assetPhotoCount = documents.filter(d => d.documentType === DOCUMENT_TYPE.ASSET_PHOTO).length

  return (
    <AppLayout>
      <PageContainer>
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="Submit Loan Request"
            description="Provide your asset details and documents to apply for a loan."
          />

          <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Alert */}
          {error && (
            <div 
              ref={errorRef}
              className="rounded-xl border-2 border-destructive bg-destructive/10 p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-destructive">Something went wrong</p>
                <p className="text-destructive text-sm mt-1">{error}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/20"
                onClick={() => setError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Asset Details Card */}
          <Card className="overflow-hidden border-2">
            <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-b">
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <span>Asset Details</span>
                  <CardDescription className="mt-0.5">
                    Tell us about the asset you want to pledge
                  </CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Asset Type */}
                <div className="space-y-2">
                  <Label htmlFor="assetType" className="flex items-center gap-1">
                    Asset Type <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.assetType} onValueChange={(v) => handleChange("assetType", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPE_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Asset Condition */}
                <div className="space-y-2">
                  <Label htmlFor="assetCondition" className="flex items-center gap-1">
                    Condition <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.assetCondition} onValueChange={(v) => handleChange("assetCondition", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CONDITION_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <Label htmlFor="assetBrand" className="flex items-center gap-1">
                    Brand <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="assetBrand"
                    placeholder="e.g., Apple, Samsung, HP"
                    value={formData.assetBrand}
                    onChange={(e) => handleChange("assetBrand", e.target.value)}
                    className="h-11"
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="assetModel" className="flex items-center gap-1">
                    Model <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="assetModel"
                    placeholder="e.g., iPhone 14, Galaxy S23"
                    value={formData.assetModel}
                    onChange={(e) => handleChange("assetModel", e.target.value)}
                    className="h-11"
                  />
                </div>

                {/* Purchase Year */}
                <div className="space-y-2">
                  <Label htmlFor="purchaseYear" className="flex items-center gap-1">
                    Purchase Year <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="purchaseYear"
                    type="number"
                    placeholder={`e.g., ${currentYear - 1}`}
                    min="2000"
                    max={currentYear}
                    value={formData.purchaseYear}
                    onChange={(e) => handleChange("purchaseYear", e.target.value)}
                    className="h-11"
                  />
                </div>

                {/* Original Price */}
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Original Price (₹)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    placeholder="Optional - helps with valuation"
                    min="0"
                    value={formData.originalPrice}
                    onChange={(e) => handleChange("originalPrice", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Additional Description</Label>
                <Textarea
                  id="description"
                  placeholder="Any additional details about your asset (accessories, warranty status, minor damages, etc.)"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Loan Details Card */}
          <Card className="overflow-hidden border-2">
            <CardHeader className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-b">
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <span>Loan Details</span>
                  <CardDescription className="mt-0.5">
                    How much do you need and where are you located?
                  </CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Requested Amount */}
                <div className="space-y-2">
                  <Label htmlFor="requestedAmount" className="flex items-center gap-1">
                    Requested Amount (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="requestedAmount"
                    type="number"
                    placeholder="e.g., 25000"
                    min="1000"
                    value={formData.requestedAmount}
                    onChange={(e) => handleChange("requestedAmount", e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">Minimum ₹1,000</p>
                </div>

                {/* District */}
                <div className="space-y-2">
                  <Label htmlFor="district" className="flex items-center gap-1">
                    District <span className="text-destructive">*</span>
                  </Label>
                  <Select 
                    value={formData.districtId} 
                    onValueChange={(v) => handleChange("districtId", v)}
                    disabled={districtsLoading}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={districtsLoading ? "Loading districts..." : "Select your district"} />
                    </SelectTrigger>
                    <SelectContent>
                      {districts?.map(district => (
                        <SelectItem key={district.id} value={district.id}>
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card className="overflow-hidden border-2">
            <CardHeader className="bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-b">
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <FileStack className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>Upload Documents</span>
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Categorized
                    </Badge>
                  </div>
                  <CardDescription className="mt-0.5">
                    Upload and categorize your documents for faster processing
                  </CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CategorizedDocumentUpload
                onDocumentsChange={handleDocumentsChange}
                initialDocuments={documents}
                showValidation={showValidation}
              />
            </CardContent>
          </Card>

          {/* Submit Section */}
          <Card className="overflow-hidden border-2 bg-linear-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="font-medium">Ready to submit?</p>
                  <p className="text-sm text-muted-foreground">
                    Ensure all required documents are uploaded: Asset Photos (2-6), ID Proof (1), Address Proof (1), and Asset Documents (1-4).
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {draftLoaded && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      onClick={() => {
                        setFormData(initialFormData)
                        setDocuments([])
                        clearDraft()
                        setDraftLoaded(false)
                        toast.success("Form cleared")
                      }}
                      disabled={loading}
                      size="sm"
                      className="gap-1 text-muted-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Clear
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push("/dashboard")}
                    disabled={loading}
                    size="lg"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    size="lg"
                    className="gap-2 min-w-[140px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
        </div>
      </PageContainer>
    </AppLayout>
  )
}

export default function UploadAssetPage() {
  return (
    <ProtectedRoute>
      <UploadAssetContent />
    </ProtectedRoute>
  )
}

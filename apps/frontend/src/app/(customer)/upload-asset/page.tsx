"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import toast from "react-hot-toast"
import { Camera, CheckCircle, FileImage, FileText } from "lucide-react"
import PreviewModal from '@/components/common/PreviewModal'
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { BACKEND_API_CONFIG } from "@/lib/urls"
import { post } from '@/lib/api-client'
import { AssetUpload } from "@/lib/uploadthing"
import type { UploadedFile } from "@fundifyhub/types"
import { ASSET_TYPE_OPTIONS, ASSET_CONDITION_OPTIONS, MAX_DOCUMENT_COUNT } from "@fundifyhub/types"
import Image from "next/image"

const STORAGE_KEY = 'upload_asset_form_state';

// Allowed MIME types for uploads (PNG/JPEG, PDF)
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
const MAX_FILES = MAX_DOCUMENT_COUNT || 5;
// Max characters for additional notes
const ADDITIONAL_MAX = 300;

interface FormData {
  assetType: string;
  assetBrand: string;
  assetModel: string;
  assetCondition: string;
  assetTypeCustom?: string;
  purchaseYear: string;
  additionalDetails: string;
  requestedAmount: string | null;
}

export default function UploadAssetPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [assetPhotos, setAssetPhotos] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [purchaseYearError, setPurchaseYearError] = useState("")
  const [requestedAmountError, setRequestedAmountError] = useState("")
  const [consentChecked, setConsentChecked] = useState(false)
  const currentYear = new Date().getFullYear()

  const [formData, setFormData] = useState<FormData>({
    assetType: "",
    assetTypeCustom: "",
    assetBrand: "",
    assetModel: "",
    assetCondition: "",
    purchaseYear: "",
    additionalDetails: "",
    requestedAmount: null,
  })

  // Viewer modal state for thumbnails
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string; type?: string } | null>(null);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setFormData(parsed.formData || formData);
        setAssetPhotos(parsed.assetPhotos || []);
        setCurrentStep(parsed.currentStep || 1);
      } catch (error) {
        console.error('Failed to load saved state:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isSubmitted) {
      const stateToSave = {
        formData,
        assetPhotos,
        currentStep,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [formData, assetPhotos, currentStep, isSubmitted]);

  // Clear localStorage after successful submission
  useEffect(() => {
    if (isSubmitted) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isSubmitted])

  const handleAssetUploadComplete = (files: UploadedFile[]) => {
    // Filter incoming files: only allow supported mime types and avoid duplicates
    setAssetPhotos(prev => {
      const existingKeys = new Set(prev.map(p => p.fileKey || p.fileName));
      const allowed: UploadedFile[] = [];
      const skipped: string[] = [];

      for (const f of files) {
        const key = f.fileKey || f.fileName;
        if (!key) continue;
        if (existingKeys.has(key)) {
          // skip duplicates
          skipped.push(`${f.fileName} (duplicate)`);
          continue;
        }
        const mime = f.fileType || '';
        if (!ALLOWED_MIME_TYPES.includes(mime)) {
          skipped.push(`${f.fileName} (unsupported type)`);
          continue;
        }
        allowed.push(f);
        existingKeys.add(key);
      }

      // Enforce max files
      const spaceLeft = Math.max(0, MAX_FILES - prev.length);
      if (allowed.length > spaceLeft) {
        const accepted = allowed.slice(0, spaceLeft);
        const rejected = allowed.slice(spaceLeft).map(f => `${f.fileName} (exceeds max files)`);
        skipped.push(...rejected);
        allowed.length = 0;
        allowed.push(...accepted);
      }

      if (skipped.length) {
        toast((t) => (
          <div className="text-sm">
            <div className="font-medium">Some files were not added:</div>
            <ul className="list-disc ml-4 mt-1">
              {skipped.slice(0, 5).map((s, i) => (<li key={i}>{s}</li>))}
            </ul>
            {skipped.length > 5 && <div className="text-xs text-muted-foreground">and {skipped.length - 5} more...</div>}
          </div>
        ), { duration: 6000 });
      }

      return [...prev, ...allowed];
    });
  };

  const handleAssetUploadError = (error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
  };

  const handleDeletePhoto = (index: number) => {
    // Soft-delete with undo: remove from state and show undo toast for 6s
    setAssetPhotos(prev => {
      const removed = prev[index];
      const updated = prev.filter((_, i) => i !== index);
      // show undo toast
      toast((t) => (
        <div className="flex items-center gap-4">
          <div>Photo removed</div>
          <div className="ml-2">
            <button
              onClick={() => {
                setAssetPhotos(curr => {
                  const before = curr.slice(0, index);
                  const after = curr.slice(index);
                  return [...before, removed, ...after];
                });
                toast.dismiss(t.id);
              }}
              className="text-primary underline text-sm"
            >
              Undo
            </button>
          </div>
        </div>
      ), { duration: 6000 });

      return updated;
    });
  };

  const getDisplayUrl = (photo: UploadedFile) => {
    // Frontend expects backend to supply `url` for each document.
    // prefer explicit `url`, fall back to `signedUrl` (some backends return signedUrl)
    return photo.url || (photo as any).signedUrl || '';
  }

  const openViewerFor = (photo: UploadedFile) => {
    const url = getDisplayUrl(photo);
    if (!url) {
      toast.error('Unable to generate preview URL');
      return;
    }
    setViewerFile({ url, name: photo.fileName, type: photo.fileType });
    setViewerOpen(true);
  }

  const isImageFile = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  const isPdfFile = (fileType: string) => {
    return fileType === 'application/pdf';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Client-side gallery renderer for uploaded files (tiles). This is used in Step 2 and in the summary.
  const renderUploadGallery = (files: UploadedFile[]) => {
    if (!files || files.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileImage className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <div className="text-sm">No files uploaded yet</div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((photo, idx) => {
          const url = getDisplayUrl(photo);
          const isImage = (photo.fileType || '').startsWith('image/') || (photo.fileName || '').toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/);
          const isPdf = (photo.fileType === 'application/pdf') || (photo.fileName || '').toLowerCase().endsWith('.pdf');

          return (
            <div key={photo.fileKey || photo.fileName || idx} className="group bg-card border rounded-lg overflow-hidden">
              <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                {isImage && url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={photo.fileName || 'file'} className="w-full h-full object-cover" />
                ) : isPdf ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <FileText className="h-12 w-12" />
                    <span className="text-xs font-medium">PDF</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <FileImage className="h-12 w-12" />
                    <span className="text-xs font-medium">File</span>
                  </div>
                )}
              </div>

              <div className="p-3">
                <div className="flex flex-col gap-2">
                  <div className="w-full flex items-center justify-center">
                    <h4 className="font-semibold text-sm truncate text-center" title={photo.fileName || undefined}>{photo.fileName || 'Unnamed'}</h4>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] px-1.5 py-0 bg-muted rounded">{(photo.fileType || '').split('/').pop()?.toUpperCase() || ''}</div>
                    </div>
                    <div className="text-xs">{photo.fileSize ? formatFileSize(photo.fileSize) : ''}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => { openViewerFor(photo); }}>Preview</Button>
                  <Button size="sm" variant="destructive" onClick={() => { handleDeletePhoto(idx); }}>Remove</Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleInputChange = (field: string, value: string) => {
    // Validate purchase year when that field changes
    if (field === "purchaseYear") {
      // purchase year is required
      if (!value) {
        setPurchaseYearError("Enter purchase year")
        setFormData((prev) => ({ ...prev, [field]: value }))
        return
      }

      const num = parseInt(value.toString(), 10)
      if (isNaN(num)) {
        setPurchaseYearError("Enter a valid year")
      } else if (num < 1900 || num > currentYear) {
        setPurchaseYearError(`Year must be between 1900 and ${currentYear}`)
      } else {
        setPurchaseYearError("")
      }
    }

    // enforce max length for additionalDetails
    if (field === "additionalDetails") {
      value = value.slice(0, ADDITIONAL_MAX);
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const formatCurrency = (val: string) => {
    if (!val) return '';
    const n = parseFloat(val.toString().replace(/[^0-9.]/g, ''));
    if (isNaN(n)) return val;
    return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  }

  const unformatCurrency = (val: string) => {
    if (!val) return '';
    return val.toString().replace(/[^0-9.]/g, '');
  }

  // Validate requested amount as numeric > 0
  useEffect(() => {
    const v = formData.requestedAmount;
    if (!v) {
      setRequestedAmountError('')
      return;
    }
    const num = parseFloat(v.toString().replace(/[^0-9.]/g, ''))
    if (isNaN(num) || num <= 0) {
      setRequestedAmountError('Enter a valid amount greater than 0')
    } else {
      setRequestedAmountError('')
    }
  }, [formData.requestedAmount])

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // Prepare assetPhotos with full metadata (backend expects array of objects)
    const assetPhotoData = assetPhotos.map((photo) => ({
      fileKey: photo.fileKey,
      fileName: photo.fileName,
      fileSize: photo.fileSize,
      fileType: photo.fileType,
    })).filter((photo) => photo.fileKey && photo.fileName);

    // Allow a custom asset type value to be used when user entered one
    const finalAssetType = (formData.assetType === 'OTHER' && formData.assetTypeCustom && formData.assetTypeCustom.trim())
      ? formData.assetTypeCustom.trim()
      : formData.assetType;

    // Prepare payload
    const payload = {
      ...formData,
      assetType: finalAssetType,
      requestedAmount: parseFloat((formData.requestedAmount ?? "").toString().replace(/[^0-9.]/g, '')) || 0,
      assetPhotos: assetPhotoData, // Now includes fileKey for signed URL generation
    };

    try {
      const data = await post(BACKEND_API_CONFIG.ENDPOINTS.USER.UPLOAD_ASSET, payload)

      if (!data || !data.success) {
        throw new Error(data?.message || "Failed to submit asset request")
      }

      setIsSubmitted(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message || "Something went wrong. Please try again."}`);
      setIsSubmitting(false);
    }
  }

  // New flow: Step 1 = Info, Step 2 = Upload, Step 3 = Summary
  const canProceedToStep2 =
    Boolean(
      formData.assetType &&
      (formData.assetType !== 'OTHER' ? true : Boolean(formData.assetTypeCustom && formData.assetTypeCustom.trim())) &&
      formData.assetBrand &&
      formData.assetModel &&
      formData.purchaseYear &&
      formData.assetCondition &&
      formData.requestedAmount &&
      !purchaseYearError &&
      !requestedAmountError
    )
  const canProceedToStep3 = assetPhotos.length >= 2
  const MIN_REQUIRED_UPLOADS = 2;
  const missingUploads = assetPhotos.length < MIN_REQUIRED_UPLOADS;
  const canSubmit = Boolean(!requestedAmountError && consentChecked && !missingUploads)
  

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content (steps) */}
          <div className="lg:col-span-2">
            {/* Progress Steps */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold">Asset Loan Request</h1>
                <Badge variant="outline" className="w-fit">Step {currentStep} of 3</Badge>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2">
                <div className={`flex items-center gap-2 whitespace-nowrap ${currentStep >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>1</div>
                  <span className="font-medium text-sm sm:text-base">Info</span>
                </div>
                <div className={`h-px flex-1 min-w-4 ${currentStep >= 2 ? "bg-primary" : "bg-border"}`}></div>
                <div className={`flex items-center gap-2 whitespace-nowrap ${currentStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>2</div>
                  <span className="font-medium text-sm sm:text-base">Upload</span>
                </div>
                <div className={`h-px flex-1 min-w-4 ${currentStep >= 3 ? "bg-primary" : "bg-border"}`}></div>
                <div className={`flex items-center gap-2 whitespace-nowrap ${currentStep >= 3 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${currentStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>3</div>
                  <span className="font-medium text-sm sm:text-base">Review</span>
                </div>
              </div>
            </div>

            {/* Steps content */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                      About this request
                    </CardTitle>
                    <p className="text-sm sm:text-base text-muted-foreground">Tell us about the item you'd like a loan against. Provide accurate brand, model and year so we can estimate value. After this, you'll upload photos and related documents in the next step.</p>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="rounded-md border p-3 bg-muted/50 text-sm mb-4">
                      <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
                        <li>Take clear photos with good lighting (no blur).</li>
                        <li>One asset per photo; capture multiple angles.</li>
                        <li>Include serial/IMEI or receipts if available.</li>
                        <li>Allowed: up to {MAX_DOCUMENT_COUNT} files including photos and proofs; PNG, JPG, PDF.</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">After entering the info below, click Next to upload photos and related proofs.</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Asset Information</CardTitle>
                    <p className="text-sm text-muted-foreground">Describe the item clearly — include model/variant and brand to speed up valuation.</p>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="assetType" className="text-sm sm:text-base">Asset Category *</Label>
                        <Select value={formData.assetType} onValueChange={(value) => handleInputChange("assetType", value)}>
                          <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Select asset type" /></SelectTrigger>
                          <SelectContent>
                            {ASSET_TYPE_OPTIONS.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.assetType === 'OTHER' && (
                          <div className="mt-2">
                            <Input placeholder="Specify asset type (e.g., Sewing Machine)" value={formData.assetTypeCustom} onChange={(e) => handleInputChange('assetTypeCustom', e.target.value)} className="h-10" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="assetBrand" className="text-sm sm:text-base">Make / Brand *</Label>
                        <Input id="assetBrand" placeholder="e.g., Apple, Samsung, HP" value={formData.assetBrand} onChange={(e) => handleInputChange("assetBrand", e.target.value)} className="h-10 sm:h-auto w-full" />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="assetModel" className="text-sm sm:text-base">Model / Variant *</Label>
                        <Input id="assetModel" placeholder="e.g., iPhone 14 Pro, MacBook Air M2" value={formData.assetModel} onChange={(e) => handleInputChange("assetModel", e.target.value)} className="h-10 sm:h-auto w-full" />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="purchaseYear" className="text-sm sm:text-base">Year of Purchase *</Label>
                        <Input id="purchaseYear" placeholder="e.g., 2023" type="number" min={1900} max={currentYear} value={formData.purchaseYear} onChange={(e) => handleInputChange("purchaseYear", e.target.value)} className="h-10 sm:h-auto w-full" />
                        {purchaseYearError && <p className="text-sm text-destructive mt-1">{purchaseYearError}</p>}
                      </div>
                    </div>
                    
                    {/* Moved fields: condition, requested amount and notes belong to Info (Step 1) */}
                    <div className="grid sm:grid-cols-2 gap-4 mt-2">
                      <div>
                        <Label htmlFor="assetCondition" className="text-sm sm:text-base">Asset Condition *</Label>
                        <Select value={formData.assetCondition} onValueChange={(value) => handleInputChange("assetCondition", value)}>
                          <SelectTrigger className="h-10 sm:h-auto"><SelectValue placeholder="Select condition" /></SelectTrigger>
                          <SelectContent>
                            {ASSET_CONDITION_OPTIONS.map((condition) => (
                              <SelectItem key={condition.value} value={condition.value}>{condition.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="requestedAmount" className="text-sm sm:text-base">Requested Loan Amount (INR) *</Label>
                        <Input id="requestedAmount" placeholder="₹ 40,000" value={formData.requestedAmount ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("requestedAmount", e.target.value)} onFocus={(e) => handleInputChange('requestedAmount', unformatCurrency(e.currentTarget.value))} onBlur={(e) => handleInputChange('requestedAmount', formatCurrency(e.currentTarget.value))} className="h-10 sm:h-auto" />
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Enter the amount you need (numbers only)</p>
                        {requestedAmountError && <p className="text-sm text-destructive mt-1">{requestedAmountError}</p>}
                      </div>
                    </div>

                    <div className="mt-2">
                      <Label htmlFor="additionalDetails" className="text-sm sm:text-base">Notes (accessories, warranty, etc.)</Label>
                      <Textarea id="additionalDetails" placeholder="Any additional details about your asset (accessories, warranty, etc.)" value={formData.additionalDetails} onChange={(e) => handleInputChange("additionalDetails", e.target.value)} maxLength={ADDITIONAL_MAX} rows={3} className="resize-none" />
                      <div className="text-xs text-muted-foreground mt-1">{formData.additionalDetails.length}/{ADDITIONAL_MAX} characters</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => setCurrentStep(2)} disabled={!canProceedToStep2} size="lg" className="w-full sm:w-auto">Next: Details</Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Upload Photos & Proofs</CardTitle>
                    <p className="text-sm sm:text-base text-muted-foreground">Upload clear photos of the asset (front, back, accessories) and any related documents (receipts, warranties). You can preview or remove files here. Minimum 2 items recommended.</p>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <AssetUpload
                      onUploadComplete={handleAssetUploadComplete}
                      onUploadError={handleAssetUploadError}
                      maxFiles={MAX_FILES}
                      initialFiles={assetPhotos}
                      showPreviews={false} // hide inline previews from uploader; use single list below
                      uploaderRoute="requestDocument"
                    />

                    <div className="text-xs text-muted-foreground">{Math.max(0, MAX_FILES - assetPhotos.length)} slots remaining</div>

                    {/* Render single gallery for uploaded files (tiles). */}
                    {renderUploadGallery(assetPhotos)}
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto">Back to Info</Button>
                    <Button onClick={() => setCurrentStep(3)} disabled={!canProceedToStep3} size="lg" className="w-full sm:w-auto">Next: Review</Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Asset Loan Request Summary</CardTitle>
                    <p className="text-sm sm:text-base text-muted-foreground">Review your asset loan request before submitting. Admins will review the submitted materials and propose a loan based on the asset's valuation.</p>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold">Asset Details</h4>
                          <div className="grid sm:grid-cols-2 gap-3 mt-2">
                            <div>
                              <div className="text-xs text-muted-foreground">Type</div>
                              <div className="font-medium">{ASSET_TYPE_OPTIONS.find((t) => t.value === formData.assetType)?.label || '-'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Brand / Model</div>
                              <div className="font-medium">{(formData.assetBrand || '-') + (formData.assetModel ? ` / ${formData.assetModel}` : '')}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Condition</div>
                              <div className="font-medium">{ASSET_CONDITION_OPTIONS.find((c) => c.value === formData.assetCondition)?.label || '-'}</div>
                            </div>
                            {formData.purchaseYear && (
                              <div>
                                <div className="text-xs text-muted-foreground">Purchase Year</div>
                                <div className="font-medium">{formData.purchaseYear}</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-semibold">Loan Details</h4>
                          <div className="grid sm:grid-cols-2 gap-3 mt-2">
                            <div>
                              <div className="text-xs text-muted-foreground">Requested Amount</div>
                              <div className="font-medium">{formData.requestedAmount || '-'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Additional Notes</div>
                              <div className="font-medium">{formData.additionalDetails || '-'}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Uploaded Files</CardTitle>
                          <p className="text-sm text-muted-foreground">Preview the uploaded files below. You can remove any file before submitting.</p>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="text-sm text-muted-foreground mb-3">Total files uploaded: <span className="font-medium">{assetPhotos.length}</span></div>
                          {renderUploadGallery(assetPhotos)}
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={consentChecked} onCheckedChange={(v) => setConsentChecked(Boolean(v))} />
                    <div className="text-sm">
                      <label className="font-medium">I confirm that the information and files provided are accurate.</label>
                      <div className="text-xs text-muted-foreground">By submitting, you agree to our <Link href="/terms" target="_blank" className="underline">terms &amp; conditions</Link>. Admins may inspect the asset to verify condition and value.</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">Back to Upload</Button>
                    <div className="flex flex-col items-end">
                      {missingUploads && (
                        <div className="text-sm text-destructive mb-2">Upload at least {MIN_REQUIRED_UPLOADS} photos/proofs before submitting.</div>
                      )}
                      <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} size="lg" className="w-full sm:w-auto">
                      {isSubmitting ? (
                        <div className="flex items-center gap-2"><Spinner size="sm" /><span>Submitting...</span></div>
                      ) : (
                        "Submit Loan Request"
                      )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Global preview modal: render once so Preview works from any step */}
            {viewerOpen && viewerFile && (
              <PreviewModal
                open={viewerOpen}
                onClose={() => setViewerOpen(false)}
                source={{ url: viewerFile.url, mimeType: viewerFile.type, title: viewerFile.name }}
                hidePdfToolbar={true}
                initialZoom={1}
                showDownload={true}
              />
            )}
          </div>

          {/* Right column removed: uploads are managed in Step 2 only (no duplicated uploader) */}
        </div>
      </div>
    </div>
  )
}

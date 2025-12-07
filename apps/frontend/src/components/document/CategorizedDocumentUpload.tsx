"use client"

import { useState, useCallback, useEffect } from "react"
import { generateReactHelpers } from "@uploadthing/react"
import type { OurFileRouter } from "@/lib/uploadthing/uploadthing"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Camera,
  FileText,
  CreditCard,
  Home,
  X,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ImagePlus,
  FolderOpen,
  Loader2,
  FileCheck,
  FileType2
} from "lucide-react"
import Image from "next/image"
import PreviewModal from "@/components/common/PreviewModal"
import { 
  DOCUMENT_TYPE, 
  MAX_DOCUMENT_SIZE, 
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES
} from "@fundifyhub/types"

const { useUploadThing } = generateReactHelpers<OurFileRouter>()

/** Document with category information for submission */
export interface CategorizedDocument {
  fileKey: string
  fileName: string
  fileSize: number
  fileType: string
  documentType: DOCUMENT_TYPE
  url?: string
}

/** Internal state for tracking upload progress */
interface UploadingFile {
  id: string
  file: File
  progress: number
  status: "uploading" | "done" | "error"
  documentType: DOCUMENT_TYPE
  result?: CategorizedDocument
  error?: string
}

/** Category configuration for the upload UI */
interface CategoryConfig {
  type: DOCUMENT_TYPE
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  required: boolean
  minCount: number
  maxCount: number
  allowedTypes: string[]
  fileTypeLabel: string
}

/** Define document categories available for customer upload - STRICT REQUIREMENTS */
const CUSTOMER_DOCUMENT_CATEGORIES: CategoryConfig[] = [
  {
    type: DOCUMENT_TYPE.ASSET_PHOTO,
    label: "Asset Photos",
    description: "Clear photos of your asset (front, back, sides, serial number)",
    icon: <Camera className="h-5 w-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    required: true,
    minCount: 2,
    maxCount: 6,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    fileTypeLabel: "Images only (JPEG, PNG, WebP)"
  },
  {
    type: DOCUMENT_TYPE.ID_PROOF,
    label: "ID Proof",
    description: "Aadhaar card, PAN card, Voter ID, Passport, or Driving License",
    icon: <CreditCard className="h-5 w-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    required: true,
    minCount: 1,
    maxCount: 1,
    allowedTypes: ALLOWED_DOCUMENT_TYPES,
    fileTypeLabel: "Image or PDF"
  },
  {
    type: DOCUMENT_TYPE.ADDRESS_PROOF,
    label: "Address Proof",
    description: "Document showing address in the district you're requesting from",
    icon: <Home className="h-5 w-5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    required: true,
    minCount: 1,
    maxCount: 1,
    allowedTypes: ALLOWED_DOCUMENT_TYPES,
    fileTypeLabel: "Image or PDF"
  },
  {
    type: DOCUMENT_TYPE.ASSET_DOCUMENT,
    label: "Asset Related Documents",
    description: "Purchase receipts, bills, warranty cards, or certificates",
    icon: <FileCheck className="h-5 w-5" />,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    required: true,
    minCount: 1,
    maxCount: 4,
    allowedTypes: ALLOWED_DOCUMENT_TYPES,
    fileTypeLabel: "Image or PDF"
  }
]

interface CategorizedDocumentUploadProps {
  /** Callback when documents change */
  onDocumentsChange: (documents: CategorizedDocument[]) => void
  /** Initial documents (for editing) */
  initialDocuments?: CategorizedDocument[]
  /** Show validation errors */
  showValidation?: boolean
}

export function CategorizedDocumentUpload({
  onDocumentsChange,
  initialDocuments = [],
  showValidation = false
}: CategorizedDocumentUploadProps) {
  const [documents, setDocuments] = useState<CategorizedDocument[]>(initialDocuments)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [selectedCategory, setSelectedCategory] = useState<DOCUMENT_TYPE>(DOCUMENT_TYPE.ASSET_PHOTO)
  const [previewDoc, setPreviewDoc] = useState<CategorizedDocument | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sync state with initialDocuments prop when it changes (e.g. when draft is loaded)
  useEffect(() => {
    if (initialDocuments) {
      setDocuments(initialDocuments)
    }
  }, [initialDocuments])

  const { startUpload, isUploading } = useUploadThing("assetImageUploader", {
    onClientUploadComplete: (res) => {
      setError(null)
      
      // Update uploading files with results
      setUploadingFiles(prev => {
        const updated = prev.map(uf => {
          const match = res.find(r => r.name === uf.file.name && r.size === uf.file.size)
          if (match) {
            const newDoc: CategorizedDocument = {
              fileKey: match.key,
              fileName: match.name,
              fileSize: match.size,
              fileType: match.type,
              documentType: uf.documentType,
              url: match.url
            }
            return { ...uf, status: "done" as const, result: newDoc }
          }
          return uf
        })
        
        // Add completed docs to documents list
        const completedDocs = updated
          .filter(uf => uf.status === "done" && uf.result)
          .map(uf => uf.result!)
        
        const newDocs = [...documents, ...completedDocs.filter(
          cd => !documents.some(d => d.fileKey === cd.fileKey)
        )]
        setDocuments(newDocs)
        onDocumentsChange(newDocs)
        
        // Clear completed uploads after a delay
        setTimeout(() => {
          setUploadingFiles(current => current.filter(uf => uf.status !== "done"))
        }, 1500)
        
        return updated
      })
    },
    onUploadError: (err) => {
      const errorMessage = err.message || "Upload failed"
      let actionableMessage = "⚠️ Upload failed. "
      
      if (errorMessage.includes("network") || errorMessage.includes("connection")) {
        actionableMessage += "Check your internet connection and try again. If the problem persists, try uploading smaller files or fewer files at once."
      } else if (errorMessage.includes("timeout")) {
        actionableMessage += "Upload timed out. Try uploading fewer files at once or check your internet speed."
      } else if (errorMessage.includes("quota") || errorMessage.includes("storage")) {
        actionableMessage += "Storage limit reached. Contact support if you need to upload more files."
      } else {
        actionableMessage += "Please try again. If the problem continues, try refreshing the page or contact support."
      }
      
      setError(actionableMessage)
      setUploadingFiles(prev => prev.map(uf => 
        uf.status === "uploading" ? { ...uf, status: "error" as const, error: err.message } : uf
      ))
    },
    onUploadProgress: (progress) => {
      setUploadingFiles(prev => prev.map(uf => 
        uf.status === "uploading" ? { ...uf, progress } : uf
      ))
    }
  })

  const getCurrentCategoryConfig = useCallback(() => {
    return CUSTOMER_DOCUMENT_CATEGORIES.find(c => c.type === selectedCategory)!
  }, [selectedCategory])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const categoryConfig = getCurrentCategoryConfig()

    // Validate file types based on selected category
    const invalidFiles = files.filter(f => !categoryConfig.allowedTypes.includes(f.type))
    if (invalidFiles.length > 0) {
      const invalidNames = invalidFiles.map(f => f.name).join(", ")
      setError(`❌ Invalid file type(s): ${invalidNames}. For ${categoryConfig.label}, please upload ${categoryConfig.fileTypeLabel.toLowerCase()}. Try converting to PDF or taking a photo instead.`)
      e.target.value = ""
      return
    }

    // Validate file sizes
    const oversizedFiles = files.filter(f => f.size > MAX_DOCUMENT_SIZE)
    if (oversizedFiles.length > 0) {
      const oversizedNames = oversizedFiles.map(f => f.name).join(", ")
      const maxSizeMB = Math.round(MAX_DOCUMENT_SIZE / (1024 * 1024))
      setError(`📁 File(s) too large: ${oversizedNames}. Maximum size is ${maxSizeMB}MB per file. Please compress, resize, or split large files before uploading.`)
      e.target.value = ""
      return
    }

    // Check category limits
    const existingCount = documents.filter(d => d.documentType === selectedCategory).length
    const maxForCategory = categoryConfig.maxCount
    
    if (existingCount + files.length > maxForCategory) {
      const canUpload = maxForCategory - existingCount
      setError(`📋 Too many files for ${categoryConfig.label}. You can upload ${canUpload} more file${canUpload !== 1 ? 's' : ''} (maximum ${maxForCategory} total). Remove some existing files first or select a different category.`)
      e.target.value = ""
      return
    }

    setError(null)

    // Add to uploading state
    const newUploadingFiles: UploadingFile[] = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      file,
      progress: 0,
      status: "uploading",
      documentType: selectedCategory
    }))
    
    setUploadingFiles(prev => [...prev, ...newUploadingFiles])
    
    // Start upload
    try {
      await startUpload(files)
    } catch (err) {
      console.error("Upload error:", err)
    }
    
    e.target.value = ""
  }, [selectedCategory, documents, getCurrentCategoryConfig, startUpload])

  const removeDocument = useCallback((fileKey: string) => {
    const newDocs = documents.filter(d => d.fileKey !== fileKey)
    setDocuments(newDocs)
    onDocumentsChange(newDocs)
  }, [documents, onDocumentsChange])

  const getDocumentsByCategory = (type: DOCUMENT_TYPE) => 
    documents.filter(d => d.documentType === type)

  const getCategoryValidation = (config: CategoryConfig) => {
    const count = getDocumentsByCategory(config.type).length
    if (count < config.minCount) {
      return { valid: false, message: `${config.minCount} required`, full: false }
    }
    if (count >= config.maxCount) {
      return { valid: true, message: "Complete", full: true }
    }
    return { valid: true, message: `${count}/${config.maxCount}`, full: false }
  }

  // Overall validation status
  const validationStatus = CUSTOMER_DOCUMENT_CATEGORIES.map(cat => ({
    ...cat,
    count: getDocumentsByCategory(cat.type).length,
    validation: getCategoryValidation(cat)
  }))
  
  const allCategoriesValid = validationStatus.every(v => v.validation.valid)

  return (
    <div className="space-y-6">
      {/* Summary Cards - One for each required category */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {validationStatus.map(cat => (
          <Card 
            key={cat.type}
            className={`p-3 transition-colors ${
              cat.validation.valid 
                ? cat.validation.full 
                  ? "border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20" 
                  : "border-border"
                : showValidation 
                  ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                  : "border-amber-300 dark:border-amber-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cat.bgColor}`}>
                <span className={cat.color}>{cat.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{cat.label}</p>
                <div className="flex items-center gap-1">
                  <p className="text-lg font-semibold">{cat.count}/{cat.maxCount}</p>
                  {cat.validation.valid ? (
                    cat.validation.full && <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className={`h-4 w-4 ${showValidation ? "text-red-500" : "text-amber-500"}`} />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Min: {cat.minCount} | Max: {cat.maxCount}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Upload Section */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Category Selector */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Select Document Category
                </label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={(v) => setSelectedCategory(v as DOCUMENT_TYPE)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_DOCUMENT_CATEGORIES.map(cat => {
                      const validation = getCategoryValidation(cat)
                      return (
                        <SelectItem 
                          key={cat.type} 
                          value={cat.type}
                          disabled={validation.full}
                        >
                          <div className="flex items-center gap-2">
                            <span className={cat.color}>{cat.icon}</span>
                            <span>{cat.label}</span>
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">Required</Badge>
                            {validation.full && <Badge variant="secondary" className="text-[10px] px-1 py-0">Complete</Badge>}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Upload Button */}
              <div className="flex items-end">
                <label className={`cursor-pointer ${isUploading || getCategoryValidation(getCurrentCategoryConfig()).full ? "pointer-events-none opacity-50" : ""}`}>
                  <input
                    type="file"
                    multiple={getCurrentCategoryConfig().maxCount > 1}
                    accept={getCurrentCategoryConfig().allowedTypes.join(",")}
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading || getCategoryValidation(getCurrentCategoryConfig()).full}
                  />
                  <Button 
                    type="button" 
                    variant="default"
                    className="gap-2"
                    disabled={isUploading || getCategoryValidation(getCurrentCategoryConfig()).full}
                    asChild
                  >
                    <span>
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      Upload Files
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Selected Category Info */}
            {selectedCategory && (
              <div className={`rounded-lg p-3 ${getCurrentCategoryConfig().bgColor}`}>
                <div className="flex items-start gap-3">
                  <div className={getCurrentCategoryConfig().color}>
                    {getCurrentCategoryConfig().icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {getCurrentCategoryConfig().label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getCurrentCategoryConfig().description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      📎 {getCurrentCategoryConfig().fileTypeLabel} • 
                      {getCurrentCategoryConfig().minCount === getCurrentCategoryConfig().maxCount 
                        ? ` Exactly ${getCurrentCategoryConfig().minCount} required`
                        : ` ${getCurrentCategoryConfig().minCount}-${getCurrentCategoryConfig().maxCount} files`
                      }
                    </p>
                  </div>
                  <Badge 
                    variant={getCategoryValidation(getCurrentCategoryConfig()).valid ? "secondary" : "destructive"}
                  >
                    {getDocumentsByCategory(selectedCategory).length}/{getCurrentCategoryConfig().maxCount}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-6 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Uploading Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Uploading...</p>
            <div className="space-y-3">
              {uploadingFiles.map(uf => (
                <div key={uf.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{uf.file.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {uf.status === "done" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : uf.status === "error" ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        `${uf.progress}%`
                      )}
                    </span>
                  </div>
                  <Progress value={uf.status === "done" ? 100 : uf.progress} className="h-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents by Category */}
      <div className="space-y-4">
        {CUSTOMER_DOCUMENT_CATEGORIES.map(cat => {
          const categoryDocs = getDocumentsByCategory(cat.type)
          const validation = getCategoryValidation(cat)
          
          if (categoryDocs.length === 0) {
            return null
          }
          
          return (
            <Card 
              key={cat.type} 
              className={`${
                !validation.valid && showValidation 
                  ? "border-red-300 dark:border-red-800" 
                  : validation.full 
                    ? "border-green-300 dark:border-green-800"
                    : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg ${cat.bgColor} flex items-center justify-center ${cat.color}`}>
                      {cat.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        {cat.label}
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">Required</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={!validation.valid ? "destructive" : validation.full ? "default" : "outline"}
                    className={validation.full ? "bg-green-600" : ""}
                  >
                    {validation.full ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete
                      </span>
                    ) : (
                      `${categoryDocs.length}/${cat.maxCount}`
                    )}
                  </Badge>
                </div>

                {categoryDocs.length > 0 ? (
                  <ScrollArea className="w-full">
                    <div className="flex gap-3 pb-2">
                      {categoryDocs.map(doc => (
                        <div 
                          key={doc.fileKey}
                          className="relative group shrink-0 w-28"
                        >
                          <div className="aspect-square rounded-lg border bg-muted/30 overflow-hidden relative">
                            {doc.fileType?.startsWith("image/") && doc.url ? (
                              <Image
                                src={doc.url}
                                alt={doc.fileName}
                                fill
                                className="object-cover"
                                sizes="112px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {doc.fileType === "application/pdf" ? (
                                  <FileType2 className="h-8 w-8 text-red-500" />
                                ) : (
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            
                            {/* Hover Actions */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPreviewDoc(doc)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeDocument(doc.fileKey)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs truncate mt-1 text-center" title={doc.fileName}>
                            {doc.fileName}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className={`text-center py-6 rounded-lg border-2 border-dashed ${
                    showValidation ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" : "border-muted"
                  }`}>
                    <AlertCircle className={`h-8 w-8 mx-auto mb-2 ${showValidation ? "text-red-500" : "text-muted-foreground"}`} />
                    <p className={`text-sm ${showValidation ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                      No {cat.label.toLowerCase()} uploaded yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cat.minCount === cat.maxCount 
                        ? `${cat.minCount} file required`
                        : `${cat.minCount}-${cat.maxCount} files required`
                      } • {cat.fileTypeLabel}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Validation Summary */}
      {showValidation && !allCategoriesValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">📋 Complete your document uploads to proceed:</p>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {validationStatus
                .filter(v => !v.validation.valid)
                .map(v => {
                  const needed = v.minCount - v.count
                  return (
                    <li key={v.type}>
                      <strong>{v.label}:</strong> {v.count}/{v.minCount} uploaded 
                      ({needed} more needed). {v.description.toLowerCase()}
                    </li>
                  )
                })
              }
            </ul>
            <p className="text-sm mt-2 text-muted-foreground">
              💡 Select each category above and click "Upload Files" to add the required documents.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <PreviewModal
          open={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          source={{
            url: previewDoc.url || "",
            mimeType: previewDoc.fileType,
            title: previewDoc.fileName
          }}
          hidePdfToolbar={false}
          initialZoom={1}
          showDownload={true}
        />
      )}
    </div>
  )
}

/** Helper function to validate documents before submission */
export function validateCategorizedDocuments(documents: CategorizedDocument[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Asset Photos: min 2, max 6
  const assetPhotos = documents.filter(d => d.documentType === DOCUMENT_TYPE.ASSET_PHOTO)
  if (assetPhotos.length < 2) {
    errors.push(`📸 Asset Photos: Need at least 2 photos of your asset (front, back, sides, serial number). You have ${assetPhotos.length}. Upload clear photos showing all angles.`)
  }
  if (assetPhotos.length > 6) {
    errors.push(`📸 Asset Photos: Maximum 6 photos allowed. You have ${assetPhotos.length}. Please remove ${assetPhotos.length - 6} photo(s).`)
  }
  // Check asset photos are images only
  const nonImageAssetPhotos = assetPhotos.filter(d => !ALLOWED_IMAGE_TYPES.includes(d.fileType))
  if (nonImageAssetPhotos.length > 0) {
    errors.push(`📸 Asset Photos: Only image files allowed (JPEG, PNG, WebP). Found ${nonImageAssetPhotos.length} non-image file(s). Convert documents to images or upload photos instead.`)
  }
  
  // ID Proof: exactly 1
  const idProofs = documents.filter(d => d.documentType === DOCUMENT_TYPE.ID_PROOF)
  if (idProofs.length !== 1) {
    if (idProofs.length === 0) {
      errors.push(`🆔 ID Proof: Exactly 1 ID document required. Upload a clear photo/scan of your Aadhaar, PAN, Voter ID, Passport, or Driving License.`)
    } else {
      errors.push(`🆔 ID Proof: Exactly 1 ID document required. You have ${idProofs.length}. Please keep only one and remove the rest.`)
    }
  }
  
  // Address Proof: exactly 1
  const addressProofs = documents.filter(d => d.documentType === DOCUMENT_TYPE.ADDRESS_PROOF)
  if (addressProofs.length !== 1) {
    if (addressProofs.length === 0) {
      errors.push(`🏠 Address Proof: Exactly 1 address document required. Upload proof showing your address in the district you're requesting from (utility bill, bank statement, etc.).`)
    } else {
      errors.push(`🏠 Address Proof: Exactly 1 address document required. You have ${addressProofs.length}. Please keep only one and remove the rest.`)
    }
  }
  
  // Asset Documents: min 1, max 4
  const assetDocs = documents.filter(d => d.documentType === DOCUMENT_TYPE.ASSET_DOCUMENT)
  if (assetDocs.length < 1) {
    errors.push(`📄 Asset Documents: At least 1 document required. Upload purchase receipts, bills, warranty cards, or certificates related to your asset.`)
  }
  if (assetDocs.length > 4) {
    errors.push(`📄 Asset Documents: Maximum 4 documents allowed. You have ${assetDocs.length}. Please remove ${assetDocs.length - 4} document(s).`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

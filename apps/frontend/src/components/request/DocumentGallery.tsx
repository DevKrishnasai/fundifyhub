'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileImage, 
  FileText, 
  Download,
  Eye,
  Calendar,
  User,
  FileCheck,
  Clock,
  Receipt,
  CreditCard,
  MapPin,
  Camera,
  ArrowRightLeft,
  File,
  Loader2,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { 
  DOCUMENT_CATEGORY, 
  DOCUMENT_TYPE,
  DOCUMENT_UPLOADER_ROLE,
  DOCUMENT_TYPE_CONFIG,
  DOCUMENT_CATEGORY_LABELS,
  CLIENT_CONSTANTS,
} from '@fundifyhub/types';
import PreviewModal from '@/components/common/PreviewModal';
import { getBulkSignedUrls, downloadDocumentBlob } from '@/lib/document-api';

interface Document {
  id: string;
  documentType?: string;
  documentCategory?: string;
  url?: string | null;
  fileKey?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  uploadedBy?: string;
  uploaderRole?: string;
  uploadedAt?: string;
  isVerified?: boolean;
}

interface SignedUrlCache {
  [documentId: string]: {
    url: string;
    expiresAt: string;
  };
}

const iconMap: Record<string, React.ComponentType<any>> = {
  FileImage, Receipt, CreditCard, MapPin, Camera, ArrowRightLeft, FileText, User, File, FileCheck
};

interface DocumentGalleryProps {
  documents: Document[];
  // Optional handler to delete a document. If provided, a "Remove" button
  // will be shown for documents that the caller is allowed to delete.
  onDeleteDocument?: (documentId: string) => Promise<boolean>;
  // Optional list of fileKeys that were uploaded in the current session/interaction.
  // Remove should only be shown for documents whose fileKey appears in this list.
  recentlyUploadedFileKeys?: string[];
  // User role information for download permissions
  userRole?: 'customer' | 'agent' | 'admin';
}

export function DocumentGallery({ documents, onDeleteDocument, recentlyUploadedFileKeys, userRole }: DocumentGalleryProps) {
  const [previewDocument, setPreviewDocument] = useState<{ url: string; mimeType: string; title: string } | null>(null);
  // Local copy so we can optimistically remove deleted items without forcing
  // the parent to immediately refetch. Parent may still refetch for truth.
  const [localDocs, setLocalDocs] = useState<Document[]>(documents || []);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [signedUrls, setSignedUrls] = useState<SignedUrlCache>({});
  const [loadingUrls, setLoadingUrls] = useState(false);

  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (documents.length === 0) return;

      setLoadingUrls(true);
      try {
        const documentIds = documents.map(doc => doc.id);
          const response = await getBulkSignedUrls({ documentIds, expiresIn: CLIENT_CONSTANTS.SIGNED_URL_EXPIRES });

        const urlCache: SignedUrlCache = {};
        response.forEach(item => {
          urlCache[item.id] = { url: item.url, expiresAt: item.expiresAt.toString() };
        });

        setSignedUrls(urlCache);
      } catch (error) {
        console.error('Failed to fetch signed URLs:', error);
      } finally {
        setLoadingUrls(false);
      }
    };

    fetchSignedUrls();

    const refreshInterval = setInterval(() => {
      const now = new Date();
      const shouldRefresh = Object.values(signedUrls).some(cache => {
        const expiresAt = new Date(cache.expiresAt);
        return (expiresAt.getTime() - now.getTime()) < (CLIENT_CONSTANTS.SIGNED_URL_REFRESH_THRESHOLD_SECONDS * 1000);
      });

      if (shouldRefresh) fetchSignedUrls();
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [documents]);

  // Keep local docs in sync when parent changes the documents prop.
  // Ensure that documents uploaded in this session (recentlyUploadedFileKeys)
  // are shown first while preserving original order otherwise.
  useEffect(() => {
    const recentSet = new Set((recentlyUploadedFileKeys || []).filter(Boolean));
    // Preserve original index for stable ordering when neither is "recent"
    const indexed = (documents || []).map((d, i) => ({ doc: d, idx: i }));
    indexed.sort((a, b) => {
      const aRecent = a.doc.fileKey && recentSet.has(a.doc.fileKey);
      const bRecent = b.doc.fileKey && recentSet.has(b.doc.fileKey);
      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;
      return a.idx - b.idx;
    });
    setLocalDocs(indexed.map(x => x.doc));
  }, [documents, recentlyUploadedFileKeys]);

  const groupedDocs = {
    all: localDocs,
    ...Object.values(DOCUMENT_CATEGORY).reduce((acc, category) => {
      acc[category] = (localDocs || []).filter(d => d.documentCategory === category);
      return acc;
    }, {} as Record<string, Document[]>)
  };

  const getTabLabel = (key: string) => {
    const docs = groupedDocs as Record<string, Document[]>;
    const count = docs[key]?.length || 0;
    
    if (key in DOCUMENT_CATEGORY_LABELS) {
      return `${DOCUMENT_CATEGORY_LABELS[key as DOCUMENT_CATEGORY]} (${count})`;
    }
    return key === 'all' ? `All (${count})` : `${key} (${count})`;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      [DOCUMENT_CATEGORY.ASSET]: <FileImage className="h-4 w-4" />,
      [DOCUMENT_CATEGORY.INSPECTION]: <Camera className="h-4 w-4" />,
      [DOCUMENT_CATEGORY.PAYMENT]: <Receipt className="h-4 w-4" />,
      [DOCUMENT_CATEGORY.LOAN]: <FileText className="h-4 w-4" />,
      [DOCUMENT_CATEGORY.IDENTITY]: <Shield className="h-4 w-4" />,
      [DOCUMENT_CATEGORY.TRANSFER_PROOF]: <ArrowRightLeft className="h-4 w-4" />,
    };
    return icons[category];
  };

  const getDocumentConfig = (type: string) => {
    return DOCUMENT_TYPE_CONFIG[type as DOCUMENT_TYPE] || {
      label: type, isDownloadable: false, icon: 'File', description: 'Document'
    };
  };

  const getUploaderBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      [DOCUMENT_UPLOADER_ROLE.USER_SUBMITTED]: 'default',
      [DOCUMENT_UPLOADER_ROLE.AGENT_SUBMITTED]: 'secondary',
      [DOCUMENT_UPLOADER_ROLE.ADMIN_SUBMITTED]: 'outline',
    };
    
    const labels: Record<string, string> = {
      [DOCUMENT_UPLOADER_ROLE.USER_SUBMITTED]: 'Customer',
      [DOCUMENT_UPLOADER_ROLE.AGENT_SUBMITTED]: 'Agent',
      [DOCUMENT_UPLOADER_ROLE.ADMIN_SUBMITTED]: 'Admin',
    };
    
    return (
      <Badge variant={variants[role] || 'outline'} className="text-[10px] px-1.5 py-0">
        {labels[role] || role}
      </Badge>
    );
  };

  // Determine if a document is an image. We prefer fileName extension but fall
  // back to MIME type when extension is missing (some uploads only provide fileType).
  const isImageFile = (fileName: string | null, fileType?: string | null) => {
    if (fileName) {
      const lower = fileName.toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some(ext => lower.endsWith(ext))) {
        return true;
      }
    }
    if (fileType) {
      return String(fileType).toLowerCase().startsWith('image/');
    }
    return false;
  };

  const isPdfFile = (fileName: string | null) => {
    return fileName?.toLowerCase().endsWith('.pdf') || false;
  };

  const handleDocumentClick = (doc: Document) => {
    const signedUrl = signedUrls[doc.id]?.url;
    if (!signedUrl) return;

    const mimeType = doc.fileType || getMimeType(doc.fileName ?? '');
    setPreviewDocument({ url: signedUrl, mimeType, title: doc.fileName || 'Document' });
  };

  const getMimeType = (fileName: string): string => {
    const ext = fileName.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 
      'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const formatFileSize = (size?: number | null) => {
    if (size === undefined || size === null) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileTypeLabel = (doc: Document) => {
    if (doc.fileType) {
      const parts = String(doc.fileType).split('/');
      return (parts[1] || parts[0] || '').toUpperCase();
    }
    if (doc.fileName) {
      const ext = doc.fileName.split('.').pop() || '';
      return ext.toUpperCase();
    }
    return 'FILE';
  };

  const formatUploadedAt = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return iso;
    }
  };

  const handleDownload = async (doc: Document) => {
    const signedUrl = signedUrls[doc.id]?.url;
    if (!signedUrl) return;

    try {
      const result = await downloadDocumentBlob(signedUrl);
      if (result.ok) {
        const blob = result.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName || 'document';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Download failed:', result.error?.message);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const isDownloadAllowed = (doc: Document) => {
    if (!userRole) return false;

    const docType = doc.documentType;
    const uploaderRole = doc.uploaderRole;

    switch (userRole) {
      case 'admin':
        // Admins can download everything
        return true;

      case 'customer':
        // Customers can download:
        // - Their own uploaded documents (ID proof, asset photos, receipts, etc.)
        // - Loan agreements and signed agreements
        // - Transfer proofs and payment receipts
        // - NOT inspection photos taken by agents
        return (
          docType === DOCUMENT_TYPE.LOAN_AGREEMENT ||
          docType === DOCUMENT_TYPE.TRANSFER_PROOF ||
          docType === DOCUMENT_TYPE.ID_PROOF ||
          docType === DOCUMENT_TYPE.ASSET_PHOTO ||
          docType === DOCUMENT_TYPE.PURCHASE_RECEIPT ||
          docType === DOCUMENT_TYPE.EMI_RECEIPT ||
          (uploaderRole === DOCUMENT_UPLOADER_ROLE.USER_SUBMITTED)
        );

      case 'agent':
        // Agents can download:
        // - Documents they uploaded (inspection photos)
        // - Customer-uploaded documents relevant to their work
        // - Loan agreements (for reference)
        // - Transfer proofs (for verification)
        // - NOT sensitive customer documents like ID proofs
        return (
          docType === DOCUMENT_TYPE.LOAN_AGREEMENT ||
          docType === DOCUMENT_TYPE.TRANSFER_PROOF ||
          docType === DOCUMENT_TYPE.INSPECTION_PHOTO ||
          docType === DOCUMENT_TYPE.ASSET_PHOTO ||
          docType === DOCUMENT_TYPE.PURCHASE_RECEIPT ||
          (uploaderRole === DOCUMENT_UPLOADER_ROLE.AGENT_SUBMITTED) ||
          (uploaderRole === DOCUMENT_UPLOADER_ROLE.USER_SUBMITTED && 
           docType !== DOCUMENT_TYPE.ID_PROOF) // Agents can't download customer ID proofs
        );

      default:
        return false;
    }
  };

  const renderDocumentGrid = (docs: Document[]) => {
    if (docs.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileImage className="h-16 w-16 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No documents in this category</p>
        </div>
      );
    }

    if (loadingUrls) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {docs.map((doc) => {
          const config = getDocumentConfig(doc.documentType || '');
          const IconComponent = iconMap[config.icon] || File;
          const signedUrl = signedUrls[doc.id]?.url;
          const hasSignedUrl = !!signedUrl;
          const isImage = isImageFile(doc.fileName ?? null, doc.fileType ?? null);
          const isPdf = isPdfFile(doc.fileName ?? null);
          
          return (
            <div
              key={doc.id}
              className="group relative bg-card border rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-200"
            >
              <div
                className={`relative aspect-video bg-muted flex items-center justify-center overflow-hidden ${hasSignedUrl ? 'cursor-pointer' : ''}`}
                role={hasSignedUrl ? 'button' : undefined}
                tabIndex={hasSignedUrl ? 0 : undefined}
                aria-label={hasSignedUrl ? `View ${doc.fileName || 'document'}` : undefined}
                onClick={() => hasSignedUrl && handleDocumentClick(doc)}
                onKeyDown={(e) => {
                  if (!hasSignedUrl) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDocumentClick(doc);
                  }
                }}
              >
                {isImage && hasSignedUrl ? (
                  <>
                    <img
                      src={signedUrl}
                      alt={doc.fileName || 'Document'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // If image fails to load (broken URL/CORS), hide the img and let the fallback UI show
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = 'none';
                        const parent = el.parentElement;
                        if (parent) {
                          parent.classList.add('bg-muted', 'text-muted-foreground', 'flex', 'flex-col', 'items-center', 'justify-center');
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-8 w-8 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  </>
                ) : isPdf ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-red-500">
                    <FileText className="h-16 w-16" strokeWidth={1.5} />
                    <span className="text-xs font-medium">PDF</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <IconComponent className="h-14 w-14" strokeWidth={1.5} />
                    <span className="text-xs font-medium">{config.label}</span>
                  </div>
                )}
                
                {!hasSignedUrl && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}

                {doc.isVerified && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="p-3">
                {/* Row layout: filename centered on its own row, then metadata each on its own row (right-aligned) */}
                <div className="flex flex-col gap-2">
                  <div className="w-full flex items-center justify-center">
                    <h4 className="font-semibold text-sm truncate text-center" title={doc.fileName || undefined}>
                      {doc.fileName || 'Unnamed document'}
                    </h4>
                  </div>

                  <div className="shrink-0 flex justify-between text-xs text-muted-foreground gap-1">
                    {doc.fileType && (
                      <Badge className="text-[10px] px-1.5 py-0">{getFileTypeLabel(doc)}</Badge>
                    )}

                    {doc.uploadedAt && (
                      <div>{formatUploadedAt(doc.uploadedAt)}</div>
                    )}

                    {doc.fileSize !== undefined && doc.fileSize !== null && (
                      <div>{formatFileSize(doc.fileSize)}</div>
                    )}

                    {doc.uploaderRole && (
                      <div className="mt-1">{getUploaderBadge(doc.uploaderRole)}</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-3 justify-end">
                  {isDownloadAllowed(doc) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!hasSignedUrl}
                      className="pointer-events-auto p-2 h-8 w-8 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(doc);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDeleteDocument && recentlyUploadedFileKeys && doc.fileKey && recentlyUploadedFileKeys.includes(doc.fileKey) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await onDeleteDocument(doc.id);
                        if (ok) {
                          // Optimistically remove from local list
                          setLocalDocs((prev) => prev.filter(d => d.id !== doc.id));
                        }
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const docsIndex = groupedDocs as Record<string, Document[]>;
  const availableTabs = [
    'all',
    ...Object.values(DOCUMENT_CATEGORY).filter(category => (docsIndex[category]?.length || 0) > 0)
  ];

  if (documents.length === 0) {
    // Show helpful presets to guide the user what to upload
    const presetTypes = [
      DOCUMENT_TYPE.ASSET_PHOTO,
      DOCUMENT_TYPE.ID_PROOF,
      DOCUMENT_TYPE.PURCHASE_RECEIPT,
      DOCUMENT_TYPE.INSPECTION_PHOTO,
    ];

    return (
      <div className="space-y-4">
        <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg">
          <FileImage className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
          <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
          <p className="text-sm text-muted-foreground">Documents will appear here once uploaded. Here are some common document types you can upload:</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {presetTypes.map((t) => {
            const cfg = getDocumentConfig(t);
            const Icon = iconMap[cfg.icon] || File;
            return (
              <div key={t} className="bg-card border rounded-lg p-4 flex flex-col items-start gap-2">
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-muted rounded-md">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{cfg.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cfg.description}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-block text-xs text-muted-foreground px-2 py-1 rounded-md border">Suggested</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <div className="border-b pb-2">
            <TabsList className="w-full justify-start h-auto flex-wrap bg-transparent p-0 gap-2">
              {availableTabs.map((tab) => (
                <TabsTrigger 
                  key={tab} 
                  value={tab}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-3 py-1.5"
                >
                  {tab !== 'all' && getCategoryIcon(tab)}
                  <span className="text-sm font-medium">{getTabLabel(tab)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {availableTabs.map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {renderDocumentGrid(docsIndex[tab] || [])}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <PreviewModal
        open={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        source={previewDocument}
        showDownload={true}
      />
    </>
  );
}
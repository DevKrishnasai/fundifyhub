'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Clock
} from 'lucide-react';
import { DOCUMENT_CATEGORY, DOCUMENT_TYPE } from '@fundifyhub/types';
import { ImageViewerModal } from './ImageViewerModal';

interface Document {
  id: string;
  documentType?: string;
  documentCategory?: string;
  url?: string | null;
  fileKey?: string | null;
  fileName?: string | null;
  uploadedBy?: string;
  uploadedAt?: string;
  isVerified?: boolean;
}

interface DocumentGalleryProps {
  documents: Document[];
  title?: string;
  showUploader?: boolean;
}

export function DocumentGallery({ documents, title = 'Documents', showUploader = true }: DocumentGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; fileName: string; type: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Categorize documents
  const categorizedDocs = {
    all: documents,
    [DOCUMENT_CATEGORY.ASSET]: documents.filter(d => 
      d.documentType === DOCUMENT_TYPE.ASSET_PHOTO
    ),
    [DOCUMENT_CATEGORY.INSPECTION]: documents.filter(d => 
      d.documentType === DOCUMENT_TYPE.INSPECTION_PHOTO
    ),
    [DOCUMENT_CATEGORY.PAYMENT]: documents.filter(d => 
      d.documentType === DOCUMENT_TYPE.EMI_RECEIPT
    ),
    [DOCUMENT_CATEGORY.LOAN]: documents.filter(d => 
      d.documentType === DOCUMENT_TYPE.LOAN_AGREEMENT
    ),
    [DOCUMENT_CATEGORY.IDENTITY]: documents.filter(d => 
      d.documentType === DOCUMENT_TYPE.ID_PROOF || 
      d.documentType === DOCUMENT_TYPE.ADDRESS_PROOF
    ),
  };

  const getCategoryLabel = (category: string) => {
    const count = categorizedDocs[category as keyof typeof categorizedDocs]?.length || 0;
    const labels: Record<string, string> = {
      all: 'All Documents',
      [DOCUMENT_CATEGORY.ASSET]: 'Asset Photos',
      [DOCUMENT_CATEGORY.INSPECTION]: 'Inspection',
      [DOCUMENT_CATEGORY.PAYMENT]: 'Payment Proofs',
      [DOCUMENT_CATEGORY.LOAN]: 'Loan Documents',
      [DOCUMENT_CATEGORY.IDENTITY]: 'ID Proofs',
    };
    return `${labels[category] || category} ${count > 0 ? `(${count})` : ''}`;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      [DOCUMENT_CATEGORY.ASSET]: <FileImage className="h-4 w-4" />,
      [DOCUMENT_CATEGORY.INSPECTION]: <FileCheck className="h-4 w-4" />,
      [DOCUMENT_CATEGORY.PAYMENT]: <FileText className="h-4 w-4" />,
      [DOCUMENT_CATEGORY.LOAN]: <FileText className="h-4 w-4" />,
      [DOCUMENT_CATEGORY.IDENTITY]: <User className="h-4 w-4" />,
    };
    return icons[category];
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      [DOCUMENT_TYPE.ASSET_PHOTO]: 'Asset Photo',
      [DOCUMENT_TYPE.INSPECTION_PHOTO]: 'Inspection Photo',
      [DOCUMENT_TYPE.EMI_RECEIPT]: 'EMI Receipt',
      [DOCUMENT_TYPE.LOAN_AGREEMENT]: 'Loan Agreement',
      [DOCUMENT_TYPE.ID_PROOF]: 'ID Proof',
      [DOCUMENT_TYPE.ADDRESS_PROOF]: 'Address Proof',
    };
    return labels[type] || type;
  };

  const getUploaderBadge = (uploader: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      CUSTOMER: 'default',
      AGENT: 'secondary',
      ADMIN: 'outline',
    };
    return (
      <Badge variant={variants[uploader] || 'outline'} className="text-xs">
        {uploader}
      </Badge>
    );
  };

  const isImageFile = (fileName: string | null) => {
    if (!fileName) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const handleDocumentClick = (doc: Document) => {
    if (!doc.url) return;
    
    if (isImageFile(doc.fileName ?? null)) {
      setSelectedImage({
        url: doc.url,
        fileName: doc.fileName || 'document',
        type: doc.documentType || 'unknown',
      });
    } else {
      // For non-image files, download directly
      window.open(doc.url, '_blank');
    }
  };

  const renderDocumentGrid = (docs: Document[]) => {
    if (docs.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileImage className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No documents in this category</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {docs.map((doc) => (
          <Card key={doc.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              {/* Document Preview */}
              <div 
                className="relative aspect-video bg-muted cursor-pointer group"
                onClick={() => handleDocumentClick(doc)}
              >
                {isImageFile(doc.fileName ?? null) ? (
                  <>
                    <img
                      src={doc.url || ''}
                      alt={doc.fileName || 'Document'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" className="gap-2">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Document Info */}
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {getDocumentTypeLabel(doc.documentType || 'unknown')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={doc.fileName || undefined}>
                      {doc.fileName || 'document'}
                    </p>
                  </div>
                  {showUploader && doc.uploadedBy && getUploaderBadge(doc.uploadedBy)}
                </div>

                {doc.uploadedAt && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(doc.uploadedAt).toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                )}

                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  disabled={!doc.url}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (doc.url) window.open(doc.url, '_blank');
                  }}
                >
                  <Download className="h-3 w-3 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Filter out categories with 0 documents
  const availableCategories = Object.keys(categorizedDocs).filter(
    category => category === 'all' || (categorizedDocs[category as keyof typeof categorizedDocs]?.length || 0) > 0
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-primary" />
            {title}
            <Badge variant="secondary">{documents.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              {availableCategories.map((category) => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  {category !== 'all' && getCategoryIcon(category)}
                  {getCategoryLabel(category)}
                </TabsTrigger>
              ))}
            </TabsList>

            {availableCategories.map((category) => (
              <TabsContent key={category} value={category} className="mt-4">
                {renderDocumentGrid(categorizedDocs[category as keyof typeof categorizedDocs] || [])}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage?.url || ''}
        fileName={selectedImage?.fileName || ''}
        documentType={selectedImage?.type}
      />
    </>
  );
}

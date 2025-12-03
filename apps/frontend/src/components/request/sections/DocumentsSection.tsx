'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye,
  Trash2,
  AlertCircle,
  File,
  FileImage,
  X,
} from 'lucide-react';
import { REQUEST_STATUS } from '@fundifyhub/types';
import type { RequestType, DocumentType } from '@fundifyhub/types';
import { 
  SectionCard, 
  SectionDivider,
  EmptyState,
} from './SectionCard';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * DocumentsSection - Displays and manages request documents
 * Supports upload, preview, verification, and categorized display
 */

interface DocumentsSectionProps {
  request: RequestType;
  userRole: 'CUSTOMER' | 'DISTRICT_ADMIN' | 'SUPER_ADMIN' | 'AGENT';
  isLoading?: boolean;
  onUpload?: (category: string) => void;
  onPreview?: (document: DocumentType) => void;
  onDelete?: (document: DocumentType) => void;
  isActionLoading?: boolean;
  className?: string;
}

// Group documents by category
type GroupedDocuments = Record<string, DocumentType[]>;

export function DocumentsSection({
  request,
  userRole,
  isLoading,
  onUpload,
  onPreview,
  onDelete,
  isActionLoading,
  className,
}: DocumentsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  
  const documents = request.documents || [];
  const isCustomer = userRole === 'CUSTOMER';
  const isAdmin = userRole === 'DISTRICT_ADMIN' || userRole === 'SUPER_ADMIN';
  const isAgent = userRole === 'AGENT';

  // Can customer upload?
  const canUpload = isCustomer && [
    REQUEST_STATUS.PENDING,
    REQUEST_STATUS.MORE_INFO_REQUIRED,
  ].includes(request.currentStatus as REQUEST_STATUS);

  // Group documents by category
  const groupedDocuments = useMemo(() => {
    const grouped: GroupedDocuments = {};
    documents.forEach((doc) => {
      const category = doc.documentCategory || 'OTHER';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(doc);
    });
    return grouped;
  }, [documents]);

  const categories = Object.keys(groupedDocuments);
  const filteredDocuments = selectedCategory === 'all' 
    ? documents 
    : groupedDocuments[selectedCategory] || [];

  // Get category label
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      ASSET_PHOTO: 'Asset Photos',
      ID_PROOF: 'ID Documents',
      ADDRESS_PROOF: 'Address Proof',
      INCOME_PROOF: 'Income Documents',
      BANK_STATEMENT: 'Bank Statements',
      AGREEMENT: 'Agreements',
      RECEIPT: 'Receipts',
      OTHER: 'Other Documents',
    };
    return labels[category] || category.replace(/_/g, ' ');
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return FileImage;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  if (documents.length === 0 && !canUpload) {
    return (
      <SectionCard
        title="Documents"
        icon={FileText}
        isLoading={isLoading}
        className={className}
        id="documents-section"
      >
        <EmptyState
          title="No Documents"
          description="No documents have been uploaded for this request."
          icon={FileText}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Documents"
      icon={FileText}
      isLoading={isLoading}
      className={className}
      id="documents-section"
      actions={null}
    >
      {/* Category Filter (if multiple categories exist) */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All ({documents.length})
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {getCategoryLabel(category)} ({groupedDocuments[category].length})
            </Button>
          ))}
        </div>
      )}

      {/* Document Grid - Improved layout with consistent card heights */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          title="No Documents in Category"
          description="No documents found in the selected category."
          icon={FileText}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => {
            const FileIcon = getFileIcon(doc.fileType);
            const isImage = doc.fileType.startsWith('image/');
            const isPdf = doc.fileType.includes('pdf');
            
            return (
              <div
                key={doc.id}
                className={cn(
                  'group relative flex flex-col rounded-lg border bg-card overflow-hidden h-[200px]',
                  'hover:border-primary/50 hover:shadow-md transition-all'
                )}
              >
                {/* Preview Area - Click to view */}
                <button
                  onClick={() => onPreview?.(doc)}
                  className={cn(
                    'relative flex-1 w-full bg-muted/50 dark:bg-muted/20 flex items-center justify-center',
                    'hover:bg-muted/80 dark:hover:bg-muted/30 transition-colors cursor-pointer overflow-hidden'
                  )}
                  title="Click to view"
                >
                  {isImage && doc.url ? (
                    <img 
                      src={doc.url} 
                      alt={doc.fileName}
                      className="h-full w-full object-cover"
                    />
                  ) : isPdf ? (
                    <div className="flex flex-col items-center gap-2 p-4">
                      <FileText className="h-12 w-12 text-red-500" />
                      <span className="text-xs text-muted-foreground font-medium">PDF</span>
                    </div>
                  ) : (
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                  
                  {/* Hover overlay with view icon - Theme aware */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 dark:group-hover:bg-black/60 transition-colors flex items-center justify-center">
                    <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </button>

                {/* Document Info - Fixed height for consistency */}
                <div className="p-2.5 bg-card border-t h-[52px] flex flex-col justify-center">
                  <p className="text-xs font-medium truncate leading-tight" title={doc.fileName}>
                    {doc.fileName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Action buttons - Show on hover with proper theme colors */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.url && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-background/95 hover:bg-background shadow-md border border-border/50 cursor-pointer"
                      title="Download"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await fetch(doc.url!);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = doc.fileName;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (error) {
                          console.error('Download failed:', error);
                          window.open(doc.url!, '_blank');
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {isCustomer && canUpload && onDelete && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 bg-background/95 hover:bg-red-50 dark:hover:bg-red-950/50 shadow-md border border-border/50 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc);
                      }}
                      title="Delete"
                      disabled={isActionLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {/* Category badge - Theme aware */}
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 left-2 text-[10px] bg-background/95 dark:bg-background/90 shadow-md border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {getCategoryLabel(doc.documentCategory).split(' ')[0]}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Prompt for MORE_INFO_REQUIRED - REMOVED as it is now handled by ResponseSection */}
    </SectionCard>
  );
}

export default DocumentsSection;

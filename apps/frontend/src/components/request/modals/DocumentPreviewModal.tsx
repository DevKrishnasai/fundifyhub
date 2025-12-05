'use client';

import React from 'react';
import NextImage from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, File, X } from 'lucide-react';
import type { DocumentType } from '@fundifyhub/types';

interface DocumentPreviewModalProps {
  document: DocumentType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentPreviewModal({ document, open, onOpenChange }: DocumentPreviewModalProps) {
  if (!document) return null;

  const isImage = document.fileType.startsWith('image/');
  const isPdf = document.fileType.includes('pdf');

  const handleDownload = async () => {
    if (!document.url) return;
    try {
      const response = await fetch(document.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab
      window.open(document.url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 [&>button]:top-5 [&>button]:right-5">
        <div className="flex items-center justify-between p-4 pr-14 border-b">
          <DialogTitle className="truncate">{document.fileName}</DialogTitle>
          <div className="flex items-center gap-2">
            {document.url && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload}
                className="cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-muted/10 p-4 flex items-center justify-center">
          {isImage && document.url && (
            <div className="relative max-w-full max-h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={document.url} 
                alt={document.fileName}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          {isPdf && document.url && (
            <iframe
              src={document.url}
              className="w-full h-full rounded-md border bg-white"
              title={document.fileName}
            />
          )}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <File className="h-20 w-20 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Preview not available</p>
              <p className="text-muted-foreground mb-6">
                This file type cannot be previewed directly in the browser.
              </p>
              {document.url && (
                <Button onClick={handleDownload} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

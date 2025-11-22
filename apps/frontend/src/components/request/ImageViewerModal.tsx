'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  documentType?: string;
}

export function ImageViewerModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  fileName, 
  documentType 
}: ImageViewerModalProps) {
  const [zoom, setZoom] = useState(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background shrink-0">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{fileName}</h3>
              {documentType && (
                <p className="text-sm text-muted-foreground">{documentType}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(50, zoom - 25))}
                disabled={zoom <= 50}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-16 text-center font-medium">{zoom}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 overflow-auto bg-muted/30 p-6 flex items-center justify-center">
            <img
              src={imageUrl}
              alt={fileName}
              style={{ 
                width: `${zoom}%`, 
                maxWidth: 'none',
                imageRendering: zoom > 100 ? 'crisp-edges' : 'auto'
              }}
              className="rounded-lg shadow-2xl"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { ZoomIn, ZoomOut, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PreviewSource = {
  url: string;
  mimeType?: string | null;
  title?: string | null;
};

export interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  source: PreviewSource | null;
  /** If true, append a #toolbar=0 fragment to PDF urls (best-effort, not guaranteed on all mobile browsers) */
  hidePdfToolbar?: boolean;
  /** initial zoom for images (1 = 100%) */
  initialZoom?: number;
  /** show a download button */
  showDownload?: boolean;
}

export default function PreviewModal({
  open,
  onClose,
  source,
  hidePdfToolbar = true,
  initialZoom = 1,
  showDownload = true,
}: PreviewModalProps) {
  const [zoom, setZoom] = useState<number>(initialZoom);

  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom, source?.url]);

  useEffect(() => {
    if (!open) return;
    // lock body scroll while dialog is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!source) return null;

  const isImage = source.mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)$/i.test(source.url);
  const isPdf = source.mimeType === "application/pdf" || /\.pdf($|#|\?)/i.test(source.url);
  const pdfSrc = hidePdfToolbar && isPdf ? `${source.url}${source.url.includes("#") ? "&" : "#"}toolbar=0` : source.url;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = source.url;
    link.download = source.title || '';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      {/* Add outer margins so modal never touches screen edges and has padding around all sides */}
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full min-h-0">
          {/* Header: title + document type on the left, actions on the right (desktop) */}
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b bg-background shrink-0 gap-2 pr-16 sm:pr-24">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{source.title}</h3>
              {source.mimeType && (
                <p className="text-sm text-muted-foreground">{source.mimeType}</p>
              )}
            </div>

            {/* Actions for medium+ screens */}
            <div className="hidden sm:flex items-center gap-2 ml-0 relative z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(0.25, +(zoom - 0.25).toFixed(2)))}
                disabled={zoom <= 0.25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-16 text-center font-medium">{Math.round(zoom * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(4, +(zoom + 0.25).toFixed(2)))}
                disabled={zoom >= 4}
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
            </div>
          </div>

          {/* Content Container */}
          <div className="flex-1 bg-muted/30 flex items-center justify-center overflow-auto min-h-0">
            {isPdf ? (
              <div className="w-full h-full flex items-center justify-center min-h-0">
                <iframe
                  src={pdfSrc}
                  title={source.title ?? 'PDF preview'}
                  className="w-full rounded-lg border h-full"
                  style={{ minHeight: 200 }}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center min-h-0">
                <div className="w-full overflow-auto flex items-center justify-center p-2 h-full" style={{ maxHeight: '100%' }}>
                  <img
                    src={source.url}
                    alt={source.title ?? 'preview'}
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center center',
                      willChange: 'transform',
                      maxWidth: '100%',
                      maxHeight: '100%'
                    }}
                    className="rounded-lg shadow-2xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mobile action bar: fixed at bottom of modal content area on small screens */}
          <div className="sm:hidden w-full border-t bg-background p-2 flex items-center justify-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.25, +(zoom - 0.25).toFixed(2)))}
              disabled={zoom <= 0.25}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-16 text-center font-medium">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(4, +(zoom + 0.25).toFixed(2)))}
              disabled={zoom >= 4}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

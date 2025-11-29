'use client';

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RotateCcw, Check, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateAgreement } from '@/lib/document-api';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => Promise<void>;
  requestId: string;
  requestNumber?: string;
  // When true hide the "Download Agreement" button
  disableDownload?: boolean;
  // When true, do not call onSave automatically on preview confirm; instead call onPreview
  disableAutoSave?: boolean;
  // Called when user clicks Preview & Confirm and auto save is disabled
  onPreview?: (previewUrl: string) => void;
  // Render without an outer Card wrapper (useful when embedding inline into other cards)
  inline?: boolean;
}

export function SignaturePad({
  onSave,
  requestId,
  requestNumber,
  disableDownload = false,
  disableAutoSave = false,
  onPreview,
  inline = false,
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const { error: toastError } = useToast();

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handlePreview = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toastError('Please provide your signature first');
      return;
    }

    const dataUrl = sigCanvas.current.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    setShowPreview(true);
  };

  const handleConfirmSave = async () => {
    if (disableAutoSave && typeof onPreview === 'function') {
      // When parent wants to control final saving, notify it with preview URL
      try {
        onPreview(previewUrl);
        // keep dialog open so parent may decide when to close it
      } catch (err) {
        toastError(
          'Failed to prepare signature: ' +
            (err instanceof Error ? err.message : 'Unknown error')
        );
      }
      return;
    }

    setSaving(true);
    try {
      await onSave(previewUrl);
      setShowPreview(false);
    } catch (error) {
      toastError(
        'Failed to save signature: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadAgreement = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await generateAgreement(requestId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loan-agreement-${requestNumber || requestId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toastError(
        'Failed to download agreement: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const CardInner = (
    <>
        <div className="mb-4">
          <p className="text-sm mb-2 font-medium">
            ✍️ Sign below using your mouse or touchscreen
          </p>
          <div className="border rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-40 sm:h-48 md:h-56 cursor-crosshair',
                style: { touchAction: 'none' },
              }}
              backgroundColor="white"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              onClick={clearSignature}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <RotateCcw className="h-3 w-3 mr-2" />
              Clear
            </Button>
            <Button
              onClick={handlePreview}
              variant="default"
              size="sm"
              className="flex-1"
            >
              <Check className="h-3 w-3 mr-2" />
              Preview & Confirm
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs flex items-start gap-2">
            <span className="text-base shrink-0">💡</span>
            <span>
              <strong>Tips:</strong> Use a mouse or touchscreen to sign. Make
              sure your signature is clear and legible. You can clear and redo
              if needed. Your signature will be securely attached to the loan
              agreement.
            </span>
          </p>
        </div>
    </>

  );

  return (
    <>
      {inline ? CardInner : <Card className="w-full">{CardInner}</Card>}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="w-full max-w-md sm:max-w-lg p-3 sm:p-6 overflow-auto">
          <DialogHeader>
            <DialogTitle>Confirm Your Signature</DialogTitle>
            <DialogDescription>
              Please review your signature before submitting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-2 bg-white dark:bg-gray-900 overflow-hidden">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Signature preview"
                  className="w-full h-auto object-contain max-h-64"
                />
              )}
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
              <p className="text-xs">
                <strong>⚠️ Important:</strong> By confirming, you agree to the
                terms and conditions of the loan agreement. This signature will
                be legally binding.
              </p>
            </div>
            <div className="flex gap-2 flex-col sm:flex-row">
              <Button
                onClick={() => setShowPreview(false)}
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                Go Back
              </Button>
              <Button
                onClick={handleConfirmSave}
                className="flex-1"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm & Sign
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

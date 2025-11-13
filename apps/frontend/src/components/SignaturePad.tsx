"use client";

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RotateCcw, Check, Download, Loader2 } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => Promise<void>;
  requestId: string;
  requestNumber?: string;
}

export function SignaturePad({ onSave, requestId, requestNumber }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handlePreview = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert('Please provide your signature first');
      return;
    }
    
    const dataUrl = sigCanvas.current.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    setShowPreview(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      await onSave(previewUrl);
      setShowPreview(false);
    } catch (error) {
      alert('Failed to save signature: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadAgreement = async () => {
    setDownloadingPdf(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/requests/${requestId}/generate-agreement`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download agreement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loan-agreement-${requestNumber || requestId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download agreement: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <>
      <Card className="border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            ✍️ Digital Signature Required
          </CardTitle>
          <CardDescription className="text-green-800 dark:text-green-200">
            Please review the loan agreement and sign below to proceed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Download Agreement Button */}
          <div className="bg-green-100 dark:bg-green-900 rounded-lg p-4 border-2 border-green-600">
            <p className="text-sm text-green-900 dark:text-green-100 mb-3 font-medium">
              📄 Step 1: Download and review the loan agreement
            </p>
            <Button
              onClick={handleDownloadAgreement}
              disabled={downloadingPdf}
              variant="outline"
              className="w-full border-green-600 text-green-900 hover:bg-green-100"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Loan Agreement PDF
                </>
              )}
            </Button>
          </div>

          {/* Signature Canvas */}
          <div>
            <p className="text-sm text-green-900 dark:text-green-100 mb-2 font-medium">
              ✍️ Step 2: Sign below using your mouse or touchscreen
            </p>
            <div className="border-2 border-green-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'w-full h-48 cursor-crosshair',
                  style: { touchAction: 'none' }
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
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-3 w-3 mr-2" />
                Preview & Confirm
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-green-100 dark:bg-green-900 rounded-lg p-3">
            <p className="text-xs text-green-800 dark:text-green-200 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <span>
                <strong>Tips:</strong> Use a mouse or touchscreen to sign. Make sure your signature is clear and legible. 
                You can clear and redo if needed. Your signature will be securely attached to the loan agreement.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Your Signature</DialogTitle>
            <DialogDescription>
              Please review your signature before submitting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 rounded-lg p-4 bg-white dark:bg-gray-900">
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  alt="Signature preview" 
                  className="w-full h-auto"
                />
              )}
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
              <p className="text-xs text-amber-900 dark:text-amber-100">
                <strong>⚠️ Important:</strong> By confirming, you agree to the terms and conditions 
                of the loan agreement. This signature will be legally binding.
              </p>
            </div>
            <div className="flex gap-2">
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
                className="flex-1 bg-green-600 hover:bg-green-700"
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

'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileImage, X, Loader2, Send } from 'lucide-react';
import { UploadButton } from '@/components/uploadthing-components';
import type { ClientUploadedFileData } from 'uploadthing/types';

interface UploadedFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
}

interface DisbursementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanAmount: number;
  processingFee: number;
  onSubmit: (transactionRef: string, files: UploadedFile[]) => Promise<void>;
  isSubmitting?: boolean;
}

export function DisbursementModal({
  open,
  onOpenChange,
  loanAmount,
  processingFee,
  onSubmit,
  isSubmitting = false,
}: DisbursementModalProps) {
  const [transactionRef, setTransactionRef] = React.useState('');
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = React.useState('');

  const handleClose = () => {
    setTransactionRef('');
    setFiles([]);
    setUploadProgress('');
    onOpenChange(false);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!transactionRef.trim() || files.length === 0) return;
    await onSubmit(transactionRef.trim(), files);
  };

  const canSubmit = transactionRef.trim() && files.length > 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Disburse Loan Amount</DialogTitle>
          <DialogDescription>
            Upload proof of transfer and confirm disbursement to customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Loan Amount Summary */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-primary mb-1">Loan Amount</h4>
                <p className="text-2xl font-bold text-primary">
                  ₹{loanAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-right">
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">
                  Processing Fee
                </h4>
                <p className="text-lg font-medium">
                  ₹{processingFee.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Reference */}
          <div>
            <Label htmlFor="transaction-ref">Transaction Reference / UTR Number *</Label>
            <Input
              id="transaction-ref"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="Enter transaction reference or UTR number"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the unique transaction reference from your bank statement
            </p>
          </div>

          {/* Upload Transfer Proof */}
          <div>
            <Label>Upload Transfer Proof *</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Upload screenshots or documents showing the successful transfer
            </p>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <UploadButton
                  endpoint="requestDocument"
                  appearance={{
                    button:
                      'bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium',
                  }}
                  content={{ button: 'Select Files' }}
                  onClientUploadComplete={(
                    res: ClientUploadedFileData<{
                      uploadedBy: string;
                      fileName: string;
                      fileSize: number;
                      fileType: string;
                    }>[]
                  ) => {
                    if (res && res.length > 0) {
                      const newFiles = res
                        .map((r) => ({
                          fileKey: r.key,
                          fileName: r.serverData?.fileName || r.name,
                          fileSize: r.serverData?.fileSize || r.size || 0,
                          fileType: r.serverData?.fileType || r.type,
                          url: r.url || undefined,
                        }))
                        .filter((f) => f.fileKey) as UploadedFile[];

                      if (newFiles.length > 0) {
                        setFiles((prev) => [...prev, ...newFiles]);
                      }
                    }
                    setUploadProgress('');
                  }}
                  onUploadError={(error: Error) => {
                    setUploadProgress('');
                    console.error('Upload error:', error.message);
                  }}
                  onUploadProgress={(progress: number) => {
                    setUploadProgress(`Uploading... ${Math.round(progress)}%`);
                  }}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Supported: Images (JPEG/PNG/WebP) and PDFs • Max 4MB each
                </p>
                {uploadProgress && (
                  <div className="mt-3 p-3 bg-primary/10 rounded-lg flex items-center justify-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-sm font-medium">{uploadProgress}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">
                  Files ready to upload ({files.length})
                </p>
                {files.map((file, idx) => (
                  <div
                    key={file.fileKey}
                    className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <FileImage className="h-5 w-5 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="font-medium">{file.fileName || file.fileKey}</div>
                        <div className="text-xs text-muted-foreground">
                          {(file.fileSize || 0) > 0
                            ? `${Math.round((file.fileSize || 0) / 1024)} KB`
                            : ''}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Disbursement...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm & Disburse Amount
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

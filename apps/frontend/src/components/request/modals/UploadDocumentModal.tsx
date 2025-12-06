'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UploadDropzone } from '@/components/uploadthing-components';
import { postWithResult } from '@/lib/api-client';
import { useToast } from '@/hooks';
import { DOCUMENT_TYPE } from '@fundifyhub/types';
import type { UploadedFileResult } from '@/lib/type-guards';

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  category?: string;
  onSuccess: () => void;
}

export function UploadDocumentModal({
  open,
  onOpenChange,
  requestId,
  category: initialCategory,
  onSuccess,
}: UploadDocumentModalProps) {
  const [category, setCategory] = useState<string>(initialCategory || 'OTHER');
  const [isUploading, setIsUploading] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false);
    }
  };

  const handleUploadComplete = async (res: UploadedFileResult[]) => {
    setIsUploading(true);
    try {
      // Process each uploaded file
      for (const file of res) {
        // UploadThing returns: key, name, size, type (and serverData with our custom return)
        const fileKey = file.key || file.serverData?.fileKey || '';
        const fileName = file.name || file.serverData?.fileName || '';
        const fileSize = file.size || file.serverData?.fileSize || 0;
        const fileType = file.type || file.serverData?.fileType || '';
        
        await postWithResult(`/api/v1/requests/${requestId}/documents`, {
          fileKey,
          fileName,
          fileSize,
          fileType,
          category: category,
        });
      }
      
      toastSuccess('Documents uploaded successfully');
      onSuccess();
      handleClose();
    } catch (err) {
      toastError('Failed to save document metadata');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadError = (error: Error) => {
    toastError(`Upload failed: ${error.message}`);
    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload files for your request. Supported formats: PDF, JPG, PNG.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!initialCategory && (
            <div className="space-y-2">
              <Label>Document Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DOCUMENT_TYPE).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="min-h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg p-4">
            <UploadDropzone
              endpoint="requestDocument"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              onUploadBegin={() => setIsUploading(true)}
              config={{
                mode: "auto",
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

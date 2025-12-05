'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, FileText, X, Upload, CheckCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { UploadDropzone } from '@/components/uploadthing-components';
import { postWithResult, deleteWithResult } from '@/lib/api-client';
import { useToast } from '@/hooks';
import { REQUEST_STATUS, WORKFLOW_EVENTS } from '@fundifyhub/types';
import { useRequestActions } from '../context/RequestActionContext';
import { cn } from '@/lib/utils';
import type { UploadedFileResult } from '@/lib/type-guards';

interface ResponseSectionProps {
  requestId: string;
  currentStatus: string;
  adminRequestedInfo?: string | null;
  onSuccess?: () => void;
}

interface StagedFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
  dbId?: string; // Document ID in database
}

// LocalStorage key for staged files
const getStorageKey = (requestId: string) => `fundifyhub_staged_files_${requestId}`;

export function ResponseSection({
  requestId,
  currentStatus,
  adminRequestedInfo,
  onSuccess,
}: ResponseSectionProps) {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const { executeAction } = useRequestActions();

  // Load staged files from localStorage on mount
  useEffect(() => {
    if (currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED) {
      const saved = localStorage.getItem(getStorageKey(requestId));
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as StagedFile[];
          setStagedFiles(parsed);
        } catch (e) {
          console.error('Failed to parse staged files from localStorage:', e);
        }
      }
    }
  }, [requestId, currentStatus]);

  // Save staged files to localStorage whenever they change
  useEffect(() => {
    if (currentStatus === REQUEST_STATUS.MORE_INFO_REQUIRED) {
      if (stagedFiles.length > 0) {
        localStorage.setItem(getStorageKey(requestId), JSON.stringify(stagedFiles));
      } else {
        localStorage.removeItem(getStorageKey(requestId));
      }
    }
  }, [stagedFiles, requestId, currentStatus]);

  // Only show this section if status is MORE_INFO_REQUIRED
  if (currentStatus !== REQUEST_STATUS.MORE_INFO_REQUIRED) {
    return null;
  }

  const handleUploadComplete = async (res: UploadedFileResult[]) => {
    try {
      const newFiles: StagedFile[] = [];
      
      for (const file of res) {
        // UploadThing returns: key, name, size, type (and serverData with our custom return)
        const fileKey = file.key || file.serverData?.fileKey || '';
        const fileName = file.name || file.serverData?.fileName || '';
        const fileSize = file.size || file.serverData?.fileSize || 0;
        const fileType = file.type || file.serverData?.fileType || '';
        
        // Save to database
        const category = 'OTHER'; 
        const result = await postWithResult<{ document: { id: string } }>(`/api/v1/requests/${requestId}/documents`, {
          fileKey,
          fileName,
          fileSize,
          fileType,
          category,
        });

        if (result.ok && result.data?.document) {
          newFiles.push({
            fileKey,
            fileName,
            fileSize,
            fileType,
            url: file.url,
            dbId: result.data.document.id,
          });
        } else {
          console.error('Failed to save document:', result.ok ? 'No document ID' : result.error?.message);
          toastError(`Failed to save ${fileName}`);
        }
      }
      
      if (newFiles.length > 0) {
        setStagedFiles((prev) => [...prev, ...newFiles]);
        toastSuccess('Documents uploaded. Please submit when ready.');
      }
    } catch (err) {
      toastError('Failed to save document metadata');
      console.error(err);
    }
  };

  const handleRemoveFile = async (fileToRemove: StagedFile) => {
    setIsRemoving(fileToRemove.fileKey);
    try {
      // Delete from database if we have a dbId
      if (fileToRemove.dbId) {
        // Use the documents API endpoint
        const result = await deleteWithResult(`/api/v1/documents/${fileToRemove.dbId}`);
        if (!result.ok) {
          console.error('Failed to delete document from DB:', result.error?.message);
          // Continue to remove from UI anyway
        }
      }
      
      // Remove from state (and localStorage via useEffect)
      setStagedFiles((prev) => prev.filter((f) => f.fileKey !== fileToRemove.fileKey));
      toastSuccess('File removed');
    } catch (err) {
      console.error('Error removing file:', err);
      toastError('Failed to remove file');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleSubmit = async () => {
    if (stagedFiles.length === 0) return;

    setIsSubmitting(true);
    try {
      const fileNames = stagedFiles.map(f => f.fileName).join(', ');
      const success = await executeAction(WORKFLOW_EVENTS.SUBMIT_INFO, {
        notes: `Uploaded documents: ${fileNames}`
      });

      if (success) {
        // Clear staged files and localStorage on successful submission
        setStagedFiles([]);
        localStorage.removeItem(getStorageKey(requestId));
        onSuccess?.();
      }
    } catch (error) {
      console.error('Failed to submit info:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isImage = (fileType: string) => fileType.startsWith('image/');
  const isPdf = (fileType: string) => fileType.includes('pdf');

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/10">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-1" />
          <div>
            <CardTitle className="text-base text-amber-900 dark:text-amber-100">
              Action Required: Provide Information
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300 mt-1">
              {adminRequestedInfo || 'Please provide the requested documents or information to proceed.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-lg bg-background/50">
          <UploadDropzone
            endpoint="requestDocument"
            onClientUploadComplete={handleUploadComplete}
            onUploadError={(error: Error) => toastError(`Upload failed: ${error.message}`)}
            config={{ mode: "auto" }}
            appearance={{
              container: "p-4",
              button: "bg-amber-600 hover:bg-amber-700 text-white",
              label: "text-amber-700 dark:text-amber-300",
              allowedContent: "text-amber-600/70 dark:text-amber-400/70"
            }}
          />
        </div>

        {/* Staged Files List */}
        {stagedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Ready to Submit ({stagedFiles.length})
            </h4>
            <div className="grid gap-2">
              {stagedFiles.map((file) => (
                <div 
                  key={file.fileKey}
                  className="flex items-center justify-between p-2 rounded-md bg-background border border-amber-100 dark:border-amber-900"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {isImage(file.fileType) ? (
                      <ImageIcon className="h-4 w-4 text-blue-600 shrink-0" />
                    ) : isPdf(file.fileType) ? (
                      <FileText className="h-4 w-4 text-red-600 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                    )}
                    <span className="text-sm truncate">{file.fileName}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.fileSize / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-600"
                    onClick={() => handleRemoveFile(file)}
                    disabled={isRemoving === file.fileKey}
                  >
                    {isRemoving === file.fileKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Action */}
        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={stagedFiles.length === 0 || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Response
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * useDocumentUpload Hook
 * 
 * Unified document upload logic with staging, progress tracking, and error handling.
 * Supports batch uploads with individual file progress.
 */

import { useState, useCallback, useRef } from 'react';
import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '@/lib/uploadthing/uploadthing';
import { toastSuccess, toastError } from '@/lib/toast';
import type { DOCUMENT_TYPE } from '@fundifyhub/types';

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

export interface StagedFile {
  id: string;
  file: File;
  preview: string;
  documentType: DOCUMENT_TYPE;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  uploadedKey?: string;
}

export interface UploadResult {
  success: boolean;
  fileKey?: string;
  fileName?: string;
  error?: string;
}

export interface UseDocumentUploadOptions {
  maxFiles?: number;
  maxSizeBytes?: number;
  allowedTypes?: string[];
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
}

const DEFAULT_MAX_SIZE = 4 * 1024 * 1024; // 4MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function useDocumentUpload(options: UseDocumentUploadOptions = {}) {
  const {
    maxFiles = 5,
    maxSizeBytes = DEFAULT_MAX_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    onUploadComplete,
    onUploadError,
  } = options;

  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileIdCounter = useRef(0);

  const { startUpload, isUploading: utIsUploading } = useUploadThing('requestDocument', {
    onClientUploadComplete: (res) => {
      const results: UploadResult[] = res.map((r) => ({
        success: true,
        fileKey: r.key,
        fileName: r.name,
      }));
      onUploadComplete?.(results);
    },
    onUploadError: (error) => {
      onUploadError?.(error);
      toastError(error.message);
    },
  });

  /**
   * Validate a file before staging
   */
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `File type ${file.type} not allowed` };
      }
      if (file.size > maxSizeBytes) {
        const maxMB = (maxSizeBytes / 1024 / 1024).toFixed(1);
        return { valid: false, error: `File exceeds ${maxMB}MB limit` };
      }
      return { valid: true };
    },
    [allowedTypes, maxSizeBytes]
  );

  /**
   * Stage files for upload
   */
  const stageFiles = useCallback(
    (files: FileList | File[], documentType: DOCUMENT_TYPE) => {
      const fileArray = Array.from(files);
      
      if (stagedFiles.length + fileArray.length > maxFiles) {
        toastError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const newStagedFiles: StagedFile[] = [];

      for (const file of fileArray) {
        const validation = validateFile(file);
        if (!validation.valid) {
          toastError(validation.error || 'File validation failed');
          continue;
        }

        const id = `file-${++fileIdCounter.current}`;
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';

        newStagedFiles.push({
          id,
          file,
          preview,
          documentType,
          progress: 0,
          status: 'pending',
        });
      }

      setStagedFiles((prev) => [...prev, ...newStagedFiles]);
    },
    [stagedFiles.length, maxFiles, validateFile]
  );

  /**
   * Remove a staged file
   */
  const removeFile = useCallback((fileId: string) => {
    setStagedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  /**
   * Clear all staged files
   */
  const clearFiles = useCallback(() => {
    stagedFiles.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setStagedFiles([]);
  }, [stagedFiles]);

  /**
   * Upload all staged files
   */
  const uploadAll = useCallback(async (): Promise<UploadResult[]> => {
    if (stagedFiles.length === 0) {
      return [];
    }

    setIsUploading(true);
    
    // Mark all as uploading
    setStagedFiles((prev) =>
      prev.map((f) => ({ ...f, status: 'uploading' as const, progress: 0 }))
    );

    try {
      const filesToUpload = stagedFiles.map((sf) => sf.file);
      const results = await startUpload(filesToUpload);

      if (!results) {
        throw new Error('Upload returned no results');
      }

      // Update staged files with results
      setStagedFiles((prev) =>
        prev.map((sf, idx) => ({
          ...sf,
          status: 'success' as const,
          progress: 100,
          uploadedKey: results[idx]?.key,
        }))
      );

      const uploadResults: UploadResult[] = results.map((r) => ({
        success: true,
        fileKey: r.key,
        fileName: r.name,
      }));

      toastSuccess(`${results.length} file(s) uploaded successfully`);
      return uploadResults;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setStagedFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: 'error' as const,
          error: errorMessage,
        }))
      );

      toastError(errorMessage);
      return stagedFiles.map(() => ({ success: false, error: errorMessage }));
    } finally {
      setIsUploading(false);
    }
  }, [stagedFiles, startUpload]);

  /**
   * Update document type for a staged file
   */
  const updateDocumentType = useCallback((fileId: string, documentType: DOCUMENT_TYPE) => {
    setStagedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, documentType } : f))
    );
  }, []);

  return {
    stagedFiles,
    isUploading: isUploading || utIsUploading,
    stageFiles,
    removeFile,
    clearFiles,
    uploadAll,
    updateDocumentType,
    canAddMore: stagedFiles.length < maxFiles,
    pendingCount: stagedFiles.filter((f) => f.status === 'pending').length,
    uploadedCount: stagedFiles.filter((f) => f.status === 'success').length,
  };
}

"use client";

import { useState, useCallback } from "react";
import type { UploadedFile, CreateBulkDocumentsRequest } from "@fundifyhub/types";
import { createBulkDocuments } from "@/lib/document-api";
import toast from "react-hot-toast";

export interface UseFileUploadOptions {
  multiple?: boolean;
  maxFiles?: number;
  documentType?: string;
  documentCategory?: string;
  requestId?: string;
  uploadedBy?: string;
  autoSaveToDatabase?: boolean;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: Error) => void;
  onDatabaseSaveComplete?: (count: number) => void;
}

export interface UseFileUploadReturn {
  uploadedFiles: UploadedFile[];
  isUploading: boolean;
  isSavingToDatabase: boolean;
  uploadProgress: number;
  error: string | null;
  handleUploadComplete: (files: UploadedFile[]) => Promise<void>;
  handleUploadError: (error: Error) => void;
  handleUploadBegin: () => void;
  removeFile: (key: string) => void;
  clearFiles: () => void;
  saveToDatabase: (filesToSave?: UploadedFile[]) => Promise<{ count: number } | undefined>;
  setUploadProgress: (progress: number) => void;
}

/**
 * Custom hook for handling file uploads with UploadThing and database integration
 * Manages upload state, progress, file metadata, and optionally saves to database
 * 
 * @example
 * ```tsx
 * const upload = useFileUpload({
 *   multiple: true,
 *   maxFiles: 5,
 *   documentType: "ASSET_PHOTO",
 *   documentCategory: "ASSET",
 *   uploadedBy: user.id,
 *   autoSaveToDatabase: true,
 *   onUploadComplete: (files) => console.log("Uploaded:", files),
 * });
 * ```
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    multiple = false,
    maxFiles = 1,
    documentType,
    documentCategory,
    requestId,
    uploadedBy,
    autoSaveToDatabase = false,
    onUploadComplete,
    onUploadError,
    onDatabaseSaveComplete,
  } = options;

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = useCallback(
    async (files: UploadedFile[]) => {
      setUploadedFiles((prev) => {
        const newFiles = multiple ? [...prev, ...files] : files;
        return maxFiles ? newFiles.slice(0, maxFiles) : newFiles;
      });
      setIsUploading(false);
      setUploadProgress(100);
      
      // Automatically save to database if enabled
      if (autoSaveToDatabase && uploadedBy && documentType) {
        try {
          setIsSavingToDatabase(true);
          
          const documentsData: CreateBulkDocumentsRequest = {
            documents: files.map((file) => ({
              fileKey: file.fileKey,
              fileName: file.fileName,
              fileSize: file.fileSize,
              fileType: file.fileType,
              documentType,
              documentCategory,
              requestId,
              uploadedBy,
            })),
          };

          const result = await createBulkDocuments(documentsData);
          toast.success(`${result.count} document(s) saved successfully`);
          onDatabaseSaveComplete?.(result.count);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to save documents";
          toast.error(errorMessage);
          setError(errorMessage);
        } finally {
          setIsSavingToDatabase(false);
        }
      }
      
      onUploadComplete?.(files);
    },
    [
      multiple,
      maxFiles,
      autoSaveToDatabase,
      uploadedBy,
      documentType,
      documentCategory,
      requestId,
      onUploadComplete,
      onDatabaseSaveComplete,
    ]
  );

  const handleUploadError = useCallback(
    (err: Error) => {
      setError(err.message);
      setIsUploading(false);
      setUploadProgress(0);
      toast.error(err.message);
      onUploadError?.(err);
    },
    [onUploadError]
  );

  const handleUploadBegin = useCallback(() => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
  }, []);

  const removeFile = useCallback((key: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.fileKey !== key));
  }, []);

  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
    setError(null);
    setUploadProgress(0);
  }, []);

  const saveToDatabase = useCallback(
    async (filesToSave?: UploadedFile[]) => {
      const files = filesToSave || uploadedFiles;
      
      if (files.length === 0) {
        toast.error("No files to save");
        return;
      }

      if (!uploadedBy) {
        toast.error("uploadedBy is required to save documents");
        return;
      }

      if (!documentType) {
        toast.error("documentType is required to save documents");
        return;
      }

      try {
        setIsSavingToDatabase(true);
        
        const documentsData: CreateBulkDocumentsRequest = {
          documents: files.map((file) => ({
            fileKey: file.fileKey,
            fileName: file.fileName,
            fileSize: file.fileSize,
            fileType: file.fileType,
            documentType,
            documentCategory,
            requestId,
            uploadedBy,
          })),
        };

        const result = await createBulkDocuments(documentsData);
        toast.success(`${result.count} document(s) saved successfully`);
        onDatabaseSaveComplete?.(result.count);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save documents";
        toast.error(errorMessage);
        setError(errorMessage);
        throw err;
      } finally {
        setIsSavingToDatabase(false);
      }
    },
    [uploadedFiles, uploadedBy, documentType, documentCategory, requestId, onDatabaseSaveComplete]
  );

  return {
    uploadedFiles,
    isUploading,
    isSavingToDatabase,
    uploadProgress,
    error,
    handleUploadComplete,
    handleUploadError,
    handleUploadBegin,
    removeFile,
    clearFiles,
    saveToDatabase,
    setUploadProgress,
  };
}

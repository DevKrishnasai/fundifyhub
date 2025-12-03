"use client";

import { useState, useEffect, useCallback } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthing";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X, FileText } from "lucide-react";
import Image from "next/image";
import PreviewModal from '@/components/common/PreviewModal';
import { useAuth } from "@/contexts/AuthContext";
import { getWithResult } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { trackEvent } from '@/lib/analytics';
import type { UploadedFile } from "@fundifyhub/types";
import { MAX_DOCUMENT_COUNT, MAX_DOCUMENT_SIZE, ALLOWED_DOCUMENT_TYPES } from '@fundifyhub/types';

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

/**
 * Represents an uploaded file with its metadata and display state
 */
interface UploadedFilePreview {
  /** Public URL (deprecated for private files) */
  url: string;
  /** Original filename */
  name: string;
  /** UploadThing file key for generating signed URLs */
  fileKey?: string;
  /** Generated signed URL for private file access */
  signedUrl?: string;
  /** File size in bytes */
  fileSize?: number;
  /** MIME type of the file */
  fileType?: string;
  status?: 'uploading' | 'done' | 'error' | 'cancelled';
  tempId?: string | number;
  /** If available, keep original File for retry */
  tempFile?: File | null;
}

/**
 * Props for the UploadedFilePreview component
 */
interface UploadedFilePreviewProps {
  /** File to display */
  file: UploadedFilePreview;
  /** Callback when remove button is clicked */
  onRemove: () => void;
  onRetry?: (tempId: string | number) => void;
  onCancel?: (tempId: string | number) => void;
}

/**
 * Component for displaying a single uploaded file with preview and remove option
 *
 * Handles loading states and error recovery for private file access.
 * Automatically generates signed URLs for secure file display.
 */
function UploadedFilePreview({ file, onRemove, onRetry, onCancel }: UploadedFilePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => {
    // Use backend-provided `url` for previews. If missing, show error state.
    if (file.url) {
      setImageUrl(file.url);
      setLoading(false);
      setError(false);
    } else {
      setImageUrl("");
      // If file is uploading, keep not-error; if status is error mark error
      setLoading(false);
      setError(Boolean(file.status === 'error'));
    }
  }, [file.url, file.status]);

  return (
    <div className="relative group">
      {/* Hover details: name, type, size - visible on desktop hover */}
      <div className="absolute top-2 left-2 z-10 hidden group-hover:flex flex-col gap-0 items-start bg-black/70 text-white text-xs px-2 py-1 rounded">
        <div className="font-medium truncate max-w-[140px]">{file.name}</div>
        <div className="opacity-80 mt-0 text-[11px]">{file.fileType || ''} • {file.fileSize ? formatFileSize(file.fileSize) : ''}</div>
      </div>
      {file.status === 'uploading' || loading ? (
        <div className="w-full h-24 sm:h-32 bg-muted rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : error || file.status === 'error' ? (
        <div className="w-full h-24 sm:h-32 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground text-sm">Failed to load</div>
            <div className="mt-2 flex items-center justify-center gap-2">
              {file.tempFile && onRetry && (
                <Button size="sm" variant="outline" onClick={() => { setRetrying(true); (async () => { try { await onRetry(file.tempId!); } finally { setRetrying(false); } })() }}>
                  {retrying ? 'Retrying...' : 'Retry'}
                </Button>
              )}
              {file.tempFile && file.status !== 'done' && file.status !== 'cancelled' && onCancel && (
                <Button size="sm" variant="ghost" onClick={() => { setCancelling(true); try { onCancel(file.tempId!); } finally { setCancelling(false); } }}>Cancel</Button>
              )}
              <Button size="sm" variant="ghost" onClick={onRemove}>Remove</Button>
            </div>
          </div>
        </div>
      ) : imageUrl ? (
        // Image preview for images
        (file.fileType && file.fileType.startsWith('image/')) ? (
          <div className="w-full h-24 sm:h-32 object-cover rounded-lg border overflow-hidden">
            <Image
              src={imageUrl}
              alt={file.name}
              width={200}
              height={200}
              className="w-full h-24 sm:h-32 object-cover"
              onError={() => setError(true)}
            />
          </div>
        ) : file.fileType === 'application/pdf' ? (
          // PDF preview: show icon (non-interactive) — preview opens via action button
          <div className="w-full h-24 sm:h-32 flex items-center justify-center flex-col p-3">
            <FileText className="w-8 h-8 text-muted-foreground mb-2" />
            <div className="text-sm text-center truncate w-full">{file.name}</div>
            <div className="text-xs text-muted-foreground mt-2">PDF</div>
          </div>
        ) : (
          <div className="w-full h-24 sm:h-32 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        )
      ) : (
        <div className="w-full h-24 sm:h-32 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      )}
      <PreviewModal
        open={open}
        onClose={() => setOpen(false)}
        source={{ url: imageUrl, mimeType: file.fileType, title: file.name }}
        hidePdfToolbar={true}
        initialZoom={1}
        showDownload={true}
      />
      {/* Bottom action row (static, under thumbnail) */}
      <div className="mt-2 flex items-center justify-center">
        <div className="bg-transparent rounded-full px-1 py-0 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-9 h-9 p-0"
            onClick={() => setOpen(true)}
            aria-label="Preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="w-9 h-9 p-0"
            onClick={onRemove}
            aria-label="Remove"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper to format bytes
function formatFileSize(bytes?: number) {
  if (!bytes && bytes !== 0) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Props for the AssetUpload component
 */
interface AssetUploadProps {
  /** Callback fired when files are successfully uploaded */
  onUploadComplete: (files: UploadedFile[]) => void;
  /** Optional callback fired when upload encounters an error */
  onUploadError?: (error: Error) => void;
  /** Maximum number of files that can be uploaded */
  maxFiles?: number;
  /** Additional CSS classes for styling */
  className?: string;
  /** Which UploadThing route to use (defaults to assetImageUploader). Use `requestDocument` to allow PDFs. */
  uploaderRoute?: keyof OurFileRouter;
  /** If provided, AssetUpload will initialize its previews from these files and keep in sync */
  initialFiles?: UploadedFile[];
  /** Show inline previews inside this component. If false, parent should render previews. */
  showPreviews?: boolean;
  /** Callback when the current files list changes (add/remove) - returns full current list */
  onFilesChange?: (files: UploadedFile[]) => void;
}

/**
 * Asset Upload Component
 *
 * A comprehensive file upload component for images with the following features:
 * - Multiple file upload with drag-and-drop interface
 * - Private file storage with signed URL generation
 * - Image preview with loading and error states
 * - File removal functionality
 * - Automatic signed URL caching and refresh
 * - Responsive grid layout
 *
 * @requires UploadThing configuration with private ACL
 * @requires Authentication context for user validation
 *
 * @example
 * ```tsx
 * <AssetUpload
 *   onUploadComplete={(files) => console.log('Uploaded:', files)}
 *   onUploadError={(error) => console.error('Upload failed:', error)}
 *   maxFiles={5}
 * />
 * ```
 */
export function AssetUpload({
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  className = "",
  initialFiles,
  showPreviews = true,
  onFilesChange,
  uploaderRoute = 'assetImageUploader',
}: AssetUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFilePreview[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string>("");
  const { user } = useAuth();

  const { startUpload, isUploading } = useUploadThing(uploaderRoute, {
    onClientUploadComplete: (res) => {
      setErrorMsg("");
      const newFiles: UploadedFilePreview[] = res.map(file => ({
        url: file.url || "",
        name: file.name,
        fileKey: file.key,
        signedUrl: "",
        fileSize: file.size,
        fileType: file.type,
        status: 'done'
      }));

      const isControlled = Boolean(initialFiles);

      // Replace any matching placeholders (status === 'uploading') with returned files
      setUploadedFiles(prev => {
        const updated = [...prev];
        for (const nf of newFiles) {
          // find first uploading placeholder that roughly matches by name and size
          const idx = updated.findIndex(u => u.status === 'uploading' && u.name === nf.name && u.fileSize === nf.fileSize);
          if (idx !== -1) {
            updated[idx] = nf;
          } else {
            updated.push(nf);
          }
        }

        // enforce max files guard
        if (updated.length > maxFiles) {
          setErrorMsg(`You can upload a maximum of ${maxFiles} files.`);
          return updated.slice(0, maxFiles);
        }

        // Notify parent of full list change if requested
        const uploadedFileResults: UploadedFile[] = updated.map(file => ({
          fileKey: file.fileKey || "",
          fileName: file.name,
          fileSize: file.fileSize || 0,
          fileType: file.fileType || "",
          url: file.url,
        }));
        onFilesChange?.(uploadedFileResults);

        return updated;
      });

      // Always call onUploadComplete with only the newly uploaded files (delta)
      const newUploadedFileResults: UploadedFile[] = newFiles.map(file => ({
        fileKey: file.fileKey || "",
        fileName: file.name,
        fileSize: file.fileSize || 0,
        fileType: file.fileType || "",
        url: file.url,
      }));
      onUploadComplete(newUploadedFileResults);
    },
    onUploadError: (error) => {
      setErrorMsg("Upload failed. Please try again.");
      onUploadError?.(error);
    },
  });

  // Generate signed URLs on-demand for display
  /**
   * Generate or retrieve cached signed URL for a file
   *
   * Implements caching to avoid duplicate API calls for the same file.
   * Handles concurrent requests for the same file key.
   *
   * @param fileKey - UploadThing file key
   * @returns Promise resolving to signed URL string
   * @throws Error if signed URL generation fails
   */
  // No client-side signed URL fetch — backend must provide `url` on documents.

  /**
   * Remove a file from the uploaded files list
   *
   * @param index - Index of file to remove
   */
  const removeFile = (index: number) => {
    setErrorMsg("");
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    // Convert to UploadedFile[] for the callback with proper metadata
    const uploadedFileResults: UploadedFile[] = updatedFiles.map(file => ({
      fileKey: file.fileKey || "",
      fileName: file.name,
      fileSize: file.fileSize || 0,
      fileType: file.fileType || "",
      url: file.url,
    }));
    // Prefer onFilesChange for list updates (removals); fall back to onUploadComplete if not provided
    if (typeof onFilesChange === 'function') {
      onFilesChange(uploadedFileResults);
    } else {
      onUploadComplete([]); // signal change; parent likely not using this path
    }
  };

  const retryUpload = async (tempId: string | number) => {
    const entry = uploadedFiles.find(u => u.tempId === tempId || (u.fileKey && u.fileKey === String(tempId)));
    if (!entry) return;
    if (!entry.tempFile) {
      // nothing to retry
      setErrorMsg('Retry not available for this item');
      return;
    }

    // mark uploading
    setUploadedFiles(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'uploading' } : u));
    try {
      await startUpload([entry.tempFile]);
    } catch (err: any) {
      setUploadedFiles(prev => prev.map(u => u.tempId === tempId ? { ...u, status: 'error' } : u));
      setErrorMsg(err?.message || 'Retry failed');
    }
  };

  const cancelUpload = (tempId: string | number) => {
    // Remove placeholder (can't cancel network request here)
    setUploadedFiles(prev => prev.filter(u => u.tempId !== tempId));
  };

  // Keep uploadedFiles in sync with parent-provided initialFiles (controlled-ish)
  useEffect(() => {
    if (!initialFiles) return;
    // Map UploadedFile -> UploadedFilePreview
    const mapped = initialFiles.map(f => ({
      url: f.url || '',
      name: f.fileName || f.fileKey || 'file',
      fileKey: f.fileKey,
      signedUrl: f.url || '',
      fileSize: f.fileSize,
      fileType: f.fileType,
      status: f.url ? 'done' : undefined,
    } as UploadedFilePreview));

    setUploadedFiles(mapped);

    // Attempt to refresh signed URLs for files that lack a url or have expired urlExpiresAt
    (async () => {
      for (const f of initialFiles) {
        if (!f.fileKey) continue;
        const needsUrl = !f.url || (f.urlExpiresAt && new Date(f.urlExpiresAt).getTime() < Date.now());
        if (!needsUrl) continue;
        try {
          const res = await getWithResult<{ url: string }>(
            BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.GET_SIGNED_URL_BY_FILEKEY(f.fileKey)
          );
          if (res.ok && res.data?.url) {
            // update in-state preview
            setUploadedFiles(prev => prev.map(u => u.fileKey === f.fileKey ? { ...u, url: res.data!.url, signedUrl: res.data!.url, status: 'done' } : u));
            // notify parent of update
            const uploadedFileResults: UploadedFile[] = uploadedFiles.map(file => ({
              fileKey: file.fileKey || "",
              fileName: file.name,
              fileSize: file.fileSize || 0,
              fileType: file.fileType || "",
              url: file.url,
            }));
            onFilesChange?.(uploadedFileResults);
            trackEvent('document_signed_url_refreshed', { fileKey: f.fileKey });
          }
        } catch {
          // non-fatal; keep showing placeholder
        }
      }
    })();
  }, [initialFiles]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top instructional section is handled by parent or page, not here */}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {showPreviews && uploadedFiles.map((file, index) => (
          <UploadedFilePreview
            key={file.tempId ?? file.fileKey ?? index}
            file={file}
            onRemove={() => removeFile(index)}
            onRetry={(id) => retryUpload(id)}
            onCancel={(id) => cancelUpload(id)}
          />
        ))}

        {uploadedFiles.length < maxFiles && (
          <div className={`border-2 border-dashed rounded-lg p-3 sm:p-4 h-24 sm:h-32 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isUploading
              ? 'border-muted bg-muted/50 cursor-not-allowed'
              : 'border-border hover:border-primary'
          }`}>
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <div className="text-sm text-muted-foreground">Uploading...</div>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  multiple
                  accept={ALLOWED_DOCUMENT_TYPES.join(',')}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    // Filter by allowed types
                    const allowedFiles = files.filter(file => ALLOWED_DOCUMENT_TYPES.includes(file.type));

                    if (allowedFiles.length !== files.length) {
                      setErrorMsg(`Only the following types are allowed: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`);
                      e.target.value = '';
                      return;
                    }

                    // Check file sizes
                    const oversized = allowedFiles.find(f => f.size > MAX_DOCUMENT_SIZE);
                    if (oversized) {
                      setErrorMsg(`File ${oversized.name} exceeds the maximum size of ${Math.round(MAX_DOCUMENT_SIZE / (1024 * 1024))}MB`);
                      e.target.value = '';
                      return;
                    }

                    // Check total file count before upload
                    const totalFiles = uploadedFiles.length + allowedFiles.length;
                    if (totalFiles > Math.min(maxFiles, MAX_DOCUMENT_COUNT)) {
                      setErrorMsg(`You can upload a maximum of ${Math.min(maxFiles, MAX_DOCUMENT_COUNT)} files.`);
                      e.target.value = '';
                      return;
                    }

                    setErrorMsg("");
                    // Add uploading placeholders so UI shows per-file progress state
                    const placeholders: UploadedFilePreview[] = allowedFiles.map((f, i) => ({
                      url: '',
                      name: f.name,
                      fileKey: undefined,
                      signedUrl: '',
                      fileSize: f.size,
                      fileType: f.type,
                      status: 'uploading',
                      tempId: `tmp-${Date.now()}-${i}`,
                      tempFile: f,
                    }));
                    setUploadedFiles(prev => {
                      const merged = [...prev, ...placeholders];
                      // limit to maxFiles
                      return merged.slice(0, Math.min(maxFiles, merged.length));
                    });

                    // startUpload may return a promise; await to catch immediate failures
                    (async () => {
                      try {
                        await startUpload(allowedFiles as File[]);
                      } catch (err: any) {
                        const msg = err?.message || 'Upload failed';
                        setErrorMsg(msg);
                        onUploadError?.(err);
                        // mark placeholders as error
                        setUploadedFiles(prev => prev.map(u => u.status === 'uploading' ? { ...u, status: 'error' } : u));
                      }
                    })();
                    e.target.value = '';
                  }}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className={`cursor-pointer text-center ${isUploading ? 'pointer-events-none' : ''}`}>
                  <div className="text-muted-foreground text-sm">
                    Click to select files
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Allowed: {ALLOWED_DOCUMENT_TYPES.map(t => t === 'application/pdf' ? 'PDF' : t.split('/')[1].toUpperCase()).join(', ')} (max {Math.min(maxFiles, MAX_DOCUMENT_COUNT)})
                  </div>
                </label>
              </>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <Alert variant="destructive" className="mt-2">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
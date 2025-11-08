"use client";

import { useState, useEffect, useCallback } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthing";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X } from "lucide-react";
import Image from "next/image";
import { BACKEND_API_CONFIG } from "@/lib/urls";
import { useAuth } from "@/contexts/AuthContext";
import type { UploadedFile } from "@fundifyhub/types";

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
}

/**
 * Props for the UploadedFilePreview component
 */
interface UploadedFilePreviewProps {
  /** File to display */
  file: UploadedFilePreview;
  /** Callback when remove button is clicked */
  onRemove: () => void;
  /** Function to generate signed URL for the file */
  getSignedUrl: (fileKey: string) => Promise<string>;
}

/**
 * Component for displaying a single uploaded file with preview and remove option
 *
 * Handles loading states and error recovery for private file access.
 * Automatically generates signed URLs for secure file display.
 */
function UploadedFilePreview({ file, onRemove, getSignedUrl }: UploadedFilePreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (file.fileKey && !imageUrl && !error) {
      setLoading(true);
      getSignedUrl(file.fileKey)
        .then(url => {
          if (url) {
            setImageUrl(url);
          } else {
            setError(true);
          }
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    }
  }, [file.fileKey, getSignedUrl, imageUrl, error]);

  return (
    <div className="relative group">
      {loading ? (
        <div className="w-full h-24 sm:h-32 bg-muted rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="w-full h-24 sm:h-32 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Failed to load image</div>
        </div>
      ) : imageUrl ? (
        <Image
          src={imageUrl}
          alt={file.name}
          width={200}
          height={200}
          className="w-full h-24 sm:h-32 object-cover rounded-lg border"
          onError={() => setError(true)}
        />
      ) : (
        <div className="w-full h-24 sm:h-32 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      )}
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-1 right-1 w-5 h-5 sm:w-6 sm:h-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
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
}: AssetUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFilePreview[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string>("");
  const { user } = useAuth();

  const { startUpload, isUploading } = useUploadThing("assetImageUploader", {
    onClientUploadComplete: (res) => {
      setErrorMsg("");
      const newFiles: UploadedFilePreview[] = res.map(file => ({
        url: file.url || "",
        name: file.name,
        fileKey: file.key,
        signedUrl: "",
        fileSize: file.size,
        fileType: file.type,
      }));

      const updatedFiles = [...uploadedFiles, ...newFiles];
      if (updatedFiles.length > maxFiles) {
        setErrorMsg(`You can upload a maximum of ${maxFiles} images.`);
        return;
      }
      setUploadedFiles(updatedFiles);

      // Convert to UploadedFile[] for the callback with proper metadata
      const uploadedFileResults: UploadedFile[] = updatedFiles.map(file => ({
        fileKey: file.fileKey || "",
        fileName: file.name,
        fileSize: file.fileSize || 0,
        fileType: file.fileType || "",
        url: file.url,
      }));

      onUploadComplete(uploadedFileResults);
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
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
  const getSignedUrl = useCallback(async (fileKey: string): Promise<string> => {
    if (signedUrls[fileKey]) {
      return signedUrls[fileKey];
    }

    if (loadingKeys.has(fileKey)) {
      // Wait for the existing request to complete
      return new Promise((resolve, reject) => {
        const checkLoaded = () => {
          if (signedUrls[fileKey]) {
            resolve(signedUrls[fileKey]);
          } else if (!loadingKeys.has(fileKey)) {
            reject(new Error('Failed to load signed URL'));
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    setLoadingKeys(prev => new Set(prev).add(fileKey));

    try {
      const url = BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.GET_SIGNED_URL_BY_FILEKEY(fileKey) + '?expiresIn=900';
      // Use shared axios get method (sends cookies automatically)
      const data = await import('../api-client').then(mod => mod.get<any>(url));

      if (data.success && data.data?.url) {
        setSignedUrls(prev => ({ ...prev, [fileKey]: data.data.url }));
        return data.data.url;
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoadingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileKey);
        return newSet;
      });
    }
  }, [signedUrls, loadingKeys]);

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
    onUploadComplete(uploadedFileResults);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top instructional section is handled by parent or page, not here */}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {uploadedFiles.map((file, index) => (
          <UploadedFilePreview
            key={index}
            file={file}
            onRemove={() => removeFile(index)}
            getSignedUrl={getSignedUrl}
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
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    // Filter to only PNG and JPEG
                    const allowedFiles = files.filter(file =>
                      file.type === 'image/png' || file.type === 'image/jpeg'
                    );

                    if (allowedFiles.length !== files.length) {
                      setErrorMsg("Only PNG and JPEG images are allowed.");
                      e.target.value = '';
                      return;
                    }

                    // Check total file count before upload
                    const totalFiles = uploadedFiles.length + allowedFiles.length;
                    if (totalFiles > maxFiles) {
                      setErrorMsg(`You can upload a maximum of ${maxFiles} images.`);
                      e.target.value = '';
                      return;
                    }

                    setErrorMsg("");
                    startUpload(allowedFiles);
                    e.target.value = '';
                  }}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className={`cursor-pointer text-center ${isUploading ? 'pointer-events-none' : ''}`}>
                  <div className="text-muted-foreground text-sm">
                    Click to select multiple images
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    PNG, JPEG only (max {maxFiles})
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
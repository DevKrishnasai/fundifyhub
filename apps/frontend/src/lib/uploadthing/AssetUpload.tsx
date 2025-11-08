"use client";

import { useState, useEffect, useCallback } from "react";
import { generateUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthing";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Image from "next/image";
import { BACKEND_API_CONFIG } from "@/lib/urls";
import { useAuth } from "@/contexts/AuthContext";
import type { UploadedFile } from "@fundifyhub/types";

const UploadButton = generateUploadButton<OurFileRouter>();

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
  const { user } = useAuth();

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
      const url = `${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.GET_SIGNED_URL_BY_FILEKEY(fileKey)}?expiresIn=900`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

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
   * Handle successful file upload completion
   *
   * Processes UploadThing response and updates component state with uploaded files.
   * Converts UploadThing metadata to component's UploadedFilePreview format.
   *
   * @param res - Array of uploaded file objects from UploadThing
   */
  const handleUploadComplete = async (res: any[]) => {
    const newFiles: UploadedFilePreview[] = [];

    for (const file of res) {
      newFiles.push({
        url: "", // Will be set when signed URL is generated
        name: file.fileName || file.name,
        fileKey: file.fileKey || file.key,
        signedUrl: "",
      });
    }

    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);

    // Convert to UploadedFile[] for the callback
    const uploadedFileResults: UploadedFile[] = newFiles.map(file => ({
      fileKey: file.fileKey || "",
      fileName: file.name,
      fileSize: 0, // Will be set from UploadThing response if available
      fileType: "",
      url: file.url,
    }));

    onUploadComplete(uploadedFileResults);
  };

  /**
   * Handle upload error
   *
   * Logs error and calls optional error callback
   *
   * @param error - Upload error object
   */
  const handleUploadError = (error: Error) => {
    console.error("Upload error:", error);
    onUploadError?.(error);
  };

  /**
   * Remove a file from the uploaded files list
   *
   * @param index - Index of file to remove
   */
  const removeFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);

    // Convert to UploadedFile[] for the callback
    const uploadedFileResults: UploadedFile[] = updatedFiles.map(file => ({
      fileKey: file.fileKey || "",
      fileName: file.name,
      fileSize: 0,
      fileType: "",
      url: file.url,
    }));

    onUploadComplete(uploadedFileResults);
  };

  return (
    <div className={`space-y-4 ${className}`}>
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
          <UploadButton
            endpoint="assetImageUploader"
            onClientUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            className="border-2 border-dashed border-border rounded-lg p-3 sm:p-4 h-24 sm:h-32 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors ut-button:bg-transparent ut-button:text-muted-foreground ut-button:hover:text-primary"
          />
        )}
      </div>

      {uploadedFiles.length === 0 && (
        <p className="text-xs sm:text-sm text-muted-foreground">
          Please upload at least 2 photos to continue
        </p>
      )}
    </div>
  );
}
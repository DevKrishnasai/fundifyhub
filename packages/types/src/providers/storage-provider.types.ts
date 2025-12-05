/**
 * Storage Provider Framework Types
 * 
 * This module defines the interface contract for all storage providers.
 * Implementations include: UploadThingProvider, S3Provider (future)
 * 
 * @module providers/storage-provider
 */

// ============================================
// STORAGE PROVIDER IDENTIFICATION
// ============================================

/**
 * Supported storage provider types
 */
export enum StorageProviderType {
  UPLOADTHING = 'UPLOADTHING',
  S3 = 'S3',           // Future
  GCS = 'GCS',         // Future (Google Cloud Storage)
  LOCAL = 'LOCAL',     // For development
}

// ============================================
// FILE TYPES
// ============================================

/**
 * File metadata
 */
export interface StorageFileMetadata {
  /** Unique file key/identifier */
  fileKey: string;
  /** Original file name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type */
  mimeType: string;
  /** Upload timestamp */
  uploadedAt: Date;
  /** Custom metadata */
  customMetadata?: Record<string, string>;
}

/**
 * File upload options
 */
export interface FileUploadOptions {
  /** Target folder/path (optional) */
  folder?: string;
  /** Custom metadata to attach */
  metadata?: Record<string, string>;
  /** Whether file should be private (require signed URLs) */
  isPrivate?: boolean;
  /** Allowed MIME types (for validation) */
  allowedMimeTypes?: string[];
  /** Maximum file size in bytes */
  maxSize?: number;
}

/**
 * Result of file upload
 */
export interface FileUploadResult {
  /** Whether upload was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** File key for accessing the file */
  fileKey?: string;
  /** Direct URL (for public files) */
  url?: string;
  /** File metadata */
  metadata?: StorageFileMetadata;
}

// ============================================
// SIGNED URL TYPES
// ============================================

/**
 * Options for generating signed URLs
 */
export interface SignedUrlOptions {
  /** URL expiration time in seconds (default varies by provider) */
  expiresIn?: number;
  /** Content disposition (inline or attachment) */
  disposition?: 'inline' | 'attachment';
  /** Custom filename for download */
  downloadFilename?: string;
}

/**
 * Result of signed URL generation
 */
export interface SignedUrlResult {
  /** Whether generation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** The signed URL */
  url?: string;
  /** When the URL expires */
  expiresAt?: Date;
}

/**
 * Result of batch signed URL generation
 */
export interface BatchSignedUrlResult {
  /** Whether batch operation was successful overall */
  success: boolean;
  /** Individual results for each file */
  results: Array<{
    fileKey: string;
    url: string;
    expiresAt: Date;
    error?: string;
  }>;
  /** Count of successful URLs */
  successCount: number;
  /** Count of failed URLs */
  failedCount: number;
}

// ============================================
// FILE OPERATIONS
// ============================================

/**
 * Result of file deletion
 */
export interface FileDeleteResult {
  /** Whether deletion was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** File key that was deleted */
  fileKey?: string;
}

/**
 * Result of batch file deletion
 */
export interface BatchDeleteResult {
  /** Whether batch operation was successful overall */
  success: boolean;
  /** Individual results for each file */
  results: Array<{
    fileKey: string;
    deleted: boolean;
    error?: string;
  }>;
  /** Count of successfully deleted files */
  successCount: number;
  /** Count of failed deletions */
  failedCount: number;
}

/**
 * File list options
 */
export interface FileListOptions {
  /** Folder/prefix to list from */
  folder?: string;
  /** Maximum number of files to return */
  limit?: number;
  /** Cursor for pagination */
  cursor?: string;
}

/**
 * Result of file listing
 */
export interface FileListResult {
  /** Whether listing was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** List of files */
  files?: StorageFileMetadata[];
  /** Cursor for next page (if more files exist) */
  nextCursor?: string;
  /** Whether there are more files */
  hasMore?: boolean;
}

// ============================================
// STORAGE PROVIDER INTERFACE
// ============================================

/**
 * Storage Provider Interface
 * 
 * All storage providers must implement this interface.
 * This enables switching between providers (UploadThing, S3, etc.)
 * without changing business logic.
 */
export interface IStorageProvider {
  /** Provider type identifier */
  readonly type: StorageProviderType;
  
  /** Provider display name */
  readonly name: string;
  
  /** Whether provider is configured and ready */
  isConfigured(): boolean;

  /**
   * Generate a signed URL for private file access
   */
  generateSignedUrl(
    fileKey: string, 
    options?: SignedUrlOptions
  ): Promise<SignedUrlResult>;

  /**
   * Generate signed URLs for multiple files
   */
  generateSignedUrls(
    fileKeys: string[], 
    options?: SignedUrlOptions
  ): Promise<BatchSignedUrlResult>;

  /**
   * Delete a file
   */
  deleteFile(fileKey: string): Promise<FileDeleteResult>;

  /**
   * Delete multiple files
   */
  deleteFiles(fileKeys: string[]): Promise<BatchDeleteResult>;

  /**
   * List files (optional - not all providers support this)
   */
  listFiles?(options?: FileListOptions): Promise<FileListResult>;

  /**
   * Get file metadata (optional)
   */
  getFileMetadata?(fileKey: string): Promise<StorageFileMetadata | null>;
}

// ============================================
// STORAGE SERVICE TYPES
// ============================================

/**
 * Storage service configuration
 */
export interface StorageServiceConfig {
  /** Default provider to use */
  defaultProvider: StorageProviderType;
  /** Provider-specific configurations */
  providers: {
    uploadthing?: {
      token: string;
    };
    s3?: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      bucket: string;
    };
  };
  /** Default signed URL expiration (seconds) */
  defaultSignedUrlExpiry?: number;
}

/**
 * Commonly used signed URL expiry times
 */
export const SIGNED_URL_EXPIRY = {
  /** 15 minutes - for quick document previews */
  SHORT: 900,
  /** 1 hour - for document downloads */
  MEDIUM: 3600,
  /** 24 hours - for sharing links */
  LONG: 86400,
  /** 7 days - for extended access */
  EXTENDED: 604800,
} as const;

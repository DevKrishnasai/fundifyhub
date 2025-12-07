/**
 * Document-related types for upload and management functionality
 */

// ============================================
// UPLOADTHING TYPES
// ============================================

export interface UploadThingFile {
  key: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  customId?: string;
}

export interface UploadThingUploadComplete {
  file: UploadThingFile;
  metadata: UploadThingMetadata;
}

export interface UploadThingMetadata {
  userId: string;
  userEmail: string;
  userRoles: string[];
  userDistricts: string[];
}

export interface UploadThingListFilesResponse {
  files: UploadThingFile[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface UploadThingSignedUrlResponse {
  url: string;
  expiresAt: Date;
  expiresIn: number;
  fileKey: string;
}

// ============================================
// DOCUMENT TYPES
// ============================================

export interface UploadedFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
  signedUrl?: string;
  // Optional signed URL expiry timestamp (ISO string). Frontend may use this
  // to decide whether to refresh a signed URL before attempting to fetch.
  urlExpiresAt?: string | null;
}

// Asset photo data received from frontend for asset requests
export interface AssetPhotoData {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface DocumentMetadata {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: string;
  documentCategory?: string;
  requestId?: string;
  uploadedBy: string;
  description?: string;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateDocumentRequest {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: string;
  documentCategory?: string;
  requestId?: string;
  uploadedBy: string;
  uploaderRole?: string; // DOCUMENT_UPLOADER_ROLE enum
  description?: string;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
}

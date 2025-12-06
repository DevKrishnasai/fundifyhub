import { DOCUMENT_UPLOADER_ROLE } from './enums';

// Using 'any' for JSON value to avoid dependency on common for now, or define it here.
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// ============================================
// DOCUMENT ENTITY
// ============================================

export interface AppDocument {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: string;
  documentCategory: string;
  requestId: string | null;
  uploadedBy: string;
  uploaderRole?: string | null;
  isPublic: boolean;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  status: string;
  description: string | null;
  displayOrder: number | null;
  metadata: JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  
  /** Optional signed URL (runtime) for direct access to the file */
  url?: string | null;
  /** When `url` is present this indicates the signed URL expiry timestamp (ISO string) */
  urlExpiresAt?: string | null;

  // Relations
  request?: unknown | null;
}

export interface DocumentWithUrl extends AppDocument {
  url: string;
}

// ============================================
// DTOs
// ============================================

export interface UploadedFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
  signedUrl?: string;
  urlExpiresAt?: string | null;
}

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
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
}

export interface CreateBulkDocumentsRequest {
  documents: CreateDocumentRequest[];
}

export interface DocumentResponse {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: string;
  documentCategory: string;
  requestId?: string | null;
  uploadedBy: string;
  uploaderRole?: string;
  isPublic: boolean;
  isVerified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  status: string;
  description?: string | null;
  displayOrder?: number | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignedUrlResponse {
  url: string;
  expiresAt: Date;
  expiresIn: number;
  document: {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  };
}

export interface BulkSignedUrlRequest {
  documentIds: string[];
  expiresIn?: number;
}

export interface BulkSignedUrlResponse {
  id: string;
  fileName: string;
  fileType: string;
  url: string;
  expiresAt: Date;
}

// Aliases
export type DocumentType = AppDocument; // Keep compatibility with old name if needed

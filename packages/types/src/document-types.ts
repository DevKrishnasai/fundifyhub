// Document types for upload functionality
export interface UploadedFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
  signedUrl?: string;
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

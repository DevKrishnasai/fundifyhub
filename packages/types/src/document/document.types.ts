/**
 * Document types
 * @module document/document.types
 */

import type { JsonValue } from '../common/json.types';

// ============================================
// DOCUMENT TYPE
// ============================================

export interface DocumentType {
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

import {
  type CreateDocumentRequest,
  type CreateBulkDocumentsRequest,
  type DocumentResponse,
  type SignedUrlResponse,
  type BulkSignedUrlRequest,
  type BulkSignedUrlResponse,
} from "@fundifyhub/types";
import { post, get, del, patch } from "./api-client";
import { BACKEND_API_CONFIG } from "./urls";

const { DOCUMENTS } = BACKEND_API_CONFIG.ENDPOINTS;

/**
 * Create a single document entry in the database
 */
export async function createDocument(data: CreateDocumentRequest): Promise<DocumentResponse> {
  const response = await post(`${BACKEND_API_CONFIG.BASE_URL}${DOCUMENTS.CREATE}`, data);
  
  if (!response.success) {
    throw new Error(response.message || "Failed to create document");
  }
  
  return response.data;
}

/**
 * Create multiple document entries in bulk
 */
export async function createBulkDocuments(data: CreateBulkDocumentsRequest): Promise<{ count: number }> {
  const response = await post(`${BACKEND_API_CONFIG.BASE_URL}${DOCUMENTS.CREATE_BULK}`, data);
  
  if (!response.success) {
    throw new Error(response.message || "Failed to create documents");
  }
  
  return response.data;
}

/**
 * Get document metadata by ID
 */
export async function getDocument(id: string): Promise<DocumentResponse> {
  const response = await get(`${BACKEND_API_CONFIG.BASE_URL}${DOCUMENTS.GET_BY_ID(id)}`);
  
  if (!response.success) {
    throw new Error(response.message || "Failed to fetch document");
  }
  
  return response.data;
}

/**
 * Generate a signed URL for a document
 */
export async function getDocumentSignedUrl(
  id: string,
  expiresIn: number = 3600
): Promise<SignedUrlResponse> {
  const response = await get(
    `${BACKEND_API_CONFIG.BASE_URL}${DOCUMENTS.GET_SIGNED_URL(id)}?expiresIn=${expiresIn}`
  );
  
  if (!response.success) {
    throw new Error(response.message || "Failed to generate signed URL");
  }
  
  return response.data;
}

/**
 * Generate signed URLs for multiple documents
 */
export async function getBulkSignedUrls(
  data: BulkSignedUrlRequest
): Promise<BulkSignedUrlResponse[]> {
  const response = await post(`${BACKEND_API_CONFIG.BASE_URL}${DOCUMENTS.GET_BULK_SIGNED_URLS}`, data);
  
  if (!response.success) {
    throw new Error(response.message || "Failed to generate signed URLs");
  }
  
  return response.data;
}

/**
 * List documents with filters
 */
export async function listDocuments(params?: {
  requestId?: string;
  documentType?: string;
  documentCategory?: string;
  uploadedBy?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  documents: DocumentResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });
  }
  
  const response = await get(
    `${BACKEND_API_CONFIG.BASE_URL}${DOCUMENTS.LIST}?${queryParams.toString()}`
  );
  
  if (!response.success) {
    throw new Error(response.message || "Failed to list documents");
  }
  
  return response.data;
}

/**
 * Delete a document (soft delete by default)
 */
export async function deleteDocument(id: string, permanent: boolean = false): Promise<void> {
  const response = await del(
    `${BACKEND_API_CONFIG.BASE_URL}${DOCUMENTS.DELETE(id)}?permanent=${permanent}`
  );
  
  if (!response.success) {
    throw new Error(response.message || "Failed to delete document");
  }
}

/**
 * Verify a document
 */
export async function verifyDocument(
  id: string,
  verifiedBy: string,
  isVerified: boolean = true
): Promise<DocumentResponse> {
  const response = await patch(`${BACKEND_API_CONFIG.BASE_URL}${DOCUMENTS.VERIFY(id)}`, {
    verifiedBy,
    isVerified,
  });
  
  if (!response.success) {
    throw new Error(response.message || "Failed to verify document");
  }
  
  return response.data;
}

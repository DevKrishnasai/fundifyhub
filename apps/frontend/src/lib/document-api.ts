import {
  type CreateDocumentRequest,
  type CreateBulkDocumentsRequest,
  type DocumentResponse,
  type SignedUrlResponse,
  type BulkSignedUrlRequest,
  type BulkSignedUrlResponse,
} from "@fundifyhub/types";
import { post, get, del, patch, api, postWithResult, getWithResult } from "./api-client";
import { AxiosError } from "axios";
import { BACKEND_API_CONFIG } from "./urls";
import { CLIENT_CONSTANTS } from "@fundifyhub/types";

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
export async function createBulkDocuments(data: CreateBulkDocumentsRequest): Promise<{ count: number; documentIds?: string[] }> {
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
  expiresIn: number = CLIENT_CONSTANTS.SIGNED_URL_EXPIRES
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
  // The backend expects the 'permanent' flag in the request body for DELETE.
  // axios supports sending a body with DELETE via the `data` config key.
  const response = await del(
    `${BACKEND_API_CONFIG.BASE_URL}${DOCUMENTS.DELETE(id)}`,
    { data: { permanent } }
  );
  
  if (!response.success) {
    throw new Error(response.message || "Failed to delete document");
  }
}

/**
 * Download a document as a blob from a signed URL
 */
export async function downloadDocumentBlob(signedUrl: string) {
  try {
    const response = await api.get(signedUrl, {
      responseType: 'blob',
      withCredentials: false, // Signed URLs don't need cookies
    });

    return { ok: true, data: response.data };
  } catch (err) {
    const error = { message: 'Failed to download document' };
    if (err instanceof AxiosError && err.response) {
      error.message = err.response.data?.message || err.message || error.message;
    } else if (err instanceof Error) {
      error.message = err.message;
    }
    return { ok: false, error, status: (err as AxiosError)?.response?.status };
  }
}

/**
 * Generate a loan agreement PDF
 */
export async function generateAgreement(requestId: string): Promise<Blob> {
  const response = await get(`${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GENERATE_AGREEMENT(requestId)}`, {
    responseType: 'blob',
  });

  if (!response.success) {
    throw new Error(response.message || "Failed to generate agreement PDF");
  }

  return response.data;
}

/**
 * Upload a signed agreement PDF
 */
export async function uploadSignedAgreement(requestId: string, pdfBase64: string, fileName: string): Promise<{ stampedSignedUrl?: string }> {
  const response = await post(`${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.UPLOAD_SIGNED_AGREEMENT(requestId)}`, {
    pdfBase64,
    fileName,
  });

  if (!response.success) {
    throw new Error(response.message || "Failed to upload signed agreement");
  }

  return response.data;
}

/**
 * Get agreement preview URL
 */
export async function getAgreementPreviewUrl(requestId: string) {
  return getWithResult(`${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GENERATE_AGREEMENT(requestId)}?signedUrl=true`);
}

/**
 * Sign agreement with signature
 */
export async function signAgreement(requestId: string, signatureDataUrl: string) {
  return postWithResult(`${BACKEND_API_CONFIG.BASE_URL}${BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.SIGN_AGREEMENT(requestId)}`, {
    signatureDataUrl,
  });
}

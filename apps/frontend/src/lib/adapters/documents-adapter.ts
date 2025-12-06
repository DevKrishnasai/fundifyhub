/**
 * Documents Adapter
 *
 * Abstraction layer for documents API calls.
 *
 * @module lib/adapters/documents
 */

import { getWithResult, postWithResult, deleteWithResult } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';
import type { DocumentType } from '@fundifyhub/types';

/**
 * Document creation payload
 */
export interface CreateDocumentPayload {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: string;
  documentCategory: string;
  requestId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Bulk document creation payload
 */
export interface CreateBulkDocumentsPayload {
  documents: CreateDocumentPayload[];
}

/**
 * Document list filters
 */
export interface DocumentListFilters {
  page?: number;
  limit?: number;
  requestId?: string;
  documentType?: string;
  documentCategory?: string;
  uploadedBy?: string;
  isVerified?: boolean;
}

/**
 * Document list response
 */
export interface DocumentListResponse {
  documents: DocumentType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Signed URL response
 */
export interface SignedUrlResponse {
  url: string;
  expiresAt: string;
}

/**
 * Bulk signed URLs payload
 */
export interface BulkSignedUrlsPayload {
  fileKeys: string[];
}

/**
 * Bulk signed URLs response
 */
export interface BulkSignedUrlsResponse {
  urls: Array<{
    fileKey: string;
    url: string;
    expiresAt: string;
  }>;
}

export const documentsAdapter = {
  /**
   * Create a document record after uploading to storage
   */
  async create(payload: CreateDocumentPayload) {
    return postWithResult<DocumentType, CreateDocumentPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.CREATE,
      payload
    );
  },

  /**
   * Create multiple document records
   */
  async createBulk(payload: CreateBulkDocumentsPayload) {
    return postWithResult<DocumentType[], CreateBulkDocumentsPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.CREATE_BULK,
      payload
    );
  },

  /**
   * List documents with filters
   */
  async list(filters?: DocumentListFilters) {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.requestId) params.append('requestId', filters.requestId);
    if (filters?.documentType) params.append('documentType', filters.documentType);
    if (filters?.documentCategory) params.append('documentCategory', filters.documentCategory);
    if (filters?.uploadedBy) params.append('uploadedBy', filters.uploadedBy);
    if (filters?.isVerified !== undefined) params.append('isVerified', String(filters.isVerified));

    const url = `${BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.LIST}?${params.toString()}`;
    return getWithResult<DocumentListResponse>(url);
  },

  /**
   * Get document by ID
   */
  async getById(id: string) {
    return getWithResult<DocumentType>(
      BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.GET_BY_ID(id)
    );
  },

  /**
   * Get signed URL for a document by ID
   */
  async getSignedUrl(id: string) {
    return getWithResult<SignedUrlResponse>(
      BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.GET_SIGNED_URL(id)
    );
  },

  /**
   * Get signed URL by file key
   */
  async getSignedUrlByFileKey(fileKey: string) {
    return getWithResult<SignedUrlResponse>(
      BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.GET_SIGNED_URL_BY_FILEKEY(fileKey)
    );
  },

  /**
   * Get bulk signed URLs for multiple file keys
   */
  async getBulkSignedUrls(payload: BulkSignedUrlsPayload) {
    return postWithResult<BulkSignedUrlsResponse, BulkSignedUrlsPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.GET_BULK_SIGNED_URLS,
      payload
    );
  },

  /**
   * Delete document by ID
   */
  async delete(id: string) {
    return deleteWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.DELETE(id)
    );
  },

  /**
   * Delete documents by file keys
   */
  async deleteByFileKeys(fileKeys: string[]) {
    return postWithResult<{ success: boolean; deleted: number }, { fileKeys: string[] }>(
      BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.DELETE_BY_FILEKEYS,
      { fileKeys }
    );
  },

  /**
   * Verify document (admin/agent only)
   */
  async verify(id: string) {
    return postWithResult<DocumentType>(
      BACKEND_API_CONFIG.ENDPOINTS.DOCUMENTS.VERIFY(id)
    );
  },
};

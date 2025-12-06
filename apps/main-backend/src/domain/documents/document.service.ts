/**
 * Document Service
 * 
 * Manages document lifecycle including:
 * - Upload metadata storage
 * - Signed URL generation for secure access
 * - Document retrieval with access control
 * - Soft delete and verification tracking
 * 
 * Integrates with StorageAdapter for UploadThing operations.
 * 
 * @module domain/documents
 */

import { prisma } from '@fundifyhub/prisma';
import { ValidationError, NotFoundError, ForbiddenError, ErrorCode } from '@fundifyhub/utils';
import {
  DOCUMENT_TYPE,
  DOCUMENT_CATEGORY,
  DOCUMENT_UPLOADER_ROLE,
  DOCUMENT_STATUS,
  type CreateDocumentRequest,
  type DocumentResponse,
  type SignedUrlResponse,
  type BulkSignedUrlResponse,
} from '@fundifyhub/types';
import { storageAdapter } from '../../infra-adapters/storage.adapter';
import logger from '../../utils/logger';

export interface CreateDocumentInput {
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: DOCUMENT_TYPE;
  documentCategory?: DOCUMENT_CATEGORY;
  requestId?: string;
  uploadedBy: string;
  uploaderRole?: DOCUMENT_UPLOADER_ROLE;
  description?: string;
  displayOrder?: number;
  metadata?: Record<string, any>;
  isPublic?: boolean;
}

export interface GetDocumentOptions {
  includeDeleted?: boolean;
  generateSignedUrl?: boolean;
  urlExpiresIn?: number;
}

export interface ListDocumentsFilter {
  requestId?: string;
  uploadedBy?: string;
  documentType?: DOCUMENT_TYPE;
  documentCategory?: DOCUMENT_CATEGORY;
  status?: DOCUMENT_STATUS;
  includeDeleted?: boolean;
}

/**
 * DocumentService - Domain logic for document management
 * 
 * Follows domain-driven design principles:
 * - All storage operations go through StorageAdapter
 * - Business rules enforced before persistence
 * - Returns sanitized DTOs, never raw Prisma objects
 */
export class DocumentService {
  /**
   * Create a new document record after upload
   * 
   * @param input - Document metadata from upload
   * @returns Created document with metadata
   */
  async createDocument(input: CreateDocumentInput): Promise<DocumentResponse> {
    try {
      // Validate required fields
      if (!input.fileKey || !input.fileName || !input.uploadedBy) {
        throw new ValidationError('Missing required document fields', ErrorCode.INVALID_INPUT, {
          required: ['fileKey', 'fileName', 'uploadedBy'],
        });
      }

      // Check if file key already exists
      const existing = await prisma.document.findUnique({
        where: { fileKey: input.fileKey },
      });

      if (existing) {
        throw new ValidationError('Document with this file key already exists', ErrorCode.DUPLICATE_ENTRY, {
          fileKey: input.fileKey,
        });
      }

      // Verify file exists in storage (optional but recommended)
      const fileExists = await storageAdapter.verifyFile(input.fileKey);
      if (!fileExists) {
        throw new ValidationError('File not found in storage', ErrorCode.INVALID_INPUT, {
          fileKey: input.fileKey,
        });
      }

      // Determine category from type if not provided
      const category = input.documentCategory || this.getCategoryFromType(input.documentType);

      // Create document record
      const document = await prisma.document.create({
        data: {
          fileKey: input.fileKey,
          fileName: input.fileName,
          fileSize: input.fileSize,
          fileType: input.fileType,
          documentType: input.documentType,
          documentCategory: category,
          requestId: input.requestId,
          uploadedBy: input.uploadedBy,
          uploaderRole: input.uploaderRole,
          description: input.description,
          displayOrder: input.displayOrder,
          metadata: input.metadata || {},
          isPublic: input.isPublic ?? false,
          status: DOCUMENT_STATUS.ACTIVE,
        },
      });

      logger.info('[DocumentService.createDocument] Document created', {
        documentId: document.id,
        fileKey: document.fileKey,
        documentType: document.documentType,
        uploadedBy: document.uploadedBy,
      });

      return this.toDocumentResponse(document);
    } catch (err) {
      logger.error('[DocumentService.createDocument] Failed to create document', {
        error: err,
        input,
      });
      throw err;
    }
  }

  /**
   * Get document by ID with optional signed URL
   * 
   * @param documentId - Document ID
   * @param userId - Requesting user ID for access control
   * @param options - Retrieval options
   * @returns Document with optional signed URL
   */
  async getDocument(
    documentId: string,
    userId: string,
    options: GetDocumentOptions = {}
  ): Promise<SignedUrlResponse> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundError('Document', documentId);
      }

      if (document.deletedAt && !options.includeDeleted) {
        throw new NotFoundError('Document (deleted)', documentId);
      }

      // Access control
      if (!document.isPublic && document.uploadedBy !== userId) {
        throw new ForbiddenError('You do not have permission to access this document', ErrorCode.FORBIDDEN, { documentId, userId });
      }

      // Generate signed URL if requested
      let signedUrl: string | undefined;
      let expiresAt: Date | undefined;
      const expiresIn = options.urlExpiresIn || 3600; // 1 hour default

      if (options.generateSignedUrl) {
        try {
          signedUrl = await storageAdapter.getDownloadUrl(document.fileKey, expiresIn);
          expiresAt = new Date(Date.now() + expiresIn * 1000);
        } catch (err) {
          logger.error('[DocumentService.getDocument] Failed to generate signed URL', {
            error: err,
            documentId,
            fileKey: document.fileKey,
          });
          throw new ValidationError('Failed to generate download URL', ErrorCode.INTERNAL_ERROR, {
            documentId,
          });
        }
      }

      return {
        url: signedUrl!,
        expiresAt: expiresAt!,
        expiresIn,
        document: {
          id: document.id,
          fileName: document.fileName,
          fileSize: document.fileSize,
          fileType: document.fileType,
        },
      };
    } catch (err) {
      logger.error('[DocumentService.getDocument] Failed to get document', {
        error: err,
        documentId,
      });
      throw err;
    }
  }

  /**
   * Get multiple documents with signed URLs (bulk operation)
   * 
   * @param documentIds - Array of document IDs
   * @param userId - Requesting user ID
   * @param expiresIn - URL expiration in seconds
   * @returns Bulk signed URL response
   */
  async getBulkSignedUrls(
    documentIds: string[],
    userId: string,
    expiresIn: number = 3600
  ): Promise<BulkSignedUrlResponse[]> {
    try {
      const documents = await prisma.document.findMany({
        where: {
          id: { in: documentIds },
          deletedAt: null,
        },
      });

      // Access control - filter out unauthorized documents
      const authorizedDocs = documents.filter(
        (doc) => doc.isPublic || doc.uploadedBy === userId
      );

      // Generate signed URLs in parallel
      const urlPromises = authorizedDocs.map(async (doc) => {
        try {
          const url = await storageAdapter.getDownloadUrl(doc.fileKey, expiresIn);
          return {
            id: doc.id,
            fileName: doc.fileName,
            fileType: doc.fileType,
            url,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          };
        } catch (err) {
          logger.warn('[DocumentService.getBulkSignedUrls] Failed to generate URL for document', {
            documentId: doc.id,
            fileKey: doc.fileKey,
            error: err,
          });
          return null;
        }
      });

      const results = await Promise.all(urlPromises);
      const urls = results.filter((u): u is BulkSignedUrlResponse => u !== null);

      logger.info('[DocumentService.getBulkSignedUrls] Generated bulk signed URLs', {
        requestedCount: documentIds.length,
        authorizedCount: authorizedDocs.length,
        successCount: urls.length,
      });

      return urls;
    } catch (err) {
      logger.error('[DocumentService.getBulkSignedUrls] Failed to generate bulk signed URLs', {
        error: err,
        documentIds,
      });
      throw err;
    }
  }

  /**
   * List documents with filters
   * 
   * @param filter - Filter criteria
   * @param userId - Requesting user ID for access control
   * @returns Array of documents
   */
  async listDocuments(filter: ListDocumentsFilter, userId: string): Promise<DocumentResponse[]> {
    try {
      const where: any = {};

      if (filter.requestId) where.requestId = filter.requestId;
      if (filter.uploadedBy) where.uploadedBy = filter.uploadedBy;
      if (filter.documentType) where.documentType = filter.documentType;
      if (filter.documentCategory) where.documentCategory = filter.documentCategory;
      if (filter.status) where.status = filter.status;
      if (!filter.includeDeleted) where.deletedAt = null;

      // Access control: only show public docs or user's own docs
      where.OR = [
        { isPublic: true },
        { uploadedBy: userId },
      ];

      const documents = await prisma.document.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      });

      logger.info('[DocumentService.listDocuments] Documents listed', {
        count: documents.length,
        filter,
        userId,
      });

      return documents.map(this.toDocumentResponse);
    } catch (err) {
      logger.error('[DocumentService.listDocuments] Failed to list documents', {
        error: err,
        filter,
      });
      throw err;
    }
  }

  /**
   * Soft delete a document
   * 
   * @param documentId - Document ID
   * @param userId - User performing deletion
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundError('Document', documentId);
      }

      if (document.uploadedBy !== userId) {
        throw new ForbiddenError('You do not have permission to delete this document', ErrorCode.FORBIDDEN, { documentId, userId });
      }

      await prisma.document.update({
        where: { id: documentId },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
          status: DOCUMENT_STATUS.DELETED,
        },
      });

      logger.info('[DocumentService.deleteDocument] Document soft deleted', {
        documentId,
        userId,
      });
    } catch (err) {
      logger.error('[DocumentService.deleteDocument] Failed to delete document', {
        error: err,
        documentId,
      });
      throw err;
    }
  }

  /**
   * Permanently delete document from storage and database
   * 
   * @param documentId - Document ID
   * @param userId - User performing deletion
   */
  async permanentlyDeleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundError('Document', documentId);
      }

      if (document.uploadedBy !== userId) {
        throw new ForbiddenError('You do not have permission to delete this document', ErrorCode.FORBIDDEN, { documentId, userId });
      }

      // Delete from storage
      try {
        await storageAdapter.deleteFile(document.fileKey);
      } catch (err) {
        logger.warn('[DocumentService.permanentlyDeleteDocument] Failed to delete from storage', {
          error: err,
          fileKey: document.fileKey,
        });
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      await prisma.document.delete({
        where: { id: documentId },
      });

      logger.info('[DocumentService.permanentlyDeleteDocument] Document permanently deleted', {
        documentId,
        userId,
      });
    } catch (err) {
      logger.error('[DocumentService.permanentlyDeleteDocument] Failed to permanently delete', {
        error: err,
        documentId,
      });
      throw err;
    }
  }

  /**
   * Mark document as verified by admin
   * 
   * @param documentId - Document ID
   * @param verifiedBy - Admin user ID
   */
  async verifyDocument(documentId: string, verifiedBy: string): Promise<DocumentResponse> {
    try {
      const document = await prisma.document.update({
        where: { id: documentId },
        data: {
          isVerified: true,
          verifiedBy,
          verifiedAt: new Date(),
        },
      });

      logger.info('[DocumentService.verifyDocument] Document verified', {
        documentId,
        verifiedBy,
      });

      return this.toDocumentResponse(document);
    } catch (err) {
      logger.error('[DocumentService.verifyDocument] Failed to verify document', {
        error: err,
        documentId,
      });
      throw err;
    }
  }

  /**
   * Helper: Determine category from document type
   */
  private getCategoryFromType(type: DOCUMENT_TYPE): DOCUMENT_CATEGORY {
    const typeToCategory: Partial<Record<DOCUMENT_TYPE, DOCUMENT_CATEGORY>> = {
      [DOCUMENT_TYPE.ID_PROOF]: DOCUMENT_CATEGORY.IDENTITY,
      [DOCUMENT_TYPE.ASSET_PHOTO]: DOCUMENT_CATEGORY.ASSET,
      [DOCUMENT_TYPE.ASSET_DOCUMENT]: DOCUMENT_CATEGORY.ASSET,
      [DOCUMENT_TYPE.PURCHASE_RECEIPT]: DOCUMENT_CATEGORY.ASSET,
      [DOCUMENT_TYPE.EMI_RECEIPT]: DOCUMENT_CATEGORY.PAYMENT,
      [DOCUMENT_TYPE.TRANSFER_PROOF]: DOCUMENT_CATEGORY.PAYMENT,
      [DOCUMENT_TYPE.LOAN_AGREEMENT]: DOCUMENT_CATEGORY.LOAN,
      [DOCUMENT_TYPE.PROFILE_PICTURE]: DOCUMENT_CATEGORY.PROFILE,
    };

    return typeToCategory[type] || DOCUMENT_CATEGORY.OTHER;
  }

  /**
   * Helper: Convert Prisma document to DTO
   */
  private toDocumentResponse(doc: any): DocumentResponse {
    return {
      id: doc.id,
      fileKey: doc.fileKey,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      documentType: doc.documentType,
      documentCategory: doc.documentCategory,
      requestId: doc.requestId,
      uploadedBy: doc.uploadedBy,
      uploaderRole: doc.uploaderRole,
      isPublic: doc.isPublic,
      isVerified: doc.isVerified || false,
      verifiedBy: doc.verifiedBy,
      verifiedAt: doc.verifiedAt,
      status: doc.status,
      description: doc.description,
      displayOrder: doc.displayOrder,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export const documentService = new DocumentService();

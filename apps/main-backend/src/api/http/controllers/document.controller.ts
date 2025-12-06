/**
 * Document Controllers
 * 
 * HTTP handlers for document operations.
 * Thin layer - delegates to DocumentService for business logic.
 * 
 * @module api/http/controllers/document
 */

import type { Request, Response } from 'express';
import { documentService } from '../../../domain/documents/document.service';
import { ValidationError, ErrorCode } from '@fundifyhub/utils';
import {
  DOCUMENT_TYPE,
  DOCUMENT_CATEGORY,
  DOCUMENT_UPLOADER_ROLE,
  createDocumentSchema,
  bulkSignedUrlSchema,
} from '@fundifyhub/types';
import logger from '../../../utils/logger';
import { asyncHandler } from '../middlewares';

/**
 * POST /api/v1/documents
 * Create document metadata after upload
 */
export const createDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new ValidationError('Authentication required', ErrorCode.AUTHENTICATION_ERROR);
  }

  // Validate request body
  const data = createDocumentSchema.parse(req.body);

  const document = await documentService.createDocument({
    ...data,
    uploadedBy: data.uploadedBy || user.id,
  });

  logger.info('[createDocumentHandler] Document created', {
    documentId: document.id,
    userId: user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Document created successfully',
    data: document,
  });
});

/**
 * GET /api/v1/documents/:id
 * Get document metadata
 */
export const getDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new ValidationError('Authentication required', ErrorCode.AUTHENTICATION_ERROR);
  }

  const { id } = req.params;
  const generateUrl = req.query.generateUrl === 'true';
  const expiresIn = req.query.expiresIn ? parseInt(req.query.expiresIn as string) : undefined;

  const result = await documentService.getDocument(id, user.id, {
    generateSignedUrl: generateUrl,
    urlExpiresIn: expiresIn,
  });

  logger.info('[getDocumentHandler] Document retrieved', {
    documentId: id,
    userId: user.id,
    generateUrl,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/v1/documents/bulk-urls
 * Get signed URLs for multiple documents
 */
export const getBulkSignedUrlsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new ValidationError('Authentication required', ErrorCode.AUTHENTICATION_ERROR);
  }

  const data = bulkSignedUrlSchema.parse(req.body);

  const result = await documentService.getBulkSignedUrls(
    data.documentIds,
    user.id,
    data.expiresIn
  );

  logger.info('[getBulkSignedUrlsHandler] Bulk signed URLs generated', {
    count: data.documentIds.length,
    userId: user.id,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/v1/documents
 * List documents with filters
 */
export const listDocumentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new ValidationError('Authentication required', ErrorCode.AUTHENTICATION_ERROR);
  }

  const {
    requestId,
    uploadedBy,
    documentType,
    documentCategory,
    status,
    includeDeleted,
  } = req.query;

  const documents = await documentService.listDocuments(
    {
      requestId: requestId as string | undefined,
      uploadedBy: uploadedBy as string | undefined,
      documentType: documentType as DOCUMENT_TYPE | undefined,
      documentCategory: documentCategory as DOCUMENT_CATEGORY | undefined,
      status: status as any,
      includeDeleted: includeDeleted === 'true',
    },
    user.id
  );

  logger.info('[listDocumentsHandler] Documents listed', {
    count: documents.length,
    userId: user.id,
  });

  res.status(200).json({
    success: true,
    data: documents,
  });
});

/**
 * DELETE /api/v1/documents/:id
 * Soft delete document
 */
export const deleteDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new ValidationError('Authentication required', ErrorCode.AUTHENTICATION_ERROR);
  }

  const { id } = req.params;
  const permanent = req.query.permanent === 'true';

  if (permanent) {
    await documentService.permanentlyDeleteDocument(id, user.id);
  } else {
    await documentService.deleteDocument(id, user.id);
  }

  logger.info('[deleteDocumentHandler] Document deleted', {
    documentId: id,
    userId: user.id,
    permanent,
  });

  res.status(200).json({
    success: true,
    message: permanent ? 'Document permanently deleted' : 'Document deleted',
  });
});

/**
 * PUT /api/v1/documents/:id/verify
 * Verify document (admin only)
 */
export const verifyDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    throw new ValidationError('Authentication required', ErrorCode.AUTHENTICATION_ERROR);
  }

  // Check if user is admin
  const isAdmin = user.roles?.some(
    (role) =>
      role === 'SUPER_ADMIN' || role === 'DISTRICT_ADMIN' || role === 'STATE_ADMIN'
  );

  if (!isAdmin) {
    throw new ValidationError('Admin access required', ErrorCode.FORBIDDEN);
  }

  const { id } = req.params;

  const document = await documentService.verifyDocument(id, user.id);

  logger.info('[verifyDocumentHandler] Document verified', {
    documentId: id,
    verifiedBy: user.id,
  });

  res.status(200).json({
    success: true,
    message: 'Document verified successfully',
    data: document,
  });
});

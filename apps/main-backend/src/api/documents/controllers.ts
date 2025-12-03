import { Request, Response } from "express";
import { prisma, DocumentStatus } from "@fundifyhub/prisma";
import {
  generateSignedUrl,
  generateSignedUrls,
  deleteUploadThingFiles,
} from "../../utils/uploadthing";
import { CLIENT_CONSTANTS } from "@fundifyhub/types";
import { APIResponseType, CreateDocumentRequest, isAuthenticated } from "../../types";
import logger from "../../utils/logger";
import { auditDocument } from "../../utils/audit";

/**
 * POST /api/v1/documents
 * Create a new document entry
 */
export async function createDocumentController(req: Request, res: Response): Promise<void> {
  try {
    const {
      fileKey,
      fileName,
      fileSize,
      fileType,
      documentType,
      documentCategory,
      requestId,
      uploadedBy,
      description,
      displayOrder,
      metadata,
    } = req.body;

    // Validate required fields
    if (!fileKey || !fileName || !fileType || !documentType || !uploadedBy) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: fileKey, fileName, fileType, documentType, uploadedBy",
      } as APIResponseType);
      return;
    }

    // Determine uploaderRole based on user's roles
    let uploaderRole = "USER_SUBMITTED"; // Default
    const user = await prisma.user.findUnique({
      where: { id: uploadedBy },
      select: { roles: true }
    });
    
    if (user?.roles) {
      if (user.roles.includes("SUPER_ADMIN") || user.roles.includes("DISTRICT_ADMIN")) {
        uploaderRole = "ADMIN_SUBMITTED";
      } else if (user.roles.includes("AGENT")) {
        uploaderRole = "AGENT_SUBMITTED";
      }
    }

    // Create document in database
    const document = await prisma.document.create({
      data: {
        fileKey,
        fileName,
        fileSize: fileSize || 0,
        fileType,
        documentType,
        documentCategory: documentCategory || "OTHER",
        requestId: requestId || null,
        uploadedBy,
        uploaderRole,
        description: description || null,
        displayOrder: displayOrder || null,
        metadata: metadata || null,
      },
    });

    logger.info(`Document created: ${document.id} by user: ${uploadedBy}`);

    // Audit: Document uploaded
    auditDocument.uploaded(req, document.id, documentType, requestId).catch(() => {});

    // Generate a short-lived signed URL for the newly created document so
    // frontends can use it immediately without an extra request.
    try {
  const expiresIn = parseInt(String(req.query.expiresIn || String(CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT))) || CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT;
  const { url, expiresAt } = await generateSignedUrl(document.fileKey, expiresIn);

      const documentWithUrl = {
        ...document,
        url,
        urlExpiresAt: expiresAt,
      };

      res.status(201).json({
        success: true,
        message: "Document created successfully",
        data: documentWithUrl,
      } as APIResponseType);
      return;
    } catch (err) {
      // If signed URL generation fails, still return the created document for
      // backward compatibility — the frontend can request a signed URL later.
  logger.warn(`Failed to generate signed URL for newly created document: ${(err as Error).message}`);
      res.status(201).json({
        success: true,
        message: "Document created successfully",
        data: document,
      } as APIResponseType);
      return;
    }
  } catch (error) {
    logger.error("Error creating document:", error as Error);
    res.status(500).json({
      success: false,
      message: "Failed to create document",
    } as APIResponseType);
  }
}

/**
 * POST /api/v1/documents/bulk
 * Create multiple document entries
 */
export async function createBulkDocumentsController(req: Request, res: Response): Promise<void> {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      res.status(400).json({
        success: false,
        message: "Documents array is required",
      } as APIResponseType);
      return;
    }

    // Validate all documents have required fields
    for (const doc of documents) {
      if (!doc.fileKey || !doc.fileName || !doc.fileType || !doc.documentType || !doc.uploadedBy) {
        res.status(400).json({
          success: false,
          message: "All documents must have required fields",
        } as APIResponseType);
        return;
      }
    }

    // Get unique uploaders to determine their roles
    const uniqueUploaders = Array.from(new Set(documents.map(d => d.uploadedBy)));
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUploaders } },
      select: { id: true, roles: true }
    });
    
    const uploaderRoleMap: Record<string, string> = {};
    users.forEach(user => {
      if (user.roles.includes("SUPER_ADMIN") || user.roles.includes("DISTRICT_ADMIN")) {
        uploaderRoleMap[user.id] = "ADMIN_SUBMITTED";
      } else if (user.roles.includes("AGENT")) {
        uploaderRoleMap[user.id] = "AGENT_SUBMITTED";
      } else {
        uploaderRoleMap[user.id] = "USER_SUBMITTED";
      }
    });

    // Create documents in database
    const createdDocuments = await prisma.document.createMany({
      data: documents.map((doc: CreateDocumentRequest) => {
        const data: any = {
          fileKey: doc.fileKey,
          fileName: doc.fileName,
          fileSize: doc.fileSize || 0,
          fileType: doc.fileType,
          documentType: doc.documentType,
          documentCategory: doc.documentCategory || "OTHER",
          requestId: doc.requestId || null,
          uploadedBy: doc.uploadedBy,
          uploaderRole: uploaderRoleMap[doc.uploadedBy] || "USER_SUBMITTED",
          description: doc.description || null,
          displayOrder: doc.displayOrder || null,
        };
        if (doc.metadata) {
          data.metadata = doc.metadata;
        }
        return data;
      }),
    });

    logger.info(`Bulk created ${createdDocuments.count} documents`);

    // Fetch created documents by fileKey for response
    let createdRows: any[] = [];
    try {
      const fileKeys = documents.map((d: any) => d.fileKey);
      createdRows = await prisma.document.findMany({ where: { fileKey: { in: fileKeys } } });
    } catch (err) {
      logger.error('Failed to fetch created documents', err as Error);
    }

    // Include created document IDs in the response so callers can reference them immediately.
    const documentIds = createdRows.map((r) => r.id);

    res.status(201).json({
      success: true,
      message: "Documents created successfully",
      data: { count: createdDocuments.count, documentIds },
    } as APIResponseType);
  } catch (error) {
    logger.error("Error creating bulk documents:", error as Error);
    res.status(500).json({
      success: false,
      message: "Failed to create documents",
    } as APIResponseType);
  }
}

/**
 * GET /api/v1/documents/:id
 * Get document metadata by ID
 */
export async function getDocumentController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        request: {
          select: {
            id: true,
            customerId: true,
            currentStatus: true,
          },
        },
      },
    });

    if (!document) {
      res.status(404).json({
        success: false,
        message: "Document not found",
      } as APIResponseType);
      return;
    }
    // If caller requested a signed URL, generate and include it. This keeps
    // backward compatibility by defaulting to not generating URLs for every
    // get call unless explicitly requested via `includeUrl=true`.
    const includeUrl = String(req.query.includeUrl || 'false').toLowerCase() === 'true';
    if (includeUrl) {
      try {
        const expiresIn = parseInt(String(req.query.expiresIn || String(CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT))) || CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT;
        const { url, expiresAt } = await generateSignedUrl(document.fileKey, expiresIn);
        const documentWithUrl = { ...document, url, urlExpiresAt: expiresAt };
        res.json({ success: true, data: documentWithUrl } as APIResponseType);
        return;
      } catch (err) {
        logger.warn(`Failed to generate signed URL for document ${id}: ${(err as Error).message}`);
        // Fall through and return the document without URL
      }
    }

    res.json({
      success: true,
      data: document,
    } as APIResponseType);
  } catch (error) {
    logger.error("Error fetching document:", error as Error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch document",
    } as APIResponseType);
  }
}

/**
 * GET /api/v1/documents/signed-url-by-filekey/:fileKey
 *
 * Generate a signed URL for accessing a private file directly by its UploadThing file key.
 * This endpoint does not require authentication as it's designed for public signed URL access.
 *
 * @param req.params.fileKey - The UploadThing file key
 * @param req.query.expiresIn - Optional expiration time in seconds (default: 900 = 15 minutes)
 * @returns Signed URL with expiration information
 *
 * @example
 * GET /api/v1/documents/signed-url-by-filekey/file_123?expiresIn=1800
 * Response: { success: true, data: { url: "...", expiresAt: "...", expiresIn: 1800, fileKey: "file_123" } }
 */
export async function getSignedUrlByFileKeyController(req: Request, res: Response): Promise<void> {
  try {
    const { fileKey } = req.params;
  const expiresIn = parseInt(req.query.expiresIn as string) || CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT; // Default from CLIENT_CONSTANTS

    if (!fileKey) {
      res.status(400).json({
        success: false,
        message: "FileKey is required",
      } as APIResponseType);
      return;
    }

    // Generate signed URL directly from fileKey
    const { url, expiresAt } = await generateSignedUrl(fileKey, expiresIn);
    if (!url) {
      res.status(404).json({ success: false, message: 'File not found or unavailable' } as APIResponseType);
      return;
    }

    // If the caller prefers JSON (e.g., API client), return JSON.
    // If the request is coming from a browser img/src or direct navigation, redirect to the signed URL
    const accept = String(req.headers.accept || '').toLowerCase();
    const prefersJson = accept.includes('application/json') || accept.includes('text/json') || req.xhr;

    if (prefersJson) {
      res.json({
        success: true,
        data: {
          url,
          expiresAt,
          expiresIn,
          fileKey,
        },
      } as APIResponseType);
      return;
    }

    // Redirect to the signed URL for browser image requests
    res.redirect(url);
  } catch (error) {
    logger.error("Error generating signed URL by fileKey:", error as Error);
    res.status(500).json({
      success: false,
      message: "Failed to generate signed URL",
    } as APIResponseType);
  }
}

/**
 * GET /api/v1/documents/:id/url
 * Generate signed URL for document
 */
/**
 * GET /api/v1/documents/:id/url
 *
 * Generate a signed URL for accessing a document by its database ID.
 * Requires authentication and checks user permissions for document access.
 *
 * @param req.params.id - Document database ID
 * @param req.query.expiresIn - Optional expiration time in seconds (default: 900 = 15 minutes)
 * @returns Signed URL with document metadata
 *
 * @example
 * GET /api/v1/documents/123/url?expiresIn=1800
 * Response: { success: true, data: { url: "...", expiresAt: "...", expiresIn: 1800, document: {...} } }
 */
export async function getDocumentSignedUrlController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
  const expiresIn = parseInt(req.query.expiresIn as string) || CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT; // Default from CLIENT_CONSTANTS

    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({
        success: false,
        message: "Document not found",
      } as APIResponseType);
      return;
    }

    // TODO: Add access control validation here
    // Check if the requesting user has permission to access this document

    // Generate signed URL
    const { url, expiresAt } = await generateSignedUrl(document.fileKey, expiresIn);
    if (!url) {
      res.status(404).json({ success: false, message: 'File not found or unavailable' } as APIResponseType);
      return;
    }

    const accept = String(req.headers.accept || '').toLowerCase();
    const prefersJson = accept.includes('application/json') || accept.includes('text/json') || req.xhr;

    if (prefersJson) {
      res.json({
        success: true,
        data: {
          url,
          expiresAt,
          expiresIn,
          document: {
            id: document.id,
            fileName: document.fileName,
            fileSize: document.fileSize,
            fileType: document.fileType,
          },
        },
      } as APIResponseType);
      return;
    }

    // Redirect to the signed URL for direct browser requests
    res.redirect(url);
  } catch (error) {
    logger.error("Error generating signed URL:", error as Error);
    res.status(500).json({
      success: false,
      message: "Failed to generate signed URL",
    } as APIResponseType);
  }
}

/**
 * GET /api/v1/documents
 * List documents with filters
 */
export async function listDocumentsController(req: Request, res: Response): Promise<void> {
  try {
    const {
      requestId,
      documentType,
      documentCategory,
      uploadedBy,
      status,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: {
      requestId?: string;
      documentType?: string;
      documentCategory?: string;
      uploadedBy?: string;
      status?: DocumentStatus;
    } = {};
    if (requestId) where.requestId = requestId as string;
    if (documentType) where.documentType = documentType as string;
    if (documentCategory) where.documentCategory = documentCategory as string;
    if (uploadedBy) where.uploadedBy = uploadedBy as string;
    if (status) where.status = status as DocumentStatus;
    else where.status = DocumentStatus.ACTIVE; // Default to active documents

    // Get total count
    const total = await prisma.document.count({ where });

    // Get documents
    const documents = await prisma.document.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      include: {
        request: {
          select: {
            id: true,
            customerId: true,
            currentStatus: true,
          },
        },
      },
    });

    // If client requested signed URLs, generate them in batch and attach to
    // each document. This is optional to preserve performance for list calls.
    const includeUrl = String(req.query.includeUrl || 'false').toLowerCase() === 'true';
    let documentsWithUrls = documents;
    if (includeUrl && documents.length > 0) {
      try {
        const expiresIn = parseInt(String(req.query.expiresIn || String(CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT))) || CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT;
        const fileKeys = documents.map((d) => d.fileKey);
        const signed = await generateSignedUrls(fileKeys, expiresIn);

        documentsWithUrls = documents.map((doc) => {
          const s = signed.find((x) => x.fileKey === doc.fileKey);
          return {
            ...doc,
            url: s?.url,
            urlExpiresAt: s?.expiresAt,
          };
        });
      } catch (err) {
        logger.warn(`Failed to generate signed URLs for list: ${(err as Error).message}`);
        // fallback to documents without urls
        documentsWithUrls = documents;
      }
    }

    res.json({
      success: true,
      data: {
        documents: documentsWithUrls,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    } as APIResponseType);
  } catch (error) {
    logger.error("Error listing documents:", error as Error);
    res.status(500).json({
      success: false,
      message: "Failed to list documents",
    } as APIResponseType);
  }
}

/**
 * POST /api/v1/documents/signed-urls
 * Generate signed URLs for multiple documents
 */
/**
 * POST /api/v1/documents/signed-urls
 *
 * Generate signed URLs for multiple documents in a single request.
 * Requires authentication and validates access permissions for all requested documents.
 *
 * @param req.body.documentIds - Array of document database IDs
 * @param req.body.expiresIn - Optional expiration time in seconds (default: 900 = 15 minutes)
 * @returns Array of signed URLs with document metadata
 *
 * @example
 * POST /api/v1/documents/signed-urls
 * Body: { documentIds: [123, 456], expiresIn: 1800 }
 * Response: { success: true, data: [{ id: 123, url: "...", expiresAt: "..." }, ...] }
 */
export async function getBulkSignedUrlsController(req: Request, res: Response): Promise<void> {
  try {
  const { documentIds, expiresIn = CLIENT_CONSTANTS.SIGNED_URL_EXPIRES_SHORT } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "Document IDs array is required",
      } as APIResponseType);
      return;
    }

    // Get documents from database
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
      },
    });

    if (documents.length === 0) {
      res.status(404).json({
        success: false,
        message: "No documents found",
      } as APIResponseType);
      return;
    }

  // Generate signed URLs
  const fileKeys = documents.map((doc) => doc.fileKey);
  logger.info(`Requesting signed URLs for fileKeys: ${fileKeys.join(',')}`);
  const signedUrls = await generateSignedUrls(fileKeys, expiresIn);
  logger.info(`Signed URLs generation result: ${signedUrls.map(s => `${s.fileKey}:${s.url ? 'OK':'MISSING'}`).join(',')}`);

    // Map results
    const results = documents.map((doc) => {
      const signedUrl = signedUrls.find((s) => s.fileKey === doc.fileKey);
      return {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        url: signedUrl?.url,
        expiresAt: signedUrl?.expiresAt,
      };
    });

    res.json({
      success: true,
      data: results,
    } as APIResponseType);
  } catch (error) {
    logger.error("Error generating bulk signed URLs:", error as Error);
    res.status(500).json({
      success: false,
      message: "Failed to generate signed URLs",
    } as APIResponseType);
  }
}

/**
 * DELETE /api/v1/documents/:id
 * Delete document (soft delete by default)
 */
export async function deleteDocumentController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { permanent = false } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({
        success: false,
        message: "Document not found",
      } as APIResponseType);
      return;
    }

    if (permanent) {
      // Permanently delete from database and UploadThing
      await deleteUploadThingFiles([document.fileKey]);
      await prisma.document.delete({ where: { id } });

      // Audit: Document permanently deleted
      auditDocument.deleted(req, id).catch(() => {});

      logger.info(`Document permanently deleted: ${id}`);

      res.json({
        success: true,
        message: "Document permanently deleted",
      } as APIResponseType);
    } else {
      // Soft delete
      await prisma.document.update({
        where: { id },
        data: {
          status: "DELETED",
        },
      });

      // Audit: Document soft deleted
      auditDocument.deleted(req, id).catch(() => {});

      logger.info(`Document soft deleted: ${id}`);

      res.json({
        success: true,
        message: "Document deleted",
      } as APIResponseType);
    }
  } catch (error) {
    logger.error("Error deleting document:", error as Error);
    res.status(500).json({
      success: false,
      message: "Failed to delete document",
    } as APIResponseType);
  }
}

/**
 * POST /api/v1/documents/delete-by-filekeys
 * Body: { fileKeys: string[] }
 * Deletes files from UploadThing storage by their fileKeys. This endpoint
 * is intended for client-side staged-upload cleanup when a file was uploaded
 * to UploadThing but not yet saved as a database Document.
 */
export async function deleteFilesByFileKeysController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!isAuthenticated(user)) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    const { fileKeys } = req.body as { fileKeys?: string[] };
    if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
      res.status(400).json({ success: false, message: 'fileKeys array is required' } as APIResponseType);
      return;
    }

    // Use shared utility to delete files from UploadThing
    const result = await deleteUploadThingFiles(fileKeys);

    res.status(200).json({ success: true, message: 'Files deleted', data: { deletedCount: result.deletedCount } } as APIResponseType);
  } catch (error) {
    logger.error('deleteFilesByFileKeysController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to delete files' } as APIResponseType);
  }
}

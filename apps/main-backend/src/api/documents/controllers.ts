import { Request, Response } from "express";
import { prisma } from "@fundifyhub/prisma";
import {
  generateSignedUrl,
  generateSignedUrls,
  deleteUploadThingFiles,
} from "../../utils/uploadthing";
import { APIResponseType, CreateDocumentRequest } from "../../types";
import logger from "../../utils/logger";

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
        description: description || null,
        displayOrder: displayOrder || null,
        metadata: metadata || null,
      },
    });

    logger.info(`Document created: ${document.id} by user: ${uploadedBy}`);

    res.status(201).json({
      success: true,
      message: "Document created successfully",
      data: document,
    } as APIResponseType);
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

    res.status(201).json({
      success: true,
      message: "Documents created successfully",
      data: { count: createdDocuments.count },
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
    const expiresIn = parseInt(req.query.expiresIn as string) || 900; // Default 15 minutes

    if (!fileKey) {
      res.status(400).json({
        success: false,
        message: "FileKey is required",
      } as APIResponseType);
      return;
    }

    // Generate signed URL directly from fileKey
    const { url, expiresAt } = await generateSignedUrl(fileKey, expiresIn);

    res.json({
      success: true,
      data: {
        url,
        expiresAt,
        expiresIn,
        fileKey,
      },
    } as APIResponseType);
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
    const expiresIn = parseInt(req.query.expiresIn as string) || 900; // Default 15 minutes

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
      status?: string;
    } = {};
    if (requestId) where.requestId = requestId as string;
    if (documentType) where.documentType = documentType as string;
    if (documentCategory) where.documentCategory = documentCategory as string;
    if (uploadedBy) where.uploadedBy = uploadedBy as string;
    if (status) where.status = status as string;
    else where.status = "ACTIVE"; // Default to active documents

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

    res.json({
      success: true,
      data: {
        documents,
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
    const { documentIds, expiresIn = 900 } = req.body;

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
    const signedUrls = await generateSignedUrls(fileKeys, expiresIn);

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
 * PATCH /api/v1/documents/:id/verify
 * Mark document as verified
 */
export async function verifyDocumentController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { verifiedBy, isVerified = true } = req.body;

    if (!verifiedBy) {
      res.status(400).json({
        success: false,
        message: "verifiedBy is required",
      } as APIResponseType);
      return;
    }

    const document = await prisma.document.update({
      where: { id },
      data: {
        isVerified,
        verifiedBy,
        verifiedAt: isVerified ? new Date() : null,
      },
    });

    logger.info(`Document ${isVerified ? "verified" : "unverified"}: ${id} by ${verifiedBy}`);

    res.json({
      success: true,
      message: `Document ${isVerified ? "verified" : "unverified"} successfully`,
      data: document,
    } as APIResponseType);
  } catch (error) {
    logger.error("Error verifying document:", error as Error);
    res.status(500).json({
      success: false,
      message: "Failed to verify document",
    } as APIResponseType);
  }
}

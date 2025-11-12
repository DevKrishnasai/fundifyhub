import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import {
  createDocumentController,
  createBulkDocumentsController,
  getDocumentController,
  getDocumentSignedUrlController,
  getSignedUrlByFileKeyController,
  listDocumentsController,
  getBulkSignedUrlsController,
  deleteDocumentController,
  verifyDocumentController,
} from "./controllers";

const router: ExpressRouter = Router();

/**
 * POST /api/v1/documents
 * Create a new document entry
 */
router.post("/", createDocumentController);

/**
 * POST /api/v1/documents/bulk
 * Create multiple document entries
 */
router.post("/bulk", createBulkDocumentsController);

/**
 * GET /api/v1/documents
 * List documents with filters
 */
router.get("/", listDocumentsController);

/**
 * GET /api/v1/documents/signed-url-by-filekey/:fileKey
 * Generate signed URL directly from fileKey
 */
router.get("/signed-url-by-filekey/:fileKey", getSignedUrlByFileKeyController);

/**
 * GET /api/v1/documents/:id
 * Get document metadata by ID
 * Note: This must come before the /:fileKey/signed-url route to avoid conflicts
 */
router.get("/:id", getDocumentController);

/**
 * GET /api/v1/documents/:fileKey/signed-url
 * Generate signed URL for a file (RESTful format)
 * Note: This route must come after /:id to ensure proper routing
 */
router.get("/:fileKey/signed-url", getSignedUrlByFileKeyController);

/**
 * POST /api/v1/documents/signed-urls
 * Generate signed URLs for multiple documents
 */
router.post("/signed-urls", getBulkSignedUrlsController);

/**
 * DELETE /api/v1/documents/:id
 * Delete document (soft delete by default)
 */
router.delete("/:id", deleteDocumentController);

/**
 * PATCH /api/v1/documents/:id/verify
 * Mark document as verified
 */
router.patch("/:id/verify", verifyDocumentController);

export default router;

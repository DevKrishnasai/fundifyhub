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
  deleteFilesByFileKeysController,
} from '../controllers/documents.controller';

const router: ExpressRouter = Router();

/**
 * @openapi
 * /api/v1/documents:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Create a new document entry
 *     description: Create a document record after uploading to UploadThing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - documentType
 *               - fileKey
 *               - fileUrl
 *               - fileName
 *             properties:
 *               requestId:
 *                 type: string
 *               documentType:
 *                 type: string
 *               fileKey:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               fileName:
 *                 type: string
 *               fileSize:
 *                 type: number
 *     responses:
 *       201:
 *         description: Document created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", createDocumentController);

/**
 * @openapi
 * /api/v1/documents/bulk:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Create multiple document entries
 *     description: Bulk create document records
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *                     documentType:
 *                       type: string
 *                     fileKey:
 *                       type: string
 *                     fileUrl:
 *                       type: string
 *                     fileName:
 *                       type: string
 *     responses:
 *       201:
 *         description: Documents created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/bulk", createBulkDocumentsController);

/**
 * @openapi
 * /api/v1/documents:
 *   get:
 *     tags:
 *       - Documents
 *     summary: List documents with filters
 *     description: Returns documents filtered by requestId, documentType, etc.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: requestId
 *         schema:
 *           type: string
 *         description: Filter by request ID
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *         description: Filter by document type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of documents
 *       401:
 *         description: Unauthorized
 */
router.get("/", listDocumentsController);

/**
 * @openapi
 * /api/v1/documents/signed-url-by-filekey/{fileKey}:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get signed URL by fileKey
 *     description: Generate a signed URL directly from a fileKey
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *         description: UploadThing fileKey
 *     responses:
 *       200:
 *         description: Signed URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     signedUrl:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.get("/signed-url-by-filekey/:fileKey", getSignedUrlByFileKeyController);

/**
 * @openapi
 * /api/v1/documents/{id}:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get document by ID
 *     description: Returns document metadata by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document metadata
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
router.get("/:id", getDocumentController);

/**
 * @openapi
 * /api/v1/documents/{fileKey}/signed-url:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get signed URL (RESTful format)
 *     description: Generate signed URL for a file (alternative RESTful format)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *         description: UploadThing fileKey
 *     responses:
 *       200:
 *         description: Signed URL generated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.get("/:fileKey/signed-url", getSignedUrlByFileKeyController);

/**
 * @openapi
 * /api/v1/documents/signed-urls:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Get bulk signed URLs
 *     description: Generate signed URLs for multiple documents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileKeys
 *             properties:
 *               fileKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Signed URLs generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       fileKey:
 *                         type: string
 *                       signedUrl:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.post("/signed-urls", getBulkSignedUrlsController);

/**
 * @openapi
 * /api/v1/documents/{id}:
 *   delete:
 *     tags:
 *       - Documents
 *     summary: Delete document
 *     description: Soft delete a document record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Document deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 */
router.delete("/:id", deleteDocumentController);

/**
 * @openapi
 * /api/v1/documents/delete-by-filekeys:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Delete files by fileKeys
 *     description: Delete files from UploadThing storage by their fileKeys
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileKeys
 *             properties:
 *               fileKeys:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Files deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/delete-by-filekeys", deleteFilesByFileKeysController);

export default router;

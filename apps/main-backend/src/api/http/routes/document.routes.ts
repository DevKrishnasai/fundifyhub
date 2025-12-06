/**
 * Document Routes
 * 
 * Endpoints for document management with signed URL support.
 * 
 * @module api/http/routes/document
 */

import { Router, type Router as ExpressRouter } from 'express';
import { requireAuthentication } from '../middlewares';
import {
  createDocumentHandler,
  getDocumentHandler,
  getBulkSignedUrlsHandler,
  listDocumentsHandler,
  deleteDocumentHandler,
  verifyDocumentHandler,
} from '../controllers/document.controller';

const router: ExpressRouter = Router();

// All document routes require authentication
router.use(requireAuthentication);

// Document CRUD
router.post('/', createDocumentHandler);
router.get('/', listDocumentsHandler);
router.get('/:id', getDocumentHandler);
router.delete('/:id', deleteDocumentHandler);

// Bulk operations
router.post('/bulk-urls', getBulkSignedUrlsHandler);

// Admin operations
router.put('/:id/verify', verifyDocumentHandler);

export default router;

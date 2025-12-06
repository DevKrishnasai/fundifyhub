import { z } from 'zod';
import { DOCUMENT_TYPE, DOCUMENT_CATEGORY, DOCUMENT_UPLOADER_ROLE } from './enums';
import { MAX_DOCUMENT_SIZE, ALLOWED_DOCUMENT_TYPES } from './constants';

export const createDocumentSchema = z.object({
  fileKey: z.string().min(1, 'File key is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().max(MAX_DOCUMENT_SIZE, 'File size exceeds limit'),
  fileType: z.string().refine((type) => ALLOWED_DOCUMENT_TYPES.includes(type), 'Invalid file type'),
  documentType: z.nativeEnum(DOCUMENT_TYPE),
  documentCategory: z.nativeEnum(DOCUMENT_CATEGORY).optional(),
  requestId: z.string().optional(),
  uploadedBy: z.string(),
  uploaderRole: z.nativeEnum(DOCUMENT_UPLOADER_ROLE).optional(),
  description: z.string().optional(),
  displayOrder: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export const bulkSignedUrlSchema = z.object({
  documentIds: z.array(z.string()),
  expiresIn: z.number().optional(),
});

export type CreateDocumentSchema = z.infer<typeof createDocumentSchema>;
export type BulkSignedUrlSchema = z.infer<typeof bulkSignedUrlSchema>;

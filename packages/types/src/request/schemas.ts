/**
 * Zod schemas for Request domain
 */
import { z } from 'zod';
import { REQUEST_STAGE } from '../workflow/enums';
import { SUB_STATUS } from '../workflow/constants';
import { PAYMENT_METHOD } from '../payment/enums';

// Base schemas for nested objects
export const assetSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  assetType: z.string(),
  brand: z.string(),
  model: z.string(),
  condition: z.string(),
  purchaseYear: z.number(),
  description: z.string(),
  estimatedValue: z.number().nullable(),
  inspectedValue: z.number().nullable(),
  status: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export const bankDetailsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  accountNumber: z.string(),
  ifscCode: z.string(),
  accountName: z.string(),
  bankName: z.string().nullable(),
  branchName: z.string().nullable(),
  upiId: z.string().nullable(),
  isVerified: z.boolean(),
  verifiedAt: z.union([z.string(), z.date()]).nullable(),
  isPrimary: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export const commentSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  userId: z.string(),
  content: z.string(),
  isInternal: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  user: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.string(),
  }).optional(),
});

// Main Request Schema
export const requestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  identifier: z.string(),
  
  // Amounts
  requestedAmount: z.number(),
  approvedAmount: z.number().nullable(),
  
  // Status & Stage
  currentStatus: z.string(), // Legacy status
  stage: z.nativeEnum(REQUEST_STAGE).or(z.string()),
  subStatus: z.string(),
  
  // Location
  district: z.string(),
  
  // Assignments
  assignedToAgentId: z.string().nullable(),
  assignedToAdminId: z.string().nullable(),
  
  // Flags
  isCommentsEnabled: z.boolean(),
  
  // Timestamps
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  
  // Relations (Optional/Nullable based on fetch depth)
  user: z.any().optional(), // TODO: Add User schema
  asset: assetSchema.optional(),
  bankDetails: bankDetailsSchema.nullable().optional(),
  comments: z.array(commentSchema).optional(),
  documents: z.array(z.any()).optional(), // TODO: Add Document schema
  loan: z.any().optional(), // TODO: Add Loan schema
});

// List Response Schema
export const requestListResponseSchema = z.object({
  requests: z.array(requestSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Payloads
export const createRequestSchema = z.object({
  requestedAmount: z.number().positive('Amount must be positive'),
  district: z.string().min(1, 'District is required'),
  assetDescription: z.string().min(10, 'Description must be at least 10 characters'),
  estimatedAssetValue: z.number().positive('Value must be positive'),
  assetType: z.string().min(1, 'Asset type is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  condition: z.string().min(1, 'Condition is required'),
  purchaseYear: z.number().int().min(1900).max(new Date().getFullYear()),
});

export const updateStatusSchema = z.object({
  status: z.string(),
  reason: z.string().optional(),
});

export const assignAgentSchema = z.object({
  agentId: z.string().uuid(),
});

export const assignAdminSchema = z.object({
  adminId: z.string().uuid(),
});

export const createOfferSchema = z.object({
  interestRate: z.number().positive(),
  tenureMonths: z.number().int().positive(),
  processingFeeAmount: z.number().nonnegative().optional(),
  ltvPercentage: z.number().nonnegative().optional(),
});

export const scheduleInspectionSchema = z.object({
  scheduledAt: z.string().transform(s => new Date(s)),
  notes: z.string().optional(),
});

export const uploadDocumentsSchema = z.object({
  documents: z.array(z.object({
    documentType: z.string(),
    fileUrl: z.string(),
    fileName: z.string(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    category: z.string().optional(),
  })),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  isInternal: z.boolean().optional(),
});

export type RequestSchema = z.infer<typeof requestSchema>;
export type CreateRequestPayload = z.infer<typeof createRequestSchema>;
export type UpdateStatusPayload = z.infer<typeof updateStatusSchema>;
export type AssignAgentRequest = z.infer<typeof assignAgentSchema>;
export type AssignAdminRequest = z.infer<typeof assignAdminSchema>;
export type CreateOfferPayload = z.infer<typeof createOfferSchema>;
export type ScheduleInspectionPayload = z.infer<typeof scheduleInspectionSchema>;
export type UploadDocumentsPayload = z.infer<typeof uploadDocumentsSchema>;
export type AddCommentPayload = z.infer<typeof addCommentSchema>;

/**
 * Request validation schemas
 */

import { z } from 'zod';
import { RequestStage } from '../constants/request';

export const CreateRequestSchema = z.object({
  requestedAmount: z.number().positive('Amount must be positive').max(10000000, 'Amount too large'),
  districtId: z.string().min(1, 'District is required'),
  
  // Asset details
  assetType: z.string().min(1, 'Asset type is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  purchaseYear: z.number().int().min(1900).max(new Date().getFullYear()),
  description: z.string().optional().default(''),
});

export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;

export const UpdateRequestSchema = z.object({
  requestedAmount: z.number().positive().optional(),
  districtId: z.string().optional(),
  adminRequestedInfo: z.string().optional(),
  commentsEnabled: z.boolean().optional(),
});

export type UpdateRequestInput = z.infer<typeof UpdateRequestSchema>;

export const UpdateRequestStageSchema = z.object({
  stage: z.nativeEnum(RequestStage),
  subStatus: z.string().optional(),
  failureReason: z.string().optional(),
  failureType: z.string().optional(),
  requiresCustomerAction: z.boolean().optional(),
  requiresAdminAction: z.boolean().optional(),
  requiresAgentAction: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
});

export type UpdateRequestStageInput = z.infer<typeof UpdateRequestStageSchema>;

export const AssignAgentSchema = z.object({
  agentId: z.string().min(1, 'Agent ID required'),
});

export type AssignAgentInput = z.infer<typeof AssignAgentSchema>;

export const SubmitBankDetailsSchema = z.object({
  accountNumber: z.string().min(1, 'Account number required'),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
  accountName: z.string().min(1, 'Account name required'),
  bankName: z.string().optional(),
  branchName: z.string().optional(),
  upiId: z.string().optional(),
});

export type SubmitBankDetailsInput = z.infer<typeof SubmitBankDetailsSchema>;

export const CreateOfferSchema = z.object({
  requestId: z.string().min(1, 'Request ID required'),
  offeredAmount: z.number().positive('Amount must be positive'),
  tenureMonths: z.number().int().positive().min(1).max(120),
  interestRate: z.number().positive().max(100),
  processingFee: z.number().min(0).default(0),
  penaltyPercentage: z.number().min(0).max(100).default(4),
  lateFeePercentage: z.number().min(0).max(10).default(0.01),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;

export const RespondToOfferSchema = z.object({
  offerId: z.string().min(1, 'Offer ID required'),
  action: z.enum(['ACCEPT', 'DECLINE']),
});

export type RespondToOfferInput = z.infer<typeof RespondToOfferSchema>;

export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
  isInternal: z.boolean().default(false),
  commentType: z.string().default('GENERAL'),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export const ScheduleInspectionSchema = z.object({
  agentId: z.string().min(1, 'Agent ID required'),
  scheduledDate: z.string().datetime(),
});

export type ScheduleInspectionInput = z.infer<typeof ScheduleInspectionSchema>;

export const CompleteInspectionSchema = z.object({
  assetCondition: z.string().min(1, 'Asset condition required'),
  estimatedValue: z.number().positive().optional(),
  notes: z.string().optional(),
  recommendApprove: z.boolean(),
});

export type CompleteInspectionInput = z.infer<typeof CompleteInspectionSchema>;

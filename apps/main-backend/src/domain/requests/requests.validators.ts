import { z } from 'zod';
import { CommonSchemas } from '@fundifyhub/utils';

export const RequestSchemas: Record<string, z.ZodTypeAny> = {
  create: z.object({
    assetDescription: z.string().min(10, 'Asset description must be at least 10 characters'),
    requestedAmount: CommonSchemas.amount,
    estimatedAssetValue: CommonSchemas.amount.optional(),
    assetAge: z.number().int().min(0).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),

  update: z.object({
    assetDescription: z.string().min(10).optional(),
    requestedAmount: CommonSchemas.amount.optional(),
    estimatedAssetValue: CommonSchemas.amount.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),

  list: z.object({
    page: CommonSchemas.pagination.shape?.page ?? z.number().int().min(1).default(1),
    pageSize: CommonSchemas.pagination.shape?.pageSize ?? z.number().int().min(1).max(100).default(20),
    stage: z.string().optional(),
    status: z.string().optional(),
    customerId: CommonSchemas.userId.optional(),
    agentId: CommonSchemas.userId.optional(),
    adminId: CommonSchemas.userId.optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'amount']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),

  submitForReview: z.object({
    requestId: CommonSchemas.requestId,
  }),

  assignAgent: z.object({
    requestId: CommonSchemas.requestId,
    agentId: CommonSchemas.userId,
  }),

  assignAdmin: z.object({
    requestId: CommonSchemas.requestId,
    adminId: CommonSchemas.userId,
  }),
};

/**
 * Offer schemas
 */
export const OfferSchemas: Record<string, z.ZodTypeAny> = {
  create: z.object({
    requestId: CommonSchemas.requestId,
    loanAmount: CommonSchemas.amount,
    interestRate: CommonSchemas.percentage,
    tenure: z.number().int().min(3).max(60, 'Tenure must be between 3 and 60 months'),
    monthlyPayment: CommonSchemas.amount,
    totalInterest: CommonSchemas.amount,
    totalAmount: CommonSchemas.amount,
    notes: CommonSchemas.notes,
  }),

  accept: z.object({
    requestId: CommonSchemas.requestId,
    offerId: z.string().min(1),
  }),

  reject: z.object({
    requestId: CommonSchemas.requestId,
    offerId: z.string().min(1),
    reason: z.string().min(10, 'Please provide a reason for rejection'),
  }),
};

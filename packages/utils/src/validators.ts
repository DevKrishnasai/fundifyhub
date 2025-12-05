/**
 * Validators - Zod schemas for input validation
 *
 * All request/form validation happens through these schemas.
 * This ensures consistent validation across frontend and backend.
 */

import { z } from 'zod';

/**
 * Base schemas used across multiple validators
 */
export const CommonSchemas = {
  // IDs
  id: z.string().min(1, 'ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  requestId: z.string().min(1, 'Request ID is required'),
  loanId: z.string().min(1, 'Loan ID is required'),

  // Identifiers
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^(\+91|91)?[6-9]\d{9}$/, 'Invalid phone number'),

  // Numbers
  amount: z.number().positive('Amount must be positive'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  count: z.number().int().min(0),

  // Dates
  date: z.coerce.date(),
  isoDate: z.string().datetime(),

  // Text
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),

  // Common fields
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETED']),
  pagination: z.object({
    page: z.number().int().min(1).default(1).optional(),
    pageSize: z.number().int().min(1).max(100).default(10).optional(),
    skip: z.number().int().min(0).optional(),
    take: z.number().int().min(1).max(100).optional(),
  }),
};

/**
 * Loan Request schemas
 */
export const RequestSchemas = {
  create: z.object({
    assetDescription: z.string().min(10, 'Asset description must be at least 10 characters'),
    requestedAmount: CommonSchemas.amount,
    estimatedAssetValue: CommonSchemas.amount.optional(),
    assetAge: z.number().int().min(0).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),

  update: z.object({
    assetDescription: z.string().min(10).optional(),
    requestedAmount: CommonSchemas.amount.optional(),
    estimatedAssetValue: CommonSchemas.amount.optional(),
    metadata: z.record(z.unknown()).optional(),
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
export const OfferSchemas = {
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

/**
 * Payment schemas
 */
export const PaymentSchemas = {
  createOrder: z.object({
    emiId: z.string().min(1),
    amount: CommonSchemas.amount,
  }),

  verify: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),

  recordManual: z.object({
    emiId: z.string().min(1),
    amount: CommonSchemas.amount,
    paidDate: CommonSchemas.date,
    method: z.enum(['CASH', 'BANK_TRANSFER', 'CHECK']),
    reference: z.string().optional(),
  }),
};

/**
 * Auction schemas
 */
export const AuctionSchemas = {
  create: z.object({
    loanId: CommonSchemas.loanId,
    startingBid: CommonSchemas.amount,
    minBidIncrement: CommonSchemas.amount,
    startDate: CommonSchemas.date,
    endDate: CommonSchemas.date,
    description: CommonSchemas.description,
  }),

  placeBid: z.object({
    auctionId: z.string().min(1),
    bidAmount: CommonSchemas.amount,
  }),

  extend: z.object({
    auctionId: z.string().min(1),
    newEndDate: CommonSchemas.date,
  }),
};

/**
 * Inspection schemas
 */
export const InspectionSchemas = {
  schedule: z.object({
    requestId: CommonSchemas.requestId,
    inspectionDate: CommonSchemas.date,
    inspectionTimeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
    location: z.string().min(10),
    notes: CommonSchemas.notes,
  }),

  complete: z.object({
    requestId: CommonSchemas.requestId,
    assetCondition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
    photos: z.array(z.string()).min(1, 'At least one photo is required'),
    notes: CommonSchemas.description,
  }),
};

/**
 * Document schemas
 */
export const DocumentSchemas = {
  create: z.object({
    requestId: CommonSchemas.requestId.optional(),
    fileKey: z.string().min(1),
    fileName: z.string().min(1),
    fileType: z.string().min(1),
    documentType: z.string().min(1),
    documentCategory: z.string().optional(),
    description: CommonSchemas.description,
  }),
};

/**
 * Authentication schemas
 */
export const AuthSchemas = {
  register: z.object({
    email: CommonSchemas.email,
    phoneNumber: CommonSchemas.phoneNumber,
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.enum(['CUSTOMER', 'AGENT', 'DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN']),
  }),

  login: z.object({
    email: CommonSchemas.email,
    password: z.string().min(1),
  }),

  resetPassword: z.object({
    email: CommonSchemas.email,
  }),

  confirmPasswordReset: z.object({
    email: CommonSchemas.email,
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
};

/**
 * Filter and search schemas
 */
export const FilterSchemas = {
  requestFilter: z.object({
    stage: z.string().optional(),
    status: z.string().optional(),
    customerId: z.string().optional(),
    agentId: z.string().optional(),
    adminId: z.string().optional(),
    minAmount: CommonSchemas.amount.optional(),
    maxAmount: CommonSchemas.amount.optional(),
    createdAfter: CommonSchemas.date.optional(),
    createdBefore: CommonSchemas.date.optional(),
  }),

  loanFilter: z.object({
    status: z.enum(['ACTIVE', 'COMPLETED', 'DEFAULTED']).optional(),
    customerId: CommonSchemas.userId.optional(),
    minAmount: CommonSchemas.amount.optional(),
    maxAmount: CommonSchemas.amount.optional(),
  }),

  auctionFilter: z.object({
    status: z.string().optional(),
    minBid: CommonSchemas.amount.optional(),
    maxBid: CommonSchemas.amount.optional(),
  }),
};

/**
 * Helper to parse and validate data
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { data: T; error: null } | { data: null; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { data: result.data, error: null };
  }
  return { data: null, error: result.error };
}

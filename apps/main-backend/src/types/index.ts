import { UserType } from "@fundifyhub/types";
import type { Prisma } from "@fundifyhub/prisma";
import type { EMICalcResult } from "@fundifyhub/utils";

export interface APIResponseType<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

/**
 * Type for adminEmiSchedule JSON column stored on Request
 * This is calculated when an offer is created and stored for preview/audit
 */
export interface AdminEmiScheduleSnapshot {
  principal: number;
  monthlyPayment: number;
  totalInterest: number;
  totalAmount: number;
  emiSchedule: Array<{
    emiNumber: number;
    dueDate: string;
    emiAmount: number;
    principalAmount: number;
    interestAmount: number;
    outstandingPrincipal: number;
  }>;
}

/**
 * Normalized EMI data for loan creation (field names standardized)
 */
export interface NormalizedEmiData {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  emiSchedule: Array<{
    installment: number;
    paymentDate: string;
    paymentAmount: number;
    principal: number;
    interest: number;
  }>;
}

/**
 * Type guard to check if a value is an AdminEmiScheduleSnapshot
 */
export function isAdminEmiScheduleSnapshot(value: unknown): value is AdminEmiScheduleSnapshot {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.principal === 'number' &&
    typeof obj.monthlyPayment === 'number' &&
    Array.isArray(obj.emiSchedule)
  );
}

/**
 * Convert AdminEmiScheduleSnapshot to NormalizedEmiData
 */
export function normalizeAdminSnapshot(snapshot: AdminEmiScheduleSnapshot): NormalizedEmiData {
  return {
    monthlyPayment: snapshot.monthlyPayment,
    totalInterest: snapshot.totalInterest,
    totalPayment: snapshot.totalAmount,
    emiSchedule: snapshot.emiSchedule.map(emi => ({
      installment: emi.emiNumber,
      paymentDate: emi.dueDate,
      paymentAmount: emi.emiAmount,
      principal: emi.principalAmount,
      interest: emi.interestAmount,
    })),
  };
}

/**
 * Convert EMICalcResult to NormalizedEmiData
 */
export function normalizeEmiCalcResult(result: EMICalcResult): NormalizedEmiData {
  return {
    monthlyPayment: result.monthlyPayment,
    totalInterest: result.totalInterest,
    totalPayment: result.totalPayment,
    emiSchedule: result.emiSchedule.map(emi => ({
      installment: emi.installment,
      paymentDate: emi.paymentDate,
      paymentAmount: emi.paymentAmount,
      principal: emi.principal,
      interest: emi.interest,
    })),
  };
}

export interface CreateDocumentRequest {
  fileKey: string;
  fileName: string;
  fileSize?: number;
  fileType: string;
  documentType: string;
  documentCategory?: string;
  requestId?: string;
  uploadedBy: string;
  description?: string;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Authenticated user from Express request
 * This is the user after JWT verification - a subset of UserType
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  districts: string[];
  phoneNumber?: string;
  isActive: boolean;
}

/**
 * Type guard to check if user is authenticated
 */
export function isAuthenticated(user: UserType | undefined): user is UserType & AuthenticatedUser {
  return !!user && typeof user.id === 'string' && Array.isArray(user.roles);
}

/**
 * Helper type for Prisma request with common includes
 */
export type RequestWithRelations = Prisma.RequestGetPayload<{
  include: {
    customer: { select: { id: true; firstName: true; lastName: true; email: true; phoneNumber: true } };
    assignedAgent: { select: { id: true; firstName: true; lastName: true; phoneNumber: true } };
    assignedAdmin: { select: { id: true; firstName: true; lastName: true; email: true } };
    asset: true;
    documents: true;
    comments: { select: { id: true; content: true; createdAt: true; authorId: true; isInternal: true } };
    loan: { include: { emisSchedule: true } };
  };
}>;

/**
 * Full request detail type with all relations including loan and EMI schedules
 */
export type RequestDetailWithLoan = Prisma.RequestGetPayload<{
  include: {
    documents: true;
    customer: { select: { id: true; firstName: true; lastName: true; email: true; phoneNumber: true; address: true } };
    assignedAgent: { select: { id: true; firstName: true; lastName: true; phoneNumber: true } };
    assignedAdmin: { select: { id: true; firstName: true; lastName: true; email: true } };
    comments: { select: { id: true; content: true; createdAt: true; authorId: true; isInternal: true; author: { select: { id: true; firstName: true; lastName: true; roles: true } } } };
    loan: {
      include: {
        emisSchedule: {
          select: { id: true; emiNumber: true; dueDate: true; emiAmount: true; principalAmount: true; interestAmount: true; status: true; paidDate: true; paidAmount: true; lateFee: true };
        };
        paymentOrders: {
          select: { id: true; razorpayOrderId: true; emiScheduleId: true; emiAmount: true; penalty: true; totalAmount: true; status: true; razorpayPaymentId: true; failureReason: true; failureCode: true; attempts: true; createdAt: true; updatedAt: true; paidAt: true };
        };
      };
    };
  };
}>;

/**
 * EMI schedule item from Prisma
 */
export type EMIScheduleItem = Prisma.EMIScheduleGetPayload<{
  select: { id: true; emiNumber: true; dueDate: true; emiAmount: true; principalAmount: true; interestAmount: true; status: true; paidDate: true; paidAmount: true; lateFee: true };
}>;

/**
 * Extended EMI item with breakdown for response
 */
export interface EMIWithBreakdown extends EMIScheduleItem {
  breakdown: import('@fundifyhub/utils').EMIBreakdown | null;
  isOverdue: boolean;
}

/**
 * Comment type from Prisma
 */
export interface CommentWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  isInternal: boolean;
  author?: { id: string; firstName: string; lastName: string; roles: string[] };
}

/**
 * Document type from Prisma with optional URL
 */
export interface DocumentWithUrl {
  id: string;
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  documentCategory: string | null;
  url?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserType;
      /** Raw body string for webhook signature verification */
      rawBody?: string;
    }
  }
}
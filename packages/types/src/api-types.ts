/**
 * API Request/Response Types
 *
 * Shared types for HTTP API communication across all apps.
 * NOTE: Common types like PaginatedResponse and PaginationParams are in common/api.types.ts
 * NOTE: Prisma-dependent types are in api-types-prisma.ts (backend only)
 */

/**
 * Standard API response wrapper (re-exported from common for convenience)
 */
export type { ApiResponse as APIResponse, PaginatedResponse, PaginationParams } from './common/api.types';

/**
 * Document request payload (re-exported from document-types)
 */
export type { CreateDocumentRequest } from './document-types';

/**
 * EMI Schedule data stored as JSON on Request
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
 * Comment with author info
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
 * Document with optional signed URL
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


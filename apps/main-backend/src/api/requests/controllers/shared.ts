/**
 * Shared imports and utilities for request controllers
 * This module re-exports common dependencies to avoid duplication
 */

// Express types
export type { Request, Response } from 'express';

// Database
export { prisma } from '@fundifyhub/prisma';

// Logger
import baseLogger from '../../../utils/logger';
export const logger = baseLogger.child('[RequestsController]');

// Internal types
export type { APIResponseType } from '../../../types';

// RBAC utilities
export { hasAnyRole, hasDistrictAccess } from '../../../utils/rbac';

// EMI utilities
export { calculateEmiSchedule, calculateEmiBreakdown, isEmiOverdue, type EMIBreakdown } from '@fundifyhub/utils';

// Audit utilities
export { auditRequest, auditInspection, auditOffer, createAuditLog } from '../../../utils/audit';

// Notification utilities
export { sendRequestStatusNotification } from '../../../utils/notifications';

// Socket utilities
export { 
  emitRequestStatusChanged, 
  emitRequestUpdated, 
  emitUserNotification, 
  emitRequestCommentAdded, 
  emitRequestDocumentUploaded 
} from '../../../utils/socket-client';

// Serial number utilities
export { generateLoanNumber } from '../../../utils/serial';

// UploadThing utilities
export { generateSignedUrl, generateSignedUrls } from '../../../utils/uploadthing';

// Config
export { default as config } from '../../../utils/config';

// Types and constants from shared package
export { 
  ROLES, 
  DOCUMENT_UPLOADER_ROLE,
  DOCUMENT_TYPE,
  DOCUMENT_CATEGORY,
  DOCUMENT_TYPE_TO_CATEGORY,
  EMI_STATUS,
  OVERDUE_GRACE_PERIOD_DAYS,
  REQUEST_STATUS, 
  AGENT_ACCESS_DENY_STATUSES,
  CUSTOMER_ALLOWED_STATUSES,
  AGENT_ALLOWED_STATUSES,
  LOAN_CREATION_ALLOWED_STATUSES,
  DEFAULT_PENALTY_PERCENTAGE,
  DEFAULT_LATE_FEE_PERCENTAGE,
  AUDIT_ENTITY_TYPE,
  AUDIT_ACTION,
  REQUEST_HISTORY_ACTION,
  canViewRequestDetail,
  CLIENT_CONSTANTS,
} from '@fundifyhub/types';

import { Request } from 'express';
import { prisma, Prisma } from '@fundifyhub/prisma';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '@fundifyhub/types';
import logger from './logger';

// Import types to ensure Express Request extension is available
import '../types';

/** JSON-compatible value type for audit logs */
type JsonValue = Prisma.InputJsonValue;

/**
 * Parameters for creating an audit log entry
 */
interface AuditLogParams {
  /** The user performing the action (from req.user) */
  actorId?: string;
  actorEmail?: string;
  actorRoles?: string[];
  /** The action being performed */
  action: AUDIT_ACTION;
  /** Type of entity being affected */
  entityType: AUDIT_ENTITY_TYPE;
  /** ID of the affected entity */
  entityId?: string;
  /** Human-readable description */
  description: string;
  /** IP address (extracted from request) */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Previous state (for updates) */
  previousValue?: JsonValue;
  /** New state (for creates/updates) */
  newValue?: JsonValue;
  /** Additional context */
  metadata?: JsonValue;
  /** Result status */
  status?: AUDIT_STATUS;
  /** Error message if status is FAILURE */
  errorMessage?: string;
}

/** Helper to safely convert data to JSON value */
function toJsonValue(data: unknown): JsonValue | undefined {
  if (data === undefined || data === null) return undefined;
  return JSON.parse(JSON.stringify(data)) as JsonValue;
}

/**
 * Extract client IP address from Express request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

/**
 * Extract user agent from Express request
 */
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Create an audit log entry in the database
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        actorRoles: params.actorRoles || [],
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        previousValue: params.previousValue || undefined,
        newValue: params.newValue || undefined,
        metadata: params.metadata || undefined,
        status: params.status || AUDIT_STATUS.SUCCESS,
        errorMessage: params.errorMessage,
      },
    });
  } catch (error) {
    // Log the error but don't throw - audit logging should not break the main flow
    logger.error('Failed to create audit log:', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Helper to create audit log from an Express request context
 * Extracts IP, user agent, and user info automatically
 */
export async function auditFromRequest(
  req: Request,
  params: Omit<AuditLogParams, 'actorId' | 'actorEmail' | 'actorRoles' | 'ipAddress' | 'userAgent'>
): Promise<void> {
  const user = req.user;
  
  await createAuditLog({
    ...params,
    actorId: user?.id,
    actorEmail: user?.email,
    actorRoles: user?.roles,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
  });
}

/**
 * Audit helper for authentication events
 */
export const auditAuth = {
  login: async (req: Request, userId: string, email: string, success: boolean) => {
    await createAuditLog({
      actorId: userId,
      actorEmail: email,
      action: success ? AUDIT_ACTION.LOGIN : AUDIT_ACTION.LOGIN_FAILED,
      entityType: AUDIT_ENTITY_TYPE.SESSION,
      entityId: userId,
      description: success ? `User ${email} logged in` : `Failed login attempt for ${email}`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      status: success ? AUDIT_STATUS.SUCCESS : AUDIT_STATUS.FAILURE,
    });
  },
  
  logout: async (req: Request) => {
    const user = req.user;
    await createAuditLog({
      actorId: user?.id,
      actorEmail: user?.email,
      actorRoles: user?.roles,
      action: AUDIT_ACTION.LOGOUT,
      entityType: AUDIT_ENTITY_TYPE.SESSION,
      entityId: user?.id,
      description: `User ${user?.email} logged out`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  },
  
  passwordChanged: async (req: Request, userId: string) => {
    const user = req.user;
    await createAuditLog({
      actorId: user?.id || userId,
      actorEmail: user?.email,
      actorRoles: user?.roles,
      action: AUDIT_ACTION.PASSWORD_CHANGED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      description: `Password changed for user ${user?.email || userId}`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  },
  
  passwordResetRequested: async (req: Request, userId: string) => {
    await createAuditLog({
      actorId: userId,
      actorEmail: undefined,
      actorRoles: undefined,
      action: AUDIT_ACTION.PASSWORD_RESET_REQUESTED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      description: `Password reset requested for user ${userId}`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  },
  
  passwordReset: async (req: Request, userId: string) => {
    await createAuditLog({
      actorId: userId,
      actorEmail: undefined,
      actorRoles: undefined,
      action: AUDIT_ACTION.PASSWORD_RESET_COMPLETED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      description: `Password reset completed for user ${userId}`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });
  },
};

/**
 * Audit helper for request operations
 */
export const auditRequest = {
  created: async (req: Request, requestId: string, requestData: Record<string, unknown>) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.REQUEST_CREATED,
      entityType: AUDIT_ENTITY_TYPE.REQUEST,
      entityId: requestId,
      description: `New request created: ${requestId}`,
      newValue: toJsonValue(requestData),
    });
  },
  
  statusChanged: async (
    req: Request,
    requestId: string,
    oldStatus: string,
    newStatus: string,
    reason?: string
  ) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.REQUEST_STATUS_CHANGED,
      entityType: AUDIT_ENTITY_TYPE.REQUEST,
      entityId: requestId,
      description: `Request ${requestId} status changed from ${oldStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
      previousValue: toJsonValue({ status: oldStatus }),
      newValue: toJsonValue({ status: newStatus, reason }),
      // Store in metadata for easy access in timeline
      metadata: toJsonValue({ 
        fromStatus: oldStatus, 
        toStatus: newStatus, 
        reason: reason || null 
      }),
    });
  },
  
  updated: async (
    req: Request,
    requestId: string,
    changes: Record<string, unknown>,
    previousValues?: Record<string, unknown>
  ) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.REQUEST_UPDATED,
      entityType: AUDIT_ENTITY_TYPE.REQUEST,
      entityId: requestId,
      description: `Request ${requestId} updated`,
      previousValue: toJsonValue(previousValues),
      newValue: toJsonValue(changes),
    });
  },
};

/**
 * Audit helper for loan operations
 */
export const auditLoan = {
  created: async (req: Request, loanId: string, loanData: Record<string, unknown>) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.LOAN_CREATED,
      entityType: AUDIT_ENTITY_TYPE.LOAN,
      entityId: loanId,
      description: `Loan created: ${loanId}`,
      newValue: toJsonValue(loanData),
    });
  },
  
  disbursed: async (req: Request, loanId: string, amount: number) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.LOAN_DISBURSED,
      entityType: AUDIT_ENTITY_TYPE.LOAN,
      entityId: loanId,
      description: `Loan ${loanId} disbursed: ₹${amount.toLocaleString()}`,
      newValue: toJsonValue({ amount, disbursedAt: new Date().toISOString() }),
    });
  },
  
  statusChanged: async (req: Request, loanId: string, oldStatus: string, newStatus: string) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.LOAN_STATUS_CHANGED,
      entityType: AUDIT_ENTITY_TYPE.LOAN,
      entityId: loanId,
      description: `Loan ${loanId} status changed from ${oldStatus} to ${newStatus}`,
      previousValue: toJsonValue({ status: oldStatus }),
      newValue: toJsonValue({ status: newStatus }),
    });
  },
};

/**
 * Audit helper for payment operations
 */
export const auditPayment = {
  initiated: async (req: Request, paymentId: string, amount: number, emiId?: string) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.PAYMENT_INITIATED,
      entityType: AUDIT_ENTITY_TYPE.PAYMENT,
      entityId: paymentId,
      description: `Payment initiated: ₹${amount.toLocaleString()}${emiId ? ` for EMI ${emiId}` : ''}`,
      newValue: toJsonValue({ amount, emiId }),
    });
  },
  
  completed: async (req: Request, paymentId: string, amount: number) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.PAYMENT_COMPLETED,
      entityType: AUDIT_ENTITY_TYPE.PAYMENT,
      entityId: paymentId,
      description: `Payment completed: ₹${amount.toLocaleString()}`,
      newValue: toJsonValue({ amount, completedAt: new Date().toISOString() }),
    });
  },
  
  failed: async (req: Request, paymentId: string, reason: string) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.PAYMENT_FAILED,
      entityType: AUDIT_ENTITY_TYPE.PAYMENT,
      entityId: paymentId,
      description: `Payment failed: ${reason}`,
      status: AUDIT_STATUS.FAILURE,
      errorMessage: reason,
    });
  },
};

/**
 * Audit helper for user operations
 */
export const auditUser = {
  created: async (req: Request, userId: string, userData: Record<string, unknown>) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.USER_CREATED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      description: `User created: ${userData.email || userId}`,
      newValue: toJsonValue({ ...userData, password: '[REDACTED]' }),
    });
  },
  
  updated: async (
    req: Request,
    userId: string,
    changes: Record<string, unknown>,
    previousValues?: Record<string, unknown>
  ) => {
    // Redact sensitive fields
    const safeChanges = { ...changes };
    const safePrevious = previousValues ? { ...previousValues } : undefined;
    if ('password' in safeChanges) safeChanges.password = '[REDACTED]';
    if (safePrevious && 'password' in safePrevious) safePrevious.password = '[REDACTED]';
    
    await auditFromRequest(req, {
      action: AUDIT_ACTION.USER_UPDATED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      description: `User ${userId} updated`,
      previousValue: toJsonValue(safePrevious),
      newValue: toJsonValue(safeChanges),
    });
  },
  
  roleChanged: async (req: Request, userId: string, oldRoles: string[], newRoles: string[]) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.USER_ROLE_CHANGED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      description: `User ${userId} roles changed from [${oldRoles.join(', ')}] to [${newRoles.join(', ')}]`,
      previousValue: toJsonValue({ roles: oldRoles }),
      newValue: toJsonValue({ roles: newRoles }),
    });
  },
  
  deleted: async (req: Request, userId: string, userData: Record<string, unknown>) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.USER_DELETED,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      description: `User deleted: ${userData.email || userId}`,
      previousValue: toJsonValue({ ...userData, password: '[REDACTED]' }),
    });
  },
};

/**
 * Audit helper for document operations
 */
export const auditDocument = {
  uploaded: async (
    req: Request, 
    documentId: string, 
    documentType: string, 
    requestId?: string,
    fileName?: string,
    category?: string
  ) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.DOCUMENT_UPLOADED,
      entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
      entityId: documentId,
      description: `Document uploaded: ${fileName || documentType}${requestId ? ` for request ${requestId}` : ''}`,
      newValue: toJsonValue({ documentType, requestId, fileName, category }),
      // Store in metadata for easy access in timeline
      metadata: toJsonValue({ 
        fileName: fileName || documentType, 
        category: category || documentType,
        requestId 
      }),
    });
  },
  
  deleted: async (req: Request, documentId: string) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.DOCUMENT_DELETED,
      entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
      entityId: documentId,
      description: `Document deleted: ${documentId}`,
    });
  },
  
  verified: async (req: Request, documentId: string, isVerified: boolean) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.DOCUMENT_VERIFIED,
      entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
      entityId: documentId,
      description: `Document ${documentId} ${isVerified ? 'verified' : 'unverified'}`,
      newValue: toJsonValue({ isVerified }),
    });
  },
};

/**
 * Audit helper for offer operations
 */
export const auditOffer = {
  created: async (req: Request, requestId: string, offerData: Record<string, unknown>) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.OFFER_CREATED,
      entityType: AUDIT_ENTITY_TYPE.OFFER,
      entityId: requestId,
      description: `Offer created for request ${requestId}`,
      newValue: toJsonValue(offerData),
    });
  },
  
  accepted: async (req: Request, requestId: string) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.OFFER_ACCEPTED,
      entityType: AUDIT_ENTITY_TYPE.OFFER,
      entityId: requestId,
      description: `Offer accepted for request ${requestId}`,
    });
  },
  
  declined: async (req: Request, requestId: string, reason?: string) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.OFFER_DECLINED,
      entityType: AUDIT_ENTITY_TYPE.OFFER,
      entityId: requestId,
      description: `Offer declined for request ${requestId}${reason ? `: ${reason}` : ''}`,
      metadata: reason ? toJsonValue({ declineReason: reason }) : undefined,
    });
  },
};

/**
 * Audit helper for inspection operations
 */
export const auditInspection = {
  agentAssigned: async (req: Request, requestId: string, agentId: string, agentEmail: string) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.AGENT_ASSIGNED,
      entityType: AUDIT_ENTITY_TYPE.INSPECTION,
      entityId: requestId,
      description: `Agent ${agentEmail} assigned to request ${requestId}`,
      newValue: toJsonValue({ agentId, agentEmail }),
    });
  },
  
  scheduled: async (req: Request, requestId: string, scheduledDate: string) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.INSPECTION_SCHEDULED,
      entityType: AUDIT_ENTITY_TYPE.INSPECTION,
      entityId: requestId,
      description: `Inspection scheduled for request ${requestId} on ${scheduledDate}`,
      newValue: toJsonValue({ scheduledDate }),
    });
  },
  
  completed: async (req: Request, requestId: string, result: Record<string, unknown>) => {
    await auditFromRequest(req, {
      action: AUDIT_ACTION.INSPECTION_COMPLETED,
      entityType: AUDIT_ENTITY_TYPE.INSPECTION,
      entityId: requestId,
      description: `Inspection completed for request ${requestId}`,
      newValue: toJsonValue(result),
    });
  },
};

export default {
  createAuditLog,
  auditFromRequest,
  auth: auditAuth,
  request: auditRequest,
  loan: auditLoan,
  payment: auditPayment,
  user: auditUser,
  document: auditDocument,
  offer: auditOffer,
  inspection: auditInspection,
};

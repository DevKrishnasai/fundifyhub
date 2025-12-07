/**
 * Audit utility for API layer
 * 
 * Re-exports the main audit utility from utils/audit.ts
 * Provides convenient helpers for common audit scenarios.
 */

import { Request } from 'express';
import { createAuditLog, auditAuth, auditUser, auditRequest, auditLoan, auditPayment, auditDocument, auditInspection } from '../../utils/audit';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '@fundifyhub/types';

// Re-export all audit helpers
export { auditAuth, auditUser, auditRequest, auditLoan, auditPayment, auditDocument, auditInspection };

/**
 * Simple audit log helper for API controllers
 */
export async function logAudit(params: {
  req: Request;
  action: AUDIT_ACTION;
  entityType: AUDIT_ENTITY_TYPE;
  entityId?: string;
  description: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  status?: AUDIT_STATUS;
  errorMessage?: string;
}): Promise<void> {
  const user = params.req.user;
  
  // Convert values to JSON-compatible format
  const toJsonValue = (value: unknown) => {
    if (value === undefined || value === null) return undefined;
    return JSON.parse(JSON.stringify(value));
  };
  
  await createAuditLog({
    actorId: user?.id,
    actorEmail: user?.email,
    actorRoles: user?.roles,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    ipAddress: params.req.ip,
    userAgent: params.req.get('user-agent'),
    previousValue: toJsonValue(params.previousValue),
    newValue: toJsonValue(params.newValue),
    metadata: toJsonValue(params.metadata),
    status: params.status || AUDIT_STATUS.SUCCESS,
    errorMessage: params.errorMessage,
  });
}

export default {
  logAudit,
  auditAuth,
  auditUser,
  auditRequest,
  auditLoan,
  auditPayment,
  auditDocument,
  auditInspection,
};

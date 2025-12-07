/**
 * Audit-related types
 */

export interface AuditLogDTO {
  id: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRoles: string[];
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  status: string;
  errorMessage?: string | null;
  createdAt: Date | string;
}

export interface CreateAuditLogInput {
  actorId?: string;
  actorEmail?: string;
  actorRoles: string[];
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: string;
  errorMessage?: string;
}

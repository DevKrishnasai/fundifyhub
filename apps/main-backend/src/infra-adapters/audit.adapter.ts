/**
 * Audit Adapter
 * 
 * Wraps audit logging provider.
 * Records all significant actions for compliance and debugging.
 * 
 * @module infra-adapters/audit
 */

interface AuditLogEntry {
  id: string;
  actor: string; // userId
  action: string; // 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
  entityType: string; // 'User', 'Loan', 'Request', etc.
  entityId: string;
  changes?: Record<string, { before: any; after: any }>;
  metadata?: Record<string, any>; // IP, user agent, etc.
  timestamp: Date;
  status: 'success' | 'failure';
}

/**
 * Audit logging wrapper for compliance and debugging
 * 
 * In production: write to persistent audit log (database or external service)
 * For now: stub implementation with TODO markers
 */
export class AuditAdapter {
  /**
   * Log a user action
   * 
   * @param actor - User ID performing the action
   * @param action - Action type (CREATE, UPDATE, DELETE, LOGIN, etc.)
   * @param entityType - Type of entity being acted upon
   * @param entityId - ID of the entity
   * @param metadata - Additional context (IP, user agent, etc.)
   * 
   * @example
   * ```ts
   * await auditAdapter.logAction(
   *   userId,
   *   'CREATE',
   *   'Loan',
   *   loanId,
   *   { ip: req.ip, userAgent: req.headers['user-agent'] }
   * )
   * ```
   */
  async logAction(
    actor: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // TODO: (agent) Create audit log entry
      // TODO: (agent) Store in database/external audit service
      // TODO: (agent) Include timestamp, status='success'
      // TODO: (agent) Handle errors gracefully (audit is optional)

      console.log('[AuditAdapter] Action logged (stub):', {
        actor,
        action,
        entityType,
        entityId,
      });
    } catch (err) {
      console.error('[AuditAdapter] Failed to log action:', err);
      // Don't re-throw - audit is optional
    }
  }

  /**
   * Log changes to an entity
   * 
   * @param actor - User ID performing the change
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @param changes - Map of field changes { fieldName: { before, after } }
   * @param metadata - Additional context
   * 
   * @example
   * ```ts
   * await auditAdapter.logChange(
   *   userId,
   *   'Loan',
   *   loanId,
   *   {
   *     status: { before: 'ACTIVE', after: 'PAID_OFF' },
   *     lastPaymentDate: { before: '2024-01-01', after: '2024-12-01' }
   *   }
   * )
   * ```
   */
  async logChange(
    actor: string,
    entityType: string,
    entityId: string,
    changes: Record<string, { before: any; after: any }>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // TODO: (agent) Create audit log entry with changes
      // TODO: (agent) Store in database/external audit service
      // TODO: (agent) Include timestamp, status='success'
      // TODO: (agent) Preserve before/after values for audit trail

      console.log('[AuditAdapter] Change logged (stub):', {
        actor,
        entityType,
        entityId,
        changeCount: Object.keys(changes).length,
      });
    } catch (err) {
      console.error('[AuditAdapter] Failed to log change:', err);
      // Don't re-throw - audit is optional
    }
  }

  /**
   * Log access event
   * 
   * Records when user accesses sensitive data
   * 
   * @param actor - User ID
   * @param resourceType - Type of resource accessed
   * @param resourceId - ID of resource
   * @param permission - Permission granted (VIEW, EDIT, DELETE, etc.)
   * @param metadata - Additional context
   */
  async logAccess(
    actor: string,
    resourceType: string,
    resourceId: string,
    permission: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // TODO: (agent) Create audit log entry for access
      // TODO: (agent) Store in database/external audit service
      // TODO: (agent) Use for generating access reports

      console.log('[AuditAdapter] Access logged (stub):', {
        actor,
        resourceType,
        resourceId,
        permission,
      });
    } catch (err) {
      console.error('[AuditAdapter] Failed to log access:', err);
      // Don't re-throw - audit is optional
    }
  }

  /**
   * Get audit logs for entity
   * 
   * @param entityType - Type of entity
   * @param entityId - ID of entity
   * @param limit - Max number of logs to return
   * @returns List of audit log entries
   */
  async getEntityAuditLog(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    try {
      // TODO: (agent) Query database/audit service
      // TODO: (agent) Filter by entityType and entityId
      // TODO: (agent) Sort by timestamp descending
      // TODO: (agent) Limit results

      console.log('[AuditAdapter] Entity audit log retrieved (stub):', {
        entityType,
        entityId,
        limit,
      });

      return [];
    } catch (err) {
      console.error('[AuditAdapter] Failed to get entity audit log:', err);
      return [];
    }
  }

  /**
   * Get audit logs for user actions
   * 
   * @param actor - User ID
   * @param limit - Max number of logs to return
   * @returns List of audit log entries
   */
  async getUserAuditLog(actor: string, limit: number = 50): Promise<AuditLogEntry[]> {
    try {
      // TODO: (agent) Query database/audit service
      // TODO: (agent) Filter by actor
      // TODO: (agent) Sort by timestamp descending
      // TODO: (agent) Limit results

      console.log('[AuditAdapter] User audit log retrieved (stub):', {
        actor,
        limit,
      });

      return [];
    } catch (err) {
      console.error('[AuditAdapter] Failed to get user audit log:', err);
      return [];
    }
  }

  /**
   * Log failed access attempt (security)
   * 
   * Records failed login attempts, permission denials, etc.
   * 
   * @param actor - User ID (may be unknown for login failures)
   * @param action - Failed action
   * @param reason - Reason for failure
   * @param metadata - Additional context (IP, user agent, etc.)
   */
  async logFailure(
    actor: string,
    action: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // TODO: (agent) Create audit log entry with status='failure'
      // TODO: (agent) Include failure reason
      // TODO: (agent) Store in database/external audit service
      // TODO: (agent) Use for security monitoring/alerts

      console.log('[AuditAdapter] Failure logged (stub):', {
        actor,
        action,
        reason,
      });
    } catch (err) {
      console.error('[AuditAdapter] Failed to log failure:', err);
      // Don't re-throw - audit is optional
    }
  }
}

export const auditAdapter = new AuditAdapter();

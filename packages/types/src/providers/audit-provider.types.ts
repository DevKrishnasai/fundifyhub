/**
 * Audit Provider Types for FundifyHub
 *
 * These types define the audit logging framework interface.
 * Audit logs are immutable records of all system activities.
 *
 * @packageDocumentation
 */

// ============================================================================
// Audit Action Types
// ============================================================================

/**
 * Categories of audit actions
 */
export type AuditActionCategory =
  | 'AUTH'        // Authentication events
  | 'CRUD'        // Create, Read, Update, Delete operations
  | 'WORKFLOW'    // Stage/status transitions
  | 'PAYMENT'     // Payment operations
  | 'DOCUMENT'    // Document upload/download/delete
  | 'NOTIFICATION'// Notification sending
  | 'ADMIN'       // Administrative actions
  | 'SYSTEM';     // System-level events

/**
 * Specific audit actions
 */
export type AuditAction =
  // Authentication
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'OTP_SENT'
  | 'OTP_VERIFIED'
  | 'TOKEN_REFRESHED'
  // CRUD operations
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'BULK_CREATE'
  | 'BULK_UPDATE'
  | 'BULK_DELETE'
  // Workflow
  | 'STAGE_TRANSITION'
  | 'STATUS_CHANGE'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUBMITTED'
  // Payment
  | 'PAYMENT_INITIATED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_VERIFIED'
  // Document
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DOWNLOADED'
  | 'DOCUMENT_DELETED'
  | 'DOCUMENT_SIGNED'
  // Notification
  | 'NOTIFICATION_SENT'
  | 'NOTIFICATION_FAILED'
  | 'NOTIFICATION_READ'
  // Admin
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'SETTINGS_UPDATED'
  | 'SYSTEM_CONFIG_CHANGED'
  // System
  | 'SYSTEM_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SECURITY_EVENT'
  | 'CRON_EXECUTED';

/**
 * Resource types that can be audited
 */
export type AuditResourceType =
  | 'USER'
  | 'REQUEST'
  | 'LOAN'
  | 'PAYMENT'
  | 'EMI'
  | 'DOCUMENT'
  | 'ASSET'
  | 'AUCTION'
  | 'BID'
  | 'WAREHOUSE'
  | 'NOTIFICATION'
  | 'SETTING'
  | 'GEOGRAPHY'
  | 'SYSTEM';

/**
 * Audit severity levels
 */
export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ============================================================================
// Audit Entry Types
// ============================================================================

/**
 * Actor information (who performed the action)
 */
export interface AuditActor {
  /** User ID (null for system actions) */
  userId: string | null;
  /** User email (for display) */
  email?: string;
  /** User's roles at time of action */
  roles: string[];
  /** Is this a system/automated action */
  isSystem: boolean;
}

/**
 * Request context for the audit entry
 */
export interface AuditRequestContext {
  /** IP address of the request */
  ipAddress: string;
  /** User agent string */
  userAgent: string;
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** Request ID for correlation */
  requestId?: string;
  /** Session ID if available */
  sessionId?: string;
}

/**
 * Change tracking for update operations
 */
export interface AuditChange {
  /** Field that was changed */
  field: string;
  /** Previous value (serialized) */
  oldValue: unknown;
  /** New value (serialized) */
  newValue: unknown;
}

/**
 * Core audit entry data to be logged
 */
export interface AuditEntryData {
  /** Action performed */
  action: AuditAction;
  /** Category of the action */
  category: AuditActionCategory;
  /** Type of resource affected */
  resourceType: AuditResourceType;
  /** ID of the affected resource */
  resourceId: string;
  /** Human-readable description */
  description: string;
  /** Actor who performed the action */
  actor: AuditActor;
  /** Request context */
  context?: AuditRequestContext;
  /** Changes made (for updates) */
  changes?: AuditChange[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Severity level */
  severity?: AuditSeverity;
  /** Related resource IDs (e.g., loan linked to request) */
  relatedResources?: Array<{
    type: AuditResourceType;
    id: string;
  }>;
}

/**
 * Complete audit entry stored in database
 */
export interface AuditEntry extends AuditEntryData {
  /** Unique ID of the audit entry */
  id: string;
  /** Timestamp when event occurred */
  timestamp: Date;
  /** Timestamp when entry was created (may differ due to async processing) */
  createdAt: Date;
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Filters for querying audit logs
 */
export interface AuditQueryFilters {
  /** Filter by actor user ID */
  actorId?: string;
  /** Filter by action type */
  action?: AuditAction | AuditAction[];
  /** Filter by category */
  category?: AuditActionCategory | AuditActionCategory[];
  /** Filter by resource type */
  resourceType?: AuditResourceType | AuditResourceType[];
  /** Filter by specific resource ID */
  resourceId?: string;
  /** Filter by severity */
  severity?: AuditSeverity | AuditSeverity[];
  /** Start date range */
  startDate?: Date;
  /** End date range */
  endDate?: Date;
  /** Search in description */
  search?: string;
  /** Filter by IP address */
  ipAddress?: string;
}

/**
 * Pagination options
 */
export interface AuditPagination {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field */
  sortBy?: 'timestamp' | 'createdAt' | 'severity';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface AuditPaginatedResult {
  /** Audit entries */
  entries: AuditEntry[];
  /** Total count matching filters */
  total: number;
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Total pages */
  totalPages: number;
  /** Has more pages */
  hasMore: boolean;
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Audit provider types
 */
export type AuditProviderType = 'prisma' | 'elasticsearch' | 'mongodb';

/**
 * Audit provider configuration
 */
export interface AuditProviderConfig {
  /** Provider type */
  type: AuditProviderType;
  /** Enable async logging (non-blocking) */
  async?: boolean;
  /** Batch size for bulk inserts */
  batchSize?: number;
  /** Flush interval in ms for batched writes */
  flushInterval?: number;
  /** Retention period in days (auto-cleanup) */
  retentionDays?: number;
  /** Fields to mask in logs (e.g., 'password', 'token') */
  maskFields?: string[];
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Result of logging an audit entry
 */
export interface AuditLogResult {
  /** Whether logging succeeded */
  success: boolean;
  /** ID of created entry (if sync) */
  entryId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Audit provider interface
 * Implementations: PrismaAuditProvider, ElasticsearchAuditProvider (future)
 */
export interface IAuditProvider {
  /**
   * Log a single audit entry
   * @param entry - Audit entry data to log
   * @returns Result of the logging operation
   */
  log(entry: AuditEntryData): Promise<AuditLogResult>;

  /**
   * Log multiple audit entries in batch
   * @param entries - Array of audit entries
   * @returns Results for each entry
   */
  logBatch(entries: AuditEntryData[]): Promise<AuditLogResult[]>;

  /**
   * Query audit logs with filters and pagination
   * @param filters - Query filters
   * @param pagination - Pagination options
   * @returns Paginated audit entries
   */
  query(
    filters?: AuditQueryFilters,
    pagination?: AuditPagination
  ): Promise<AuditPaginatedResult>;

  /**
   * Get a single audit entry by ID
   * @param id - Audit entry ID
   * @returns Audit entry or null
   */
  getById(id: string): Promise<AuditEntry | null>;

  /**
   * Get all audit entries for a specific resource
   * @param resourceType - Type of resource
   * @param resourceId - ID of the resource
   * @param pagination - Pagination options
   * @returns Paginated audit entries
   */
  getByResource(
    resourceType: AuditResourceType,
    resourceId: string,
    pagination?: AuditPagination
  ): Promise<AuditPaginatedResult>;

  /**
   * Get audit entries by actor (user)
   * @param actorId - User ID
   * @param pagination - Pagination options
   * @returns Paginated audit entries
   */
  getByActor(
    actorId: string,
    pagination?: AuditPagination
  ): Promise<AuditPaginatedResult>;

  /**
   * Count entries matching filters (for analytics)
   * @param filters - Query filters
   * @returns Count of matching entries
   */
  count(filters?: AuditQueryFilters): Promise<number>;

  /**
   * Cleanup old entries based on retention policy
   * @param beforeDate - Delete entries before this date
   * @returns Number of deleted entries
   */
  cleanup(beforeDate: Date): Promise<number>;

  /**
   * Flush any pending batched entries
   * Call this before shutdown
   */
  flush(): Promise<void>;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Create audit entry helper - auth events
 */
export interface CreateAuthAuditEntry {
  action: Extract<AuditAction, 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_COMPLETED' | 'OTP_SENT' | 'OTP_VERIFIED' | 'TOKEN_REFRESHED'>;
  userId: string | null;
  email?: string;
  success: boolean;
  context: AuditRequestContext;
  metadata?: Record<string, unknown>;
}

/**
 * Create audit entry helper - CRUD events
 */
export interface CreateCrudAuditEntry {
  action: Extract<AuditAction, 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'>;
  resourceType: AuditResourceType;
  resourceId: string;
  actor: AuditActor;
  context: AuditRequestContext;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
}

/**
 * Create audit entry helper - workflow events
 */
export interface CreateWorkflowAuditEntry {
  action: Extract<AuditAction, 'STAGE_TRANSITION' | 'STATUS_CHANGE' | 'ASSIGNED' | 'APPROVED' | 'REJECTED'>;
  resourceType: AuditResourceType;
  resourceId: string;
  actor: AuditActor;
  context: AuditRequestContext;
  fromState?: string;
  toState: string;
  metadata?: Record<string, unknown>;
}

/**
 * Express request type extension for audit context
 */
export interface AuditableRequest {
  /** Unique request ID */
  requestId: string;
  /** User from auth middleware */
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  /** Client IP */
  ip: string;
  /** User agent */
  headers: {
    'user-agent'?: string;
  };
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** Original URL */
  originalUrl: string;
}

// ============================================================================
// Utility Functions (to be implemented in providers package)
// ============================================================================

/**
 * Get action category from action type
 */
export function getActionCategory(action: AuditAction): AuditActionCategory {
  const categoryMap: Record<string, AuditActionCategory> = {
    LOGIN: 'AUTH',
    LOGOUT: 'AUTH',
    LOGIN_FAILED: 'AUTH',
    PASSWORD_RESET_REQUESTED: 'AUTH',
    PASSWORD_RESET_COMPLETED: 'AUTH',
    OTP_SENT: 'AUTH',
    OTP_VERIFIED: 'AUTH',
    TOKEN_REFRESHED: 'AUTH',
    CREATE: 'CRUD',
    READ: 'CRUD',
    UPDATE: 'CRUD',
    DELETE: 'CRUD',
    BULK_CREATE: 'CRUD',
    BULK_UPDATE: 'CRUD',
    BULK_DELETE: 'CRUD',
    STAGE_TRANSITION: 'WORKFLOW',
    STATUS_CHANGE: 'WORKFLOW',
    ASSIGNED: 'WORKFLOW',
    UNASSIGNED: 'WORKFLOW',
    APPROVED: 'WORKFLOW',
    REJECTED: 'WORKFLOW',
    SUBMITTED: 'WORKFLOW',
    PAYMENT_INITIATED: 'PAYMENT',
    PAYMENT_COMPLETED: 'PAYMENT',
    PAYMENT_FAILED: 'PAYMENT',
    PAYMENT_REFUNDED: 'PAYMENT',
    PAYMENT_VERIFIED: 'PAYMENT',
    DOCUMENT_UPLOADED: 'DOCUMENT',
    DOCUMENT_DOWNLOADED: 'DOCUMENT',
    DOCUMENT_DELETED: 'DOCUMENT',
    DOCUMENT_SIGNED: 'DOCUMENT',
    NOTIFICATION_SENT: 'NOTIFICATION',
    NOTIFICATION_FAILED: 'NOTIFICATION',
    NOTIFICATION_READ: 'NOTIFICATION',
    USER_CREATED: 'ADMIN',
    USER_UPDATED: 'ADMIN',
    USER_DELETED: 'ADMIN',
    USER_ROLE_CHANGED: 'ADMIN',
    SETTINGS_UPDATED: 'ADMIN',
    SYSTEM_CONFIG_CHANGED: 'ADMIN',
    SYSTEM_ERROR: 'SYSTEM',
    RATE_LIMIT_EXCEEDED: 'SYSTEM',
    SECURITY_EVENT: 'SYSTEM',
    CRON_EXECUTED: 'SYSTEM',
  };
  
  return categoryMap[action] || 'SYSTEM';
}

/**
 * Get default severity for action type
 */
export function getDefaultSeverity(action: AuditAction): AuditSeverity {
  const highSeverity: AuditAction[] = [
    'DELETE', 'BULK_DELETE', 'USER_DELETED', 'SYSTEM_CONFIG_CHANGED',
    'PASSWORD_RESET_COMPLETED', 'USER_ROLE_CHANGED', 'PAYMENT_REFUNDED',
  ];
  
  const criticalSeverity: AuditAction[] = [
    'SECURITY_EVENT', 'SYSTEM_ERROR',
  ];
  
  const mediumSeverity: AuditAction[] = [
    'CREATE', 'UPDATE', 'STAGE_TRANSITION', 'APPROVED', 'REJECTED',
    'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'LOGIN_FAILED',
  ];
  
  if (criticalSeverity.includes(action)) return 'CRITICAL';
  if (highSeverity.includes(action)) return 'HIGH';
  if (mediumSeverity.includes(action)) return 'MEDIUM';
  return 'LOW';
}

import { CacheProviderType, PaymentProviderType, ManualPaymentMethod, StorageProviderType } from './enums';

// ============================================================================
// AUDIT PROVIDER TYPES
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
 */
export interface IAuditProvider {
  log(entry: AuditEntryData): Promise<AuditLogResult>;
  logBatch(entries: AuditEntryData[]): Promise<AuditLogResult[]>;
  query(filters?: AuditQueryFilters, pagination?: AuditPagination): Promise<AuditPaginatedResult>;
  getById(id: string): Promise<AuditEntry | null>;
  getByResource(resourceType: AuditResourceType, resourceId: string, pagination?: AuditPagination): Promise<AuditPaginatedResult>;
  getByActor(actorId: string, pagination?: AuditPagination): Promise<AuditPaginatedResult>;
  count(filters?: AuditQueryFilters): Promise<number>;
  cleanup(beforeDate: Date): Promise<number>;
  flush(): Promise<void>;
}

// ============================================================================
// CACHE PROVIDER TYPES
// ============================================================================

export interface CacheSetOptions {
  ttl?: number;
  nx?: boolean;
  xx?: boolean;
}

export interface CacheGetResult<T = unknown> {
  found: boolean;
  value?: T;
  ttl?: number;
}

export interface CacheSetResult {
  success: boolean;
  error?: string;
}

export interface CacheDeleteResult {
  success: boolean;
  deletedCount: number;
}

export interface CacheExistsResult {
  exists: boolean;
}

export interface CacheBatchGetResult<T = unknown> {
  results: Map<string, CacheGetResult<T>>;
  foundCount: number;
  missCount: number;
}

export interface CacheBatchSetResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors?: Array<{ key: string; error: string }>;
}

export interface CacheStats {
  keyCount: number;
  memoryUsage?: number;
  hitRate?: number;
  uptime?: number;
}

export interface ICacheProvider {
  readonly type: CacheProviderType;
  readonly name: string;
  isConfigured(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;
  get<T = unknown>(key: string): Promise<CacheGetResult<T>>;
  set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<CacheSetResult>;
  delete(key: string): Promise<CacheDeleteResult>;
  exists(key: string): Promise<CacheExistsResult>;
  ttl(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<boolean>;
  mget<T = unknown>(keys: string[]): Promise<CacheBatchGetResult<T>>;
  mset<T = unknown>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<CacheBatchSetResult>;
  mdelete(keys: string[]): Promise<CacheDeleteResult>;
  deletePattern(pattern: string): Promise<CacheDeleteResult>;
  keys(pattern: string): Promise<string[]>;
  incr(key: string, by?: number): Promise<number>;
  decr(key: string, by?: number): Promise<number>;
  clear(): Promise<void>;
  stats?(): Promise<CacheStats>;
}

// ============================================================================
// PAYMENT PROVIDER TYPES
// ============================================================================

export interface PaymentAmountBreakdown {
  emiAmount: number;
  penalty: number;
  totalAmount: number;
  principal?: number;
  interest?: number;
  daysLate?: number;
}

export interface CreatePaymentOrderInput {
  loanId: string;
  emiId: string;
  emiNumber: number;
  customerId: string;
  requestId: string;
  amount: PaymentAmountBreakdown;
  currency?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  metadata?: Record<string, string>;
}

export interface CreatePaymentOrderResult {
  success: boolean;
  error?: string;
  providerOrderId?: string;
  paymentOrderId?: string;
  amountInSmallestUnit?: number;
  currency?: string;
  expiresAt?: Date;
  providerData?: Record<string, unknown>;
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  isValid: boolean;
  error?: string;
  providerPaymentId?: string;
}

export type WebhookEventType =
  | 'payment.captured'
  | 'payment.failed'
  | 'payment.authorized'
  | 'order.paid'
  | 'refund.created'
  | 'refund.processed'
  | 'refund.failed';

export interface WebhookPayload {
  event: WebhookEventType;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  paymentMethod?: string;
  errorCode?: string;
  errorDescription?: string;
  notes?: Record<string, string>;
  rawPayload: unknown;
}

export interface FetchPaymentInput {
  providerPaymentId: string;
}

export interface FetchPaymentResult {
  success: boolean;
  error?: string;
  paymentId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  method?: string;
  errorCode?: string;
  errorDescription?: string;
  notes?: Record<string, string>;
  email?: string;
  contact?: string;
  rawData?: unknown;
}

export interface RefundInput {
  providerPaymentId: string;
  amount: number;
  reason: string;
  notes?: Record<string, string>;
}

export interface RefundResult {
  success: boolean;
  error?: string;
  providerRefundId?: string;
  status?: 'pending' | 'processed' | 'failed';
  amountRefunded?: number;
}

export interface RecordManualPaymentInput {
  loanId: string;
  emiId: string;
  amount: number;
  method: ManualPaymentMethod;
  referenceNumber?: string;
  collectedBy: string;
  notes?: string;
  collectionDate?: Date;
}

export interface RecordManualPaymentResult {
  success: boolean;
  error?: string;
  paymentId?: string;
  status?: 'pending_verification' | 'verified' | 'rejected';
}

export interface IPaymentProvider {
  readonly type: PaymentProviderType;
  readonly name: string;
  isConfigured(): boolean;
  createOrder(input: CreatePaymentOrderInput): Promise<CreatePaymentOrderResult>;
  verifyPayment?(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  validateWebhookSignature?(payload: string, signature: string): boolean;
  parseWebhookPayload?(rawPayload: unknown): WebhookPayload;
  refund?(input: RefundInput): Promise<RefundResult>;
  fetchPayment?(input: FetchPaymentInput): Promise<FetchPaymentResult>;
}

// ============================================================================
// STORAGE PROVIDER TYPES
// ============================================================================

export interface StorageFileMetadata {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  customMetadata?: Record<string, string>;
}

export interface FileUploadInput {
  content: Buffer | Uint8Array;
  fileName: string;
  mimeType: string;
}

export interface FileUploadResult {
  success: boolean;
  error?: string;
  fileKey?: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
}

export interface SignedUrlOptions {
  expiresIn?: number;
  disposition?: 'inline' | 'attachment';
  downloadFilename?: string;
}

export interface SignedUrlResult {
  success: boolean;
  error?: string;
  url?: string;
  expiresAt?: Date;
}

export interface BatchSignedUrlResult {
  success: boolean;
  results: Array<{
    fileKey: string;
    url: string;
    expiresAt: Date;
    error?: string;
  }>;
  successCount: number;
  failedCount: number;
}

export interface FileDeleteResult {
  success: boolean;
  error?: string;
  fileKey?: string;
}

export interface BatchDeleteResult {
  success: boolean;
  results: Array<{
    fileKey: string;
    deleted: boolean;
    error?: string;
  }>;
  successCount: number;
  failedCount: number;
}

export interface FileListOptions {
  folder?: string;
  limit?: number;
  cursor?: string;
}

export interface FileListResult {
  success: boolean;
  error?: string;
  files?: StorageFileMetadata[];
  nextCursor?: string;
  hasMore?: boolean;
}

export interface IStorageProvider {
  readonly type: StorageProviderType;
  readonly name: string;
  isConfigured(): boolean;
  generateSignedUrl(fileKey: string, options?: SignedUrlOptions): Promise<SignedUrlResult>;
  generateSignedUrls(fileKeys: string[], options?: SignedUrlOptions): Promise<BatchSignedUrlResult>;
  deleteFile(fileKey: string): Promise<FileDeleteResult>;
  deleteFiles(fileKeys: string[]): Promise<BatchDeleteResult>;
  uploadFile?(input: FileUploadInput): Promise<FileUploadResult>;
  listFiles?(options?: FileListOptions): Promise<FileListResult>;
  getFileMetadata?(fileKey: string): Promise<StorageFileMetadata | null>;
}

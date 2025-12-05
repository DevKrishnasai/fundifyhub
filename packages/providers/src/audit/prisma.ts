/**
 * Prisma Audit Provider
 *
 * Implementation of IAuditProvider using Prisma for database storage.
 * Supports batched writes, async logging, and automatic cleanup.
 *
 * @packageDocumentation
 */

import type {
  IAuditProvider,
  AuditProviderConfig,
  AuditEntryData,
  AuditEntry,
  AuditLogResult,
  AuditQueryFilters,
  AuditPagination,
  AuditPaginatedResult,
  AuditResourceType,
  AuditAction,
  AuditActionCategory,
  AuditSeverity,
  getActionCategory,
  getDefaultSeverity,
} from '@fundifyhub/types';

// Re-import utility functions since they're in types
import {
  getActionCategory as getCategory,
  getDefaultSeverity as getSeverity,
} from '@fundifyhub/types';

/**
 * Prisma client type - we use a generic interface to avoid hard dependency
 */
interface PrismaAuditLog {
  id: string;
  action: string;
  category: string;
  resourceType: string;
  resourceId: string;
  description: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRoles: string[];
  actorIsSystem: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
  requestId: string | null;
  sessionId: string | null;
  changes: unknown;
  metadata: unknown;
  severity: string;
  relatedResources: unknown;
  timestamp: Date;
  createdAt: Date;
}

/**
 * Generic Prisma client interface for audit logs
 */
interface PrismaClientWithAudit {
  auditLog: {
    create: (args: { data: Omit<PrismaAuditLog, 'id' | 'createdAt'> }) => Promise<PrismaAuditLog>;
    createMany: (args: { data: Array<Omit<PrismaAuditLog, 'id' | 'createdAt'>> }) => Promise<{ count: number }>;
    findUnique: (args: { where: { id: string } }) => Promise<PrismaAuditLog | null>;
    findMany: (args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, 'asc' | 'desc'>;
      skip?: number;
      take?: number;
    }) => Promise<PrismaAuditLog[]>;
    count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
    deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
  };
}

/**
 * Configuration for PrismaAuditProvider
 */
export interface PrismaAuditProviderConfig extends AuditProviderConfig {
  type: 'prisma';
  /** Prisma client instance */
  prisma: PrismaClientWithAudit;
}

/**
 * Prisma-based audit provider implementation
 */
export class PrismaAuditProvider implements IAuditProvider {
  private readonly prisma: PrismaClientWithAudit;
  private readonly config: PrismaAuditProviderConfig;
  private readonly batchQueue: AuditEntryData[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly maskFields: Set<string>;

  constructor(config: PrismaAuditProviderConfig) {
    this.config = {
      async: true,
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      retentionDays: 90,
      maskFields: ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'],
      debug: false,
      ...config,
    };
    this.prisma = config.prisma;
    this.maskFields = new Set(this.config.maskFields ?? []);

    // Start flush timer for batched writes
    if (this.config.async && this.config.flushInterval) {
      this.startFlushTimer();
    }
  }

  /**
   * Log a single audit entry
   */
  async log(entry: AuditEntryData): Promise<AuditLogResult> {
    try {
      const maskedEntry = this.maskSensitiveData(entry);
      
      if (this.config.async) {
        // Add to batch queue
        this.batchQueue.push(maskedEntry);
        
        // Flush if batch is full
        if (this.batchQueue.length >= (this.config.batchSize ?? 100)) {
          await this.flush();
        }
        
        return { success: true };
      }

      // Synchronous write
      const dbEntry = await this.createEntry(maskedEntry);
      return { success: true, entryId: dbEntry.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (this.config.debug) {
        console.error('[PrismaAuditProvider] Failed to log entry:', message);
      }
      return { success: false, error: message };
    }
  }

  /**
   * Log multiple audit entries in batch
   */
  async logBatch(entries: AuditEntryData[]): Promise<AuditLogResult[]> {
    const results: AuditLogResult[] = [];
    
    try {
      const maskedEntries = entries.map(e => this.maskSensitiveData(e));
      const dbData = maskedEntries.map(e => this.toDbFormat(e));
      
      await this.prisma.auditLog.createMany({ data: dbData });
      
      return entries.map(() => ({ success: true }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (this.config.debug) {
        console.error('[PrismaAuditProvider] Batch log failed:', message);
      }
      return entries.map(() => ({ success: false, error: message }));
    }
  }

  /**
   * Query audit logs with filters and pagination
   */
  async query(
    filters?: AuditQueryFilters,
    pagination?: AuditPagination
  ): Promise<AuditPaginatedResult> {
    const where = this.buildWhereClause(filters);
    const { page = 1, limit = 50, sortBy = 'timestamp', sortOrder = 'desc' } = pagination ?? {};
    
    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      entries: entries.map(e => this.fromDbFormat(e)),
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Get a single audit entry by ID
   */
  async getById(id: string): Promise<AuditEntry | null> {
    const entry = await this.prisma.auditLog.findUnique({ where: { id } });
    return entry ? this.fromDbFormat(entry) : null;
  }

  /**
   * Get all audit entries for a specific resource
   */
  async getByResource(
    resourceType: AuditResourceType,
    resourceId: string,
    pagination?: AuditPagination
  ): Promise<AuditPaginatedResult> {
    return this.query(
      { resourceType, resourceId },
      pagination
    );
  }

  /**
   * Get audit entries by actor (user)
   */
  async getByActor(
    actorId: string,
    pagination?: AuditPagination
  ): Promise<AuditPaginatedResult> {
    return this.query(
      { actorId },
      pagination
    );
  }

  /**
   * Count entries matching filters
   */
  async count(filters?: AuditQueryFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.auditLog.count({ where });
  }

  /**
   * Cleanup old entries based on retention policy
   */
  async cleanup(beforeDate: Date): Promise<number> {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: beforeDate },
      },
    });
    
    if (this.config.debug) {
      console.log(`[PrismaAuditProvider] Cleaned up ${result.count} old entries`);
    }
    
    return result.count;
  }

  /**
   * Flush any pending batched entries
   */
  async flush(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const entriesToFlush = [...this.batchQueue];
    this.batchQueue.length = 0; // Clear queue

    try {
      const dbData = entriesToFlush.map(e => this.toDbFormat(e));
      await this.prisma.auditLog.createMany({ data: dbData });
      
      if (this.config.debug) {
        console.log(`[PrismaAuditProvider] Flushed ${entriesToFlush.length} entries`);
      }
    } catch (error) {
      // Re-add failed entries to queue
      this.batchQueue.push(...entriesToFlush);
      
      if (this.config.debug) {
        console.error('[PrismaAuditProvider] Flush failed:', error);
      }
      throw error;
    }
  }

  /**
   * Stop the flush timer (call on shutdown)
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        if (this.config.debug) {
          console.error('[PrismaAuditProvider] Auto-flush failed:', err);
        }
      });
    }, this.config.flushInterval);
  }

  private async createEntry(entry: AuditEntryData): Promise<PrismaAuditLog> {
    const dbData = this.toDbFormat(entry);
    return this.prisma.auditLog.create({ data: dbData });
  }

  private toDbFormat(entry: AuditEntryData): Omit<PrismaAuditLog, 'id' | 'createdAt'> {
    return {
      action: entry.action,
      category: entry.category ?? getCategory(entry.action),
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      description: entry.description,
      actorUserId: entry.actor.userId,
      actorEmail: entry.actor.email ?? null,
      actorRoles: entry.actor.roles,
      actorIsSystem: entry.actor.isSystem,
      ipAddress: entry.context?.ipAddress ?? null,
      userAgent: entry.context?.userAgent ?? null,
      method: entry.context?.method ?? null,
      path: entry.context?.path ?? null,
      requestId: entry.context?.requestId ?? null,
      sessionId: entry.context?.sessionId ?? null,
      changes: entry.changes ?? null,
      metadata: entry.metadata ?? null,
      severity: entry.severity ?? getSeverity(entry.action),
      relatedResources: entry.relatedResources ?? null,
      timestamp: new Date(),
    };
  }

  private fromDbFormat(db: PrismaAuditLog): AuditEntry {
    return {
      id: db.id,
      action: db.action as AuditAction,
      category: db.category as AuditActionCategory,
      resourceType: db.resourceType as AuditResourceType,
      resourceId: db.resourceId,
      description: db.description,
      actor: {
        userId: db.actorUserId,
        email: db.actorEmail ?? undefined,
        roles: db.actorRoles,
        isSystem: db.actorIsSystem,
      },
      context: db.ipAddress ? {
        ipAddress: db.ipAddress,
        userAgent: db.userAgent ?? '',
        method: db.method ?? '',
        path: db.path ?? '',
        requestId: db.requestId ?? undefined,
        sessionId: db.sessionId ?? undefined,
      } : undefined,
      changes: db.changes as AuditEntry['changes'],
      metadata: db.metadata as AuditEntry['metadata'],
      severity: db.severity as AuditSeverity,
      relatedResources: db.relatedResources as AuditEntry['relatedResources'],
      timestamp: db.timestamp,
      createdAt: db.createdAt,
    };
  }

  private buildWhereClause(filters?: AuditQueryFilters): Record<string, unknown> {
    if (!filters) return {};

    const where: Record<string, unknown> = {};

    if (filters.actorId) {
      where.actorUserId = filters.actorId;
    }

    if (filters.action) {
      where.action = Array.isArray(filters.action)
        ? { in: filters.action }
        : filters.action;
    }

    if (filters.category) {
      where.category = Array.isArray(filters.category)
        ? { in: filters.category }
        : filters.category;
    }

    if (filters.resourceType) {
      where.resourceType = Array.isArray(filters.resourceType)
        ? { in: filters.resourceType }
        : filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.severity) {
      where.severity = Array.isArray(filters.severity)
        ? { in: filters.severity }
        : filters.severity;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        (where.timestamp as Record<string, Date>).gte = filters.startDate;
      }
      if (filters.endDate) {
        (where.timestamp as Record<string, Date>).lte = filters.endDate;
      }
    }

    if (filters.search) {
      where.description = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    return where;
  }

  private maskSensitiveData(entry: AuditEntryData): AuditEntryData {
    const masked = { ...entry };

    // Mask changes
    if (masked.changes) {
      masked.changes = masked.changes.map(change => {
        if (this.maskFields.has(change.field.toLowerCase())) {
          return {
            ...change,
            oldValue: '[REDACTED]',
            newValue: '[REDACTED]',
          };
        }
        return change;
      });
    }

    // Mask metadata
    if (masked.metadata) {
      masked.metadata = this.maskObject(masked.metadata);
    }

    return masked;
  }

  private maskObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.maskFields.has(key.toLowerCase())) {
        result[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.maskObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}

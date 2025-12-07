import { Request, Response, NextFunction } from 'express';
import { prisma } from '@fundifyhub/prisma';

/**
 * GET /admin/audit-logs
 * List audit logs with filters and pagination
 */
export async function getAuditLogsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      action,
      entityType,
      entityId,
      actorId,
      status,
      startDate,
      endDate,
      search,
      limit = '50',
      offset = '0',
    } = req.query;

    const take = Math.min(parseInt(limit as string, 10) || 50, 100);
    const skip = parseInt(offset as string, 10) || 0;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (action && typeof action === 'string') {
      where.action = action;
    }

    if (entityType && typeof entityType === 'string') {
      where.entityType = entityType;
    }

    if (entityId && typeof entityId === 'string') {
      where.entityId = entityId;
    }

    if (actorId && typeof actorId === 'string') {
      where.actorId = actorId;
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate && typeof startDate === 'string') {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    // Search in description
    if (search && typeof search === 'string') {
      where.description = { contains: search, mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Transform logs to include user info
    const transformedLogs = logs.map(log => ({
      ...log,
      userName: log.actor ? `${log.actor.firstName || ''} ${log.actor.lastName || ''}`.trim() : log.actorEmail?.split('@')[0] || 'Unknown',
      userEmail: log.actor?.email || log.actorEmail || 'Unknown',
    }));

    res.json({
      success: true,
      data: {
        logs: transformedLogs,
        pagination: {
          total,
          limit: take,
          offset: skip,
          page: Math.floor(skip / take) + 1,
          totalPages: Math.ceil(total / take),
          hasMore: skip + take < total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/audit-logs/:id
 * Get a single audit log entry by ID
 */
export async function getAuditLogByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      res.status(404).json({
        success: false,
        error: 'Audit log not found',
      });
      return;
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/audit-logs/stats
 * Get audit log statistics
 */
export async function getAuditLogStatsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (startDate && typeof startDate === 'string') {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      dateFilter.lte = new Date(endDate);
    }

    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get counts grouped by action
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 20,
    });

    // Get counts grouped by entity type
    const entityTypeCounts = await prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: { entityType: true },
      orderBy: { _count: { entityType: 'desc' } },
    });

    // Get counts grouped by status
    const statusCounts = await prisma.auditLog.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    // Get top actors (most active users)
    const topActors = await prisma.auditLog.groupBy({
      by: ['actorId', 'actorEmail'],
      where: { ...where, actorId: { not: null } },
      _count: { actorId: true },
      orderBy: { _count: { actorId: 'desc' } },
      take: 10,
    });

    // Get total count and today's count
    const [totalCount, todayCount, uniqueUsersResult] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: today, lt: tomorrow }
        }
      }),
      prisma.auditLog.groupBy({
        by: ['actorId'],
        where: {
          actorId: { not: null },
          createdAt: { gte: today, lt: tomorrow }
        }
      })
    ]);

    // Get recent activity (last 7 days by day)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentLogs = await prisma.auditLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    // Group by day
    const dailyActivity: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      dailyActivity[key] = 0;
    }

    recentLogs.forEach((log) => {
      const key = log.createdAt.toISOString().split('T')[0];
      if (dailyActivity[key] !== undefined) {
        dailyActivity[key]++;
      }
    });

    // Format response to match frontend expectations
    res.json({
      success: true,
      data: {
        totalLogs: totalCount,
        todayLogs: todayCount,
        uniqueUsers: uniqueUsersResult.length,
        topActions: actionCounts.map((a) => ({
          action: a.action,
          count: a._count.action,
        })),
        entityTypeCounts: entityTypeCounts.map((e) => ({
          entityType: e.entityType,
          count: e._count.entityType,
        })),
        statusCounts: statusCounts.map((s) => ({
          status: s.status,
          count: s._count.status,
        })),
        topActors: topActors.map((a) => ({
          actorId: a.actorId,
          actorEmail: a.actorEmail,
          count: a._count.actorId,
        })),
        dailyActivity: Object.entries(dailyActivity)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /admin/audit-logs/entity/:entityType/:entityId
 * Get audit history for a specific entity
 */
export async function getEntityAuditHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { entityType, entityId } = req.params;
    const { limit = '50' } = req.query;

    const take = Math.min(parseInt(limit as string, 10) || 50, 100);

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    res.json({
      success: true,
      data: {
        entityType,
        entityId,
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

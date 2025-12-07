/**
 * Health Check Controllers for FundifyHub
 *
 * Provides health endpoints for monitoring and orchestration:
 * - Basic health check
 * - Detailed health with dependency statuses
 * - Readiness probe (ready to serve traffic)
 * - Liveness probe (process is alive)
 */

import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import { createLogger } from '@fundifyhub/logger';
import redisClient from '../../utils/redis';

const logger = createLogger({ serviceName: 'main-backend', context: 'health' });

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version?: string;
}

interface DetailedHealthStatus extends HealthStatus {
  checks: {
    database: CheckResult;
    redis: CheckResult;
    memory: CheckResult;
    disk?: CheckResult;
  };
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * GET /api/v1/health
 * Basic health endpoint - returns minimal status
 */
export async function getBasicHealth(req: Request, res: Response): Promise<void> {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  };

  res.status(200).json(health);
}

/**
 * GET /api/v1/health/detailed
 * Detailed health with all dependency checks
 */
export async function getDetailedHealth(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    // Check database
    const dbCheck = await checkDatabase();

    // Check Redis
    const redisCheck = await checkRedis();

    // Check memory
    const memoryCheck = checkMemory();

    // Determine overall status
    const allChecks = [dbCheck, redisCheck, memoryCheck];
    const hasFailure = allChecks.some((check: CheckResult) => check.status === 'fail');
    const hasWarning = allChecks.some((check: CheckResult) => check.status === 'warn');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasFailure) {
      overallStatus = 'unhealthy';
    } else if (hasWarning) {
      overallStatus = 'degraded';
    }

    const health: DetailedHealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: dbCheck,
        redis: redisCheck,
        memory: memoryCheck,
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    logger.debug('Health check completed', {
      status: overallStatus,
      duration: Date.now() - startTime,
    });

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));

    const health: DetailedHealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: { status: 'fail', message: 'Check failed' },
        redis: { status: 'fail', message: 'Check failed' },
        memory: { status: 'fail', message: 'Check failed' },
      },
    };

    res.status(503).json(health);
  }
}

/**
 * GET /api/v1/health/ready
 * Readiness probe - checks if service is ready to accept traffic
 */
export async function getReadinessProbe(req: Request, res: Response): Promise<void> {
  try {
    // Check critical dependencies
    const dbCheck = await checkDatabase();
    const redisCheck = await checkRedis();

    const isReady = dbCheck.status === 'pass' && redisCheck.status === 'pass';

    if (isReady) {
      res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
    }
  } catch (error) {
    logger.error('Readiness probe failed', error instanceof Error ? error : new Error(String(error)));
    res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
  }
}

/**
 * GET /api/v1/health/live
 * Liveness probe - checks if process is alive
 */
export async function getLivenessProbe(req: Request, res: Response): Promise<void> {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 100 ? 'pass' : 'warn',
      responseTime,
      message: responseTime < 100 ? 'Database connected' : 'Database slow',
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Database health check failed', error instanceof Error ? error : new Error(String(error)));

    return {
      status: 'fail',
      responseTime,
      message: 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    await redisClient.ping();
    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 50 ? 'pass' : 'warn',
      responseTime,
      message: responseTime < 50 ? 'Redis connected' : 'Redis slow',
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Redis health check failed', error instanceof Error ? error : new Error(String(error)));

    return {
      status: 'fail',
      responseTime,
      message: 'Redis connection failed',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): CheckResult {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const rssMB = Math.round(used.rss / 1024 / 1024);

  // Warn if heap usage > 80%
  const heapUsagePercent = (used.heapUsed / used.heapTotal) * 100;

  return {
    status: heapUsagePercent < 80 ? 'pass' : heapUsagePercent < 90 ? 'warn' : 'fail',
    message:
      heapUsagePercent < 80
        ? 'Memory within limits'
        : heapUsagePercent < 90
          ? 'High memory usage'
          : 'Critical memory usage',
    details: {
      heapUsedMB,
      heapTotalMB,
      heapUsagePercent: Math.round(heapUsagePercent),
      rssMB,
    },
  };
}

/**
 * Prometheus Metrics for FundifyHub Backend
 * 
 * Provides application metrics for monitoring and observability:
 * - HTTP request metrics (duration, count, status)
 * - System metrics (memory, CPU)
 * - Business metrics (active users, requests, etc.)
 * - Custom application metrics
 */

import { Request, Response } from 'express';
import promClient from 'prom-client';
import logger from './logger';

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ 
  register,
  prefix: 'fundifyhub_',
});

// HTTP Request Duration Histogram
export const httpRequestDuration = new promClient.Histogram({
  name: 'fundifyhub_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5],
  registers: [register],
});

// HTTP Request Counter
export const httpRequestCount = new promClient.Counter({
  name: 'fundifyhub_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Active Connections Gauge
export const activeConnections = new promClient.Gauge({
  name: 'fundifyhub_active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Database Query Duration
export const dbQueryDuration = new promClient.Histogram({
  name: 'fundifyhub_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

// Cache Hit/Miss Counter
export const cacheOperations = new promClient.Counter({
  name: 'fundifyhub_cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'], // operation: get/set/del, result: hit/miss/success/error
  registers: [register],
});

// Redis Connection Status
export const redisConnected = new promClient.Gauge({
  name: 'fundifyhub_redis_connected',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
  registers: [register],
});

// Database Connection Status
export const dbConnected = new promClient.Gauge({
  name: 'fundifyhub_database_connected',
  help: 'Database connection status (1 = connected, 0 = disconnected)',
  registers: [register],
});

// Business Metrics - Active Users
export const activeUsers = new promClient.Gauge({
  name: 'fundifyhub_active_users',
  help: 'Number of currently active users',
  labelNames: ['role'],
  registers: [register],
});

// Business Metrics - Pending Requests
export const pendingRequests = new promClient.Gauge({
  name: 'fundifyhub_pending_requests',
  help: 'Number of pending loan requests',
  labelNames: ['status'],
  registers: [register],
});

// Business Metrics - Active Auctions
export const activeAuctions = new promClient.Gauge({
  name: 'fundifyhub_active_auctions',
  help: 'Number of currently active auctions',
  registers: [register],
});

// Queue Job Counter
export const queueJobs = new promClient.Counter({
  name: 'fundifyhub_queue_jobs_total',
  help: 'Total number of queue jobs processed',
  labelNames: ['queue', 'status'], // status: success/failed
  registers: [register],
});

// Rate Limit Hits
export const rateLimitHits = new promClient.Counter({
  name: 'fundifyhub_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'identifier_type'], // identifier_type: ip/user
  registers: [register],
});

// Error Counter
export const errors = new promClient.Counter({
  name: 'fundifyhub_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'], // type: validation/auth/db/etc, severity: warn/error
  registers: [register],
});

/**
 * Metrics endpoint handler
 */
export async function metricsHandler(req: Request, res: Response): Promise<void> {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    logger.error('[Metrics] Error generating metrics:', err as Error);
    res.status(500).end('Error generating metrics');
  }
}

/**
 * Middleware to track HTTP metrics
 */
export function trackHttpMetrics(req: Request, res: Response, next: Function): void {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode.toString();
    
    // Record duration
    httpRequestDuration.labels(req.method, route, statusCode).observe(duration);
    
    // Increment request count
    httpRequestCount.labels(req.method, route, statusCode).inc();
    
    // Decrement active connections
    activeConnections.dec();
  });
  
  next();
}

/**
 * Update business metrics
 * Should be called periodically (e.g., every minute)
 */
export async function updateBusinessMetrics(): Promise<void> {
  try {
    // These would be populated from your database
    // For now, just importing to show the pattern
    const { prisma } = await import('@fundifyhub/prisma');
    
    // Count active users (users who logged in within last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    // Since roles is an array, we can't group by it directly.
    // We'll count total active users and maybe specific roles if needed.
    const activeUserCount = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: fifteenMinutesAgo,
        },
      },
    });
    
    // Set total active users (using 'total' as label)
    activeUsers.labels('total').set(activeUserCount);
    
    // Count pending requests by stage
    const requestCounts = await prisma.request.groupBy({
      by: ['stage'],
      _count: { _all: true },
    });
    
    requestCounts.forEach((count) => {
      pendingRequests.labels(count.stage).set(count._count._all);
    });
    
    // Count active auctions
    const auctionCount = await prisma.auctionListing.count({
      where: {
        status: 'ACTIVE',
        endTime: {
          gt: new Date(),
        },
      },
    });
    
    activeAuctions.set(auctionCount);
    
  } catch (err) {
    logger.error('[Metrics] Error updating business metrics:', err as Error);
  }
}

// Start business metrics collection (every 60 seconds)
setInterval(updateBusinessMetrics, 60000);

// Initial update
updateBusinessMetrics();

export { register };
export default { metricsHandler, trackHttpMetrics, register };

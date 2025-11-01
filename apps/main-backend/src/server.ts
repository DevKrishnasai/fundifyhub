/**
 * FundifyHub Main Backend Server
 *
 * This is the main Express.js server for the FundifyHub application.
 * It provides REST API endpoints for user authentication, loan management,
 * and other financial services.
 *
 * Architecture:
 * - Express.js web framework
 * - TypeScript for type safety
 * - Prisma ORM for database operations
 * - JWT for authentication
 * - BullMQ for background job processing
 * - Winston for logging
 *
 * Security Features:
 * - CORS configuration
 * - Cookie-based authentication
 * - Input validation
 * - Rate limiting (TODO)
 * - Request logging
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './env-config';
import { logger } from './utils/logger';
import apiRoutes from './api';

const app = express();

app.use(cors({
  origin: config.server.cors.origins,
  credentials: config.server.cors.credentials,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/v1', apiRoutes);

/* 404 handler */
app.use('*', (req, res) => {
   res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

/* Global error handler */
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  const contextLogger = logger.child('[error-handler]');
  contextLogger.error('Unhandled error:', error);

  const message = config.env.isDevelopment 
    ? error.message 
    : 'Internal server error';

  res.status(500).json({
    success: false,
    message,
    ...(config.env.isDevelopment && { stack: error.stack })
  });
});

app.listen(config.server.port, () => {
  logger.info(`🚀 Server started on port ${config.server.port}`);
});
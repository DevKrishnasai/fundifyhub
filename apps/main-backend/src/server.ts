import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { validateMainBackendEnv } from '@fundifyhub/utils';
import config from './utils/env-config';
import apiRoutes from './api';
import logger from './utils/logger';

// Validate environment variables before starting the server
try {
  validateMainBackendEnv();
  logger.info('✅ Environment variables validated successfully');
} catch (error) {
  logger.error('❌ Environment validation failed:', error as Error);
  process.exit(1);
}

const app = express();

// TODO [P-2]: add rate limiting, security headers, request logging, etc.

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
    message
  });
});

app.listen(config.server.port, () => {
  logger.info(`🚀 Server started on port ${config.server.port}`);
});
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './utils/config';
import apiRoutes from './api';
import logger from './utils/logger';

/*
 * server.ts
 * Entry point for the main-backend service. We import the application
 * `config` (which validates environment variables on import) and then
 * wire the Express app. Keeping validation in `utils/config` centralizes
 * defaults and reduces duplicated validation logic across modules.
 */
// App-level config validates env on import
const env = config.env;
logger.info('✅ Main-backend configuration loaded successfully');

const app = express();

// TODO [P-2]: add rate limiting, security headers, request logging, etc.

app.use(cors({
  origin: config.server.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use('/api/v1', apiRoutes);

/* 404 handler */
app.use('*', (req, res) => {
   res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

/* Global error handler */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const contextLogger = logger.child('[error-handler]');
  contextLogger.error('Unhandled error:', error);

  const message = config.nodeEnv === 'development'
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
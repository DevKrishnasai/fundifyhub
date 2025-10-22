import { Request, Response, NextFunction } from 'express';
import { createLogger, SimpleLogger } from '@fundifyhub/logger';
import { config } from '../config';

const logger = createLogger({ serviceName: 'backend-middleware' });

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
  logger: SimpleLogger  
): void => {
  logger.error('Unhandled error:', error);
  
  // Don't expose internal errors in production
  const message = config.env.isDevelopment 
    ? error.message 
    : 'Internal server error';

  res.status(500).json({
    success: false,
    message,
    ...(config.env.isDevelopment && { stack: error.stack })
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} not found`
  });
};          
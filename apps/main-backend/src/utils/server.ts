import { Server } from 'http';
import type { Express, NextFunction, Request, Response } from 'express';
import type { SimpleLogger } from '@fundifyhub/logger';


/**
 * Start Express server
 */
export async function startServer(app: Express, port: number, logger: SimpleLogger): Promise<Server> {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, () => {
        logger.info(`🚀 Server started on port ${port}`);
        resolve(server);
      });

      server.on('error', (error) => {
        logger.error('Failed to start server:', error);
        reject(error);
      });
    } catch (error) {
      logger.error('Failed to start server:', error as Error);
      reject(error);
    }
  });
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(server: Server | undefined, logger: SimpleLogger): void {
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    
    if (server) {
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        logger.info('Server closed successfully');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

/**
 * Request logging
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction, logger: SimpleLogger): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
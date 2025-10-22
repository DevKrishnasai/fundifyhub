import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createLogger } from '@fundifyhub/logger';
import { config } from './config';
import apiRoutes from './api';
import { errorHandler, notFoundHandler } from './middleware/error';
import { startServer as startExpressServer, setupGracefulShutdown, requestLogger } from './utils/server';

const logger = createLogger({ serviceName: 'main-server' });
const app = express();

// Middleware
app.use(cors({
  origin: config.server.cors.origins,
  credentials: config.server.cors.credentials,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => requestLogger(req, res, next, logger));

// API Routes
app.use('/api', apiRoutes);
    
// Error handling
app.use('*', (req, res) => notFoundHandler(req, res));
app.use((error: any, req: Request, res: Response, next: NextFunction) =>
  errorHandler(error, req, res, next, logger)
);

/**
 * Initialize and start server
 */
async function initializeServer() {
  try {
    const server = await startExpressServer(app, config.server.port, logger);
    setupGracefulShutdown(server, logger);
  } catch (error) {
    logger.error('Failed to initialize server:', error as Error);
    process.exit(1);
  }
}

initializeServer();
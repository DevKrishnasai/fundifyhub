/**
 * Main Backend Entry Point
 * 
 * Creates Express app, sets up HTTP + sockets, and starts the server.
 * This is the consolidated main-backend service with WebSocket support.
 */

import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';

// Config & Utils
import config from './config/env';
import logger from './api/utils/logger';
import { notFoundHandler, errorHandler } from './api/middlewares/error.middleware';
import { applyRateLimiting } from './utils/rate-limit';
import { metricsHandler, trackHttpMetrics } from './utils/metrics';
import swaggerSpec from './utils/swagger';

// API Routes
import apiRoutes from './api';
import { razorpayWebhookController } from './api/controllers/payments-razorpay.controller';

// Realtime (WebSocket)
import { initializeSocketServer, shutdownSocketServer } from './realtime/socket-server';

/*
 * Bootstrap Application
 * Validates environment on import and initializes Express app
 */
logger.info('✅ Main-backend configuration loaded successfully');

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`NoSQL injection attempt detected from ${req.ip}`, { key, path: req.path });
  },
}));

// Data sanitization against XSS
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp({
  whitelist: ['sort', 'filter', 'page', 'limit'],
}));

// Gzip compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
}));

// Trust proxy for accurate IP detection
app.set('trust proxy', 1);

// ============================================
// CORS CONFIGURATION
// ============================================

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.29.97:3000', // Dev LAN IP
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (server-to-server, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ============================================
// MONITORING & DOCUMENTATION
// ============================================

// Prometheus metrics endpoint
app.get('/metrics', metricsHandler);

// HTTP metrics tracking
app.use(trackHttpMetrics);

// Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================
// WEBHOOK HANDLERS (RAW BODY)
// ============================================

// Razorpay webhook requires raw body for signature verification
app.post(
  '/api/v1/payments/razorpay/webhook',
  express.raw({ type: 'application/json', limit: '10mb' }),
  (req, res) => {
    // Convert raw buffer to string and parse JSON
    const bodyString = (req.body && Buffer.isBuffer(req.body)) 
      ? req.body.toString('utf8') 
      : '';
    
    try {
      req.body = bodyString ? JSON.parse(bodyString) : {};
      req.rawBody = bodyString;
    } catch (err) {
      req.rawBody = bodyString;
    }

    return razorpayWebhookController(req, res);
  }
);

// Handle GET on webhook (return 405)
app.get('/api/v1/payments/razorpay/webhook', (req, res) => {
  res.status(405).json({ 
    success: false, 
    message: 'Method not allowed. POST only for webhooks' 
  });
});

// ============================================
// BODY PARSERS & MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting (only for API routes)
app.use('/api/v1', applyRateLimiting);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/v1', apiRoutes);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER INITIALIZATION
// ============================================

const httpServer = createServer(app);

async function startServer(): Promise<void> {
  try {
    // Initialize Socket.IO on the same HTTP server
    await initializeSocketServer(httpServer, {
      corsOrigins: allowedOrigins,
      useRedisAdapter: Boolean(config.redis.url),
    });

    // Start listening
    httpServer.listen(config.server.port, () => {
      logger.info(`🚀 Server started on port ${config.server.port}`);
      logger.info(`📡 WebSocket server running on ws://localhost:${config.server.port}`);
      logger.info(`📊 Prometheus metrics available at http://localhost:${config.server.port}/metrics`);
      logger.info(`📚 API Documentation available at http://localhost:${config.server.port}/api/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer();

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Shutdown Socket.IO
    await shutdownSocketServer();
    
    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    logger.info('Server shut down successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error as Error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

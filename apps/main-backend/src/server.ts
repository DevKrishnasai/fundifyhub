import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';
import config from './utils/config';
import apiRoutes from './api';
import { razorpayWebhookController } from './api/payments/razorpay';
import logger from './utils/logger';
import { applyRateLimiting } from './utils/rate-limit';
import { initializeSocketServer, shutdownSocketServer } from './socket';
import { notFoundHandler, errorHandler } from './utils/error-handler';
import { metricsHandler, trackHttpMetrics } from './utils/metrics';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './utils/swagger';

/*
 * server.ts
 * Entry point for the main-backend service. We import the application
 * `config` (which validates environment variables on import) and then
 * wire the Express app. Keeping validation in `utils/config` centralizes
 * defaults and reduces duplicated validation logic across modules.
 */
logger.info('✅ Main-backend configuration loaded successfully');

const app = express();

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
  whitelist: ['sort', 'filter', 'page', 'limit'], // Allow arrays for these params
}));

// Gzip compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
}));

// Trust proxy for accurate IP detection behind reverse proxies
app.set('trust proxy', 1);

// Allow a small whitelist of dev origins. Important: when credentials
// are enabled, Access-Control-Allow-Origin must not be '*'. We prefer
// an explicit list that includes common local/dev hosts.
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // Add the LAN/dev IP that the frontend runs on (example from the error)
  'http://192.168.29.97:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // `origin` will be undefined for non-browser requests (server-to-server,
    // curl, Postman). Allow those. For browser requests, check whitelist.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// Prometheus metrics endpoint (before other middleware for accurate timing)
app.get('/metrics', metricsHandler);

// HTTP metrics tracking middleware
app.use(trackHttpMetrics);

// Serve Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// NOTE: For webhook verification, we MUST use the raw body exactly as Razorpay sends it.
// Using `express.json()` will transform the body which breaks signature verification.
// So we mount a raw body parser for the Razorpay webhook route and then still use
// the normal JSON middleware for other routes.

// Raw body parser for webhook
app.post('/api/v1/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '10mb' }), (req, res, next) => {
  // Raw buffer -> string
  const bodyString = (req.body && Buffer.isBuffer(req.body)) ? req.body.toString('utf8') : '';
  // Parse JSON and attach both parsed body and raw string to req for the controller
  try {
    req.body = bodyString ? JSON.parse(bodyString) : {};
    // store raw body string for signature verification
    req.rawBody = bodyString;
  } catch (err) {
    // Ignore JSON parse errors here; the controller will validate further
    // and return an informative message
    req.rawBody = bodyString;
  }

  // Call the controller directly
  return razorpayWebhookController(req, res);
});

// Handle GET on webhook (return 405) - this prevents 404 in logs and provides clearer feedback.
app.get('/api/v1/payments/razorpay/webhook', (req, res) => {
  res.status(405).json({ success: false, message: 'Method not allowed. POST only for webhooks' });
});

// Continue to mount JSON middleware for other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting middleware
app.use('/api/v1', applyRateLimiting);

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

/* 404 handler - for unmatched routes */
app.use(notFoundHandler);

/* Global error handler - catches all errors */
app.use(errorHandler);

// Create HTTP server for both Express and Socket.IO
const httpServer = createServer(app);

// Start the server
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

// Graceful shutdown
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
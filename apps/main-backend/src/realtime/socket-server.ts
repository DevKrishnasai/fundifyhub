/**
 * Socket.IO Server Initialization
 *
 * Consolidated WebSocket server running alongside Express.
 * Supports Redis adapter for horizontal scaling.
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import {
  socketAuthMiddleware,
  socketRateLimitMiddleware,
} from './middleware';
import {
  registerSocketHandlers,
  setIOInstance,
  getIO,
  emitRequestUpdated,
  emitRequestStatusChanged,
  emitCommentAdded,
  emitDocumentUploaded,
  emitToUser,
  emitToRole,
  emitToDistrict,
  broadcast,
  getUserConnections,
  isUserOnline,
  getTotalConnections,
} from './handlers';
import { AuthenticatedSocket, SocketServerOptions } from './types';
import config from '../config/env';
import logger from '../api/utils/logger';

// ============================================
// SOCKET SERVER INSTANCE
// ============================================

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server with the HTTP server
 *
 * @param httpServer - The HTTP server instance from Express
 * @param options - Socket server configuration options
 */
export async function initializeSocketServer(
  httpServer: HTTPServer,
  options: Partial<SocketServerOptions> = {}
): Promise<SocketIOServer> {
  const corsOrigins = options.corsOrigins || [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const useRedisAdapter = options.useRedisAdapter ?? Boolean(config.redis.url);

  logger.info('[Socket] Initializing Socket.IO server...', {
    corsOrigins,
    useRedisAdapter,
  });

  // Create Socket.IO server
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
    // Allow larger payloads for document uploads
    maxHttpBufferSize: 5e6, // 5MB
  });

  // Set up Redis adapter for horizontal scaling (if Redis is configured)
  if (useRedisAdapter && config.redis.url) {
    try {
      const pubClient = new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.error('[Socket] Redis pub client connection failed');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      const subClient = pubClient.duplicate();

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.on('ready', resolve);
          pubClient.on('error', reject);
        }),
        new Promise<void>((resolve, reject) => {
          subClient.on('ready', resolve);
          subClient.on('error', reject);
        }),
      ]);

      io.adapter(createAdapter(pubClient, subClient));
      logger.info('[Socket] Redis adapter initialized for horizontal scaling');
    } catch (error) {
      logger.warn('[Socket] Redis adapter setup failed, running in single-instance mode', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    logger.info('[Socket] Running without Redis adapter (single instance mode)');
  }

  // Apply middlewares
  io.use(socketRateLimitMiddleware);
  io.use(socketAuthMiddleware);

  // Handle new connections
  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;

    logger.info('[Socket] New connection', {
      socketId: socket.id,
      userId: authSocket.userId,
      roles: authSocket.userRoles,
    });

    // Register event handlers for this socket
    registerSocketHandlers(io!, authSocket);
  });

  // Store instance for handlers
  setIOInstance(io);

  logger.info('[Socket] Socket.IO server initialized successfully');

  return io;
}

/**
 * Get the Socket.IO server instance
 * Returns null if not initialized
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Gracefully shutdown the socket server
 */
export async function shutdownSocketServer(): Promise<void> {
  if (!io) return;

  logger.info('[Socket] Shutting down Socket.IO server...');

  // Disconnect all clients
  const sockets = await io.fetchSockets();
  for (const socket of sockets) {
    socket.disconnect(true);
  }

  // Close the server
  await new Promise<void>((resolve) => {
    io!.close(() => {
      logger.info('[Socket] Socket.IO server shut down');
      resolve();
    });
  });

  io = null;
}

// ============================================
// RE-EXPORTS
// ============================================

// Export emit functions for use in controllers
export {
  getIO,
  emitRequestUpdated,
  emitRequestStatusChanged,
  emitCommentAdded,
  emitDocumentUploaded,
  emitToUser,
  emitToRole,
  emitToDistrict,
  broadcast,
  getUserConnections,
  isUserOnline,
  getTotalConnections,
  // Payment events
  emitPaymentReceived,
  emitEMIReminder,
  emitEMIOverdue,
  // Auction events
  emitAuctionBid,
  emitAuctionOutbid,
  emitAuctionEnded,
  emitAuctionWon,
} from './handlers';

// Export types
export * from './types';
export type { PaymentReceivedPayload, EMIReminderPayload, EMIOverduePayload } from './handlers';

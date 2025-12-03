/**
 * Socket Authentication Middleware
 *
 * Authenticates WebSocket connections using JWT tokens.
 * Tokens can be provided via:
 * 1. auth.token during connection
 * 2. Cookie in handshake headers
 */

import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthenticatedSocket, ExtendedJWTPayload } from './types';
import { ServerEvent } from '@fundifyhub/types';
import config from '../utils/config';
import logger from '../utils/logger';

const JWT_SECRET = config.jwt.secret;

/**
 * Parse cookies from a cookie string
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;

  cookieString.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });

  return cookies;
}

/**
 * Extract JWT token from socket handshake
 */
function extractToken(socket: Socket): string | null {
  // 1. Check auth object (preferred for socket.io)
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) {
    return authToken;
  }

  // 2. Check headers for Authorization
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. Check cookies
  const cookieHeader = socket.handshake.headers.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies.accessToken) {
      return cookies.accessToken;
    }
  }

  return null;
}

/**
 * Socket.IO authentication middleware
 *
 * Verifies JWT token and attaches user data to socket.
 * Rejects connection if authentication fails.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const contextLogger = logger.child(`[SocketAuth:${socket.id}]`);

  try {
    const token = extractToken(socket);

    if (!token) {
      contextLogger.warn('No authentication token provided');
      socket.emit(ServerEvent.ERROR, {
        code: 'AUTH_REQUIRED',
        message: 'Authentication token required',
      });
      return next(new Error('Authentication required'));
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as ExtendedJWTPayload;

    if (!decoded || !decoded.id) {
      contextLogger.warn('Invalid token payload');
      socket.emit(ServerEvent.ERROR, {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      });
      return next(new Error('Invalid token'));
    }

    // Check if user is active
    if (decoded.isActive === false) {
      contextLogger.warn('Inactive user attempted connection', { userId: decoded.id });
      socket.emit(ServerEvent.ERROR, {
        code: 'USER_INACTIVE',
        message: 'User account is inactive',
      });
      return next(new Error('User account is inactive'));
    }

    // Attach user data to socket
    const authSocket = socket as AuthenticatedSocket;
    authSocket.userId = decoded.id;
    authSocket.userEmail = decoded.email;
    authSocket.userRoles = decoded.roles || [];
    authSocket.userDistricts = decoded.districts;
    authSocket.authenticated = true;

    contextLogger.debug('Socket authenticated', {
      userId: decoded.id,
      roles: decoded.roles,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      contextLogger.warn('Token expired');
      socket.emit(ServerEvent.ERROR, {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      });
      socket.emit(ServerEvent.USER_SESSION_EXPIRED, {
        message: 'Your session has expired. Please login again.',
      });
      return next(new Error('Token expired'));
    }

    if (error instanceof jwt.JsonWebTokenError) {
      contextLogger.warn('Invalid JWT', { error: error.message });
      socket.emit(ServerEvent.ERROR, {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      });
      return next(new Error('Invalid token'));
    }

    contextLogger.error('Authentication error', error as Error);
    socket.emit(ServerEvent.ERROR, {
      code: 'AUTH_ERROR',
      message: 'Authentication failed',
    });
    return next(new Error('Authentication failed'));
  }
}

/**
 * Rate limiting middleware for socket connections
 *
 * Limits connections per IP to prevent abuse
 */
const connectionCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_CONNECTIONS_PER_IP = 10;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

export function socketRateLimitMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const ip = socket.handshake.address;
  const now = Date.now();

  let record = connectionCounts.get(ip);

  if (!record || record.resetAt < now) {
    record = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  record.count++;
  connectionCounts.set(ip, record);

  if (record.count > MAX_CONNECTIONS_PER_IP) {
    logger.warn('[SocketRateLimit] Too many connections from IP', { ip });
    socket.emit(ServerEvent.ERROR, {
      code: 'RATE_LIMITED',
      message: 'Too many connection attempts. Please try again later.',
    });
    return next(new Error('Rate limited'));
  }

  next();
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  connectionCounts.forEach((record, ip) => {
    if (record.resetAt < now) {
      connectionCounts.delete(ip);
    }
  });
}, RATE_LIMIT_WINDOW_MS);

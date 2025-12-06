/**
 * Socket Server Types
 *
 * Type definitions for the consolidated Socket.IO server.
 * Extends Socket with authenticated user data.
 */

import { Socket } from 'socket.io';
import { JWTPayloadType, UserRole } from '@fundifyhub/types';

/**
 * Authenticated socket with user data attached after JWT verification
 */
export interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
  userRoles: UserRole[];
  userDistricts?: string[];
  authenticated: boolean;
}

/**
 * Room types for organizing socket connections
 */
export enum RoomType {
  /** User-specific room: user:{userId} */
  USER = 'user',
  /** Request-specific room: request:{requestId} */
  REQUEST = 'request',
  /** Role-based room: role:{roleName} */
  ROLE = 'role',
  /** District-based room: district:{districtName} */
  DISTRICT = 'district',
  /** Auction-specific room: auction:{auctionId} */
  AUCTION = 'auction',
}

/**
 * Generate a room name from type and id
 */
export const getRoomName = (type: RoomType, id: string): string => `${type}:${id}`;

/**
 * Connection tracking entry
 */
export interface ConnectionInfo {
  socketId: string;
  userId: string;
  userRoles: UserRole[];
  userDistricts?: string[];
  connectedAt: Date;
  lastActivity: Date;
}

/**
 * User notification payload for emitting
 */
export interface NotificationEmitPayload {
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Role notification payload for broadcasting
 */
export interface RoleNotificationPayload {
  role: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Broadcast to request payload
 */
export interface BroadcastToRequestPayload {
  requestId: string;
  event: string;
  data: unknown;
}

/**
 * Socket server options
 */
export interface SocketServerOptions {
  corsOrigins: string[];
  useRedisAdapter: boolean;
}

/**
 * Extended JWT payload with user details (re-exported for convenience)
 */
export type ExtendedJWTPayload = JWTPayloadType;

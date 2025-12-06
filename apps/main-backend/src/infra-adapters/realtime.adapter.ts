/**
 * Realtime Adapter
 * 
 * Wraps Socket.IO for real-time updates.
 * Handles loan updates, auction bids, payment status, etc.
 * 
 * @module infra-adapters/realtime
 */
import type { Server as SocketIOServer } from 'socket.io';
import { getIO } from '../socket/handlers';
import { ServerEvent } from '@fundifyhub/types';
import logger from '../utils/logger';

/**
 * Socket.IO wrapper for real-time communication
 */
export class RealtimeAdapter {
  /**
   * Get Socket.IO instance
   */
  private getSocketIO(): SocketIOServer | null {
    try {
      return getIO();
    } catch (err) {
      logger.warn('[RealtimeAdapter] Socket.IO not initialized', { error: err });
      return null;
    }
  }

  /**
   * Emit update to user
   * 
   * Uses Socket.IO rooms (user:userId) to target specific users.
   * 
   * @example
   * ```ts
   * await realtimeAdapter.emitToUser(customerId, ServerEvent.REQUEST_UPDATED, {
   *   requestId: '123',
   *   status: 'REVIEW'
   * })
   * ```
   */
  async emitToUser(userId: string, eventName: ServerEvent, data: any): Promise<void> {
    try {
      const io = this.getSocketIO();
      if (!io) {
        logger.debug('[RealtimeAdapter] Socket.IO not available, event not sent', { userId, eventName });
        return;
      }

      // Emit to user's room (user:userId)
      io.to(`user:${userId}`).emit(eventName, data);

      logger.debug('[RealtimeAdapter] Event emitted to user', {
        userId,
        eventName,
        room: `user:${userId}`,
      });
    } catch (err) {
      logger.error('[RealtimeAdapter] Failed to emit to user', { error: err, userId, eventName });
    }
  }

  /**
   * Broadcast to all users in a room
   * 
   * @example
   * ```ts
   * await realtimeAdapter.broadcast('auctions', 'auction:bid', {
   *   auctionId: '123',
   *   bidAmount: 50000
   * })
   * ```
   */
  async broadcast(room: string, eventName: string, data: any): Promise<void> {
    try {
      const io = this.getSocketIO();
      if (!io) {
        logger.debug('[RealtimeAdapter] Socket.IO not available, broadcast skipped', { room, eventName });
        return;
      }

      // Emit to all sockets in the room
      io.to(room).emit(eventName, data);

      logger.debug('[RealtimeAdapter] Broadcasted to room', {
        room,
        eventName,
      });
    } catch (err) {
      logger.error('[RealtimeAdapter] Failed to broadcast', { error: err, room, eventName });
    }
  }

  /**
   * Join user to room
   */
  async joinRoom(userId: string, room: string): Promise<void> {
    try {
      const io = this.getSocketIO();
      if (!io) {
        logger.debug('[RealtimeAdapter] Socket.IO not available, join room skipped', { userId, room });
        return;
      }

      // Get all sockets for this user
      const sockets = await io.in(`user:${userId}`).fetchSockets();
      
      // Join all user's sockets to the room
      for (const socket of sockets) {
        await socket.join(room);
      }

      logger.debug('[RealtimeAdapter] User joined room', { userId, room, socketCount: sockets.length });
    } catch (err) {
      logger.error('[RealtimeAdapter] Failed to join room', { error: err, userId, room });
    }
  }

  /**
   * Remove user from room
   */
  async leaveRoom(userId: string, room: string): Promise<void> {
    try {
      const io = this.getSocketIO();
      if (!io) {
        logger.debug('[RealtimeAdapter] Socket.IO not available, leave room skipped', { userId, room });
        return;
      }

      // Get all sockets for this user
      const sockets = await io.in(`user:${userId}`).fetchSockets();
      
      // Remove all user's sockets from the room
      for (const socket of sockets) {
        await socket.leave(room);
      }

      logger.debug('[RealtimeAdapter] User left room', { userId, room, socketCount: sockets.length });
    } catch (err) {
      logger.error('[RealtimeAdapter] Failed to leave room', { error: err, userId, room });
    }
  }

  /**
   * Update shared resource (for collaborative features)
   * 
   * @example
   * ```ts
   * await realtimeAdapter.updateSharedResource('auction:123', {
   *   highestBid: 50000,
   *   highestBidder: 'user456'
   * })
   * ```
   */
  async updateSharedResource(
    resourceId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const io = this.getSocketIO();
      if (!io) {
        logger.debug('[RealtimeAdapter] Socket.IO not available, resource update skipped', { resourceId });
        return;
      }

      // Construct room name using resource pattern
      const room = `resource:${resourceId}`;
      
      // Broadcast update to all users viewing this resource
      io.to(room).emit('resource:updated', {
        resourceId,
        updates,
        timestamp: new Date().toISOString(),
      });

      logger.debug('[RealtimeAdapter] Shared resource updated', {
        resourceId,
        room,
      });
    } catch (err) {
      logger.error('[RealtimeAdapter] Failed to update shared resource', { error: err, resourceId });
    }
  }

  /**
   * Get connected user count
   */
  async getConnectedUsers(): Promise<number> {
    try {
      const io = this.getSocketIO();
      if (!io) {
        logger.debug('[RealtimeAdapter] Socket.IO not available');
        return 0;
      }

      // Get all connected sockets
      const sockets = await io.fetchSockets();
      
      logger.debug('[RealtimeAdapter] Connected users retrieved', { count: sockets.length });
      return sockets.length;
    } catch (err) {
      logger.error('[RealtimeAdapter] Failed to get connected users', { error: err });
      return 0;
    }
  }

  /**
   * Check if user is connected
   */
  async isUserConnected(userId: string): Promise<boolean> {
    try {
      const io = this.getSocketIO();
      if (!io) {
        return false;
      }

      // Get all sockets in the user's room
      const sockets = await io.in(`user:${userId}`).fetchSockets();
      
      const isConnected = sockets.length > 0;
      logger.debug('[RealtimeAdapter] User connection checked', { userId, isConnected });
      
      return isConnected;
    } catch (err) {
      logger.error('[RealtimeAdapter] Failed to check user connection', { error: err, userId });
      return false;
    }
  }
}

export const realtimeAdapter = new RealtimeAdapter();

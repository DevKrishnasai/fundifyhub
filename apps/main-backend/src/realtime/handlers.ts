/**
 * Socket Event Handlers
 *
 * Handles all Socket.IO events from connected clients.
 * Manages room subscriptions and client authentication.
 */

import { Server as SocketIOServer } from 'socket.io';
import {
  AuthenticatedSocket,
  RoomType,
  getRoomName,
  ConnectionInfo,
} from './types';
import {
  ServerEvent,
  ClientEvent,
  type RequestUpdatedPayload,
  type RequestStatusChangedPayload,
  type CommentAddedPayload,
  type DocumentUploadedPayload,
  type AuctionBidPayload,
  type AuctionEndedPayload,
  type AuctionOutbidPayload,
} from '@fundifyhub/types';
import logger from '../utils/logger';

// ============================================
// CONNECTION TRACKING
// ============================================

/** Track active connections by userId */
const connections = new Map<string, ConnectionInfo[]>();

/**
 * Add a connection to tracking
 */
function addConnection(socket: AuthenticatedSocket): void {
  const info: ConnectionInfo = {
    socketId: socket.id,
    userId: socket.userId,
    userRoles: socket.userRoles,
    userDistricts: socket.userDistricts,
    connectedAt: new Date(),
    lastActivity: new Date(),
  };

  const userConnections = connections.get(socket.userId) || [];
  userConnections.push(info);
  connections.set(socket.userId, userConnections);

  logger.debug('[Socket] Connection added', {
    userId: socket.userId,
    socketId: socket.id,
    totalConnections: userConnections.length,
  });
}

/**
 * Remove a connection from tracking
 */
function removeConnection(socket: AuthenticatedSocket): void {
  const userConnections = connections.get(socket.userId);
  if (!userConnections) return;

  const filtered = userConnections.filter((c) => c.socketId !== socket.id);

  if (filtered.length === 0) {
    connections.delete(socket.userId);
  } else {
    connections.set(socket.userId, filtered);
  }

  logger.debug('[Socket] Connection removed', {
    userId: socket.userId,
    socketId: socket.id,
    remainingConnections: filtered.length,
  });
}

/**
 * Get all connections for a user
 */
export function getUserConnections(userId: string): ConnectionInfo[] {
  return connections.get(userId) || [];
}

/**
 * Check if a user is online
 */
export function isUserOnline(userId: string): boolean {
  return (connections.get(userId) || []).length > 0;
}

/**
 * Get total connection count
 */
export function getTotalConnections(): number {
  let total = 0;
  connections.forEach((conns) => {
    total += conns.length;
  });
  return total;
}

// ============================================
// ROOM MANAGEMENT
// ============================================

/**
 * Join user to their default rooms after authentication
 */
function joinDefaultRooms(socket: AuthenticatedSocket): void {
  // Join user-specific room
  const userRoom = getRoomName(RoomType.USER, socket.userId);
  socket.join(userRoom);
  logger.debug('[Socket] Joined user room', { userId: socket.userId, room: userRoom });

  // Join role-based rooms
  for (const role of socket.userRoles) {
    const roleRoom = getRoomName(RoomType.ROLE, role);
    socket.join(roleRoom);
    logger.debug('[Socket] Joined role room', { userId: socket.userId, room: roleRoom });
  }

  // Join district-based rooms (for district admins)
  if (socket.userDistricts && socket.userDistricts.length > 0) {
    for (const district of socket.userDistricts) {
      const districtRoom = getRoomName(RoomType.DISTRICT, district);
      socket.join(districtRoom);
      logger.debug('[Socket] Joined district room', { userId: socket.userId, room: districtRoom });
    }
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Register all socket event handlers
 */
export function registerSocketHandlers(
  io: SocketIOServer,
  socket: AuthenticatedSocket
): void {
  const contextLogger = logger.child(`[Socket:${socket.id}]`);

  // Add to connection tracking
  addConnection(socket);

  // Join default rooms
  joinDefaultRooms(socket);

  // Emit connected event
  socket.emit(ServerEvent.CONNECTED, {
    connectionId: socket.id,
    serverTime: new Date().toISOString(),
    message: 'Connected to FundifyHub real-time service',
  });

  // ----------------------------------------
  // Room Subscription Handlers
  // ----------------------------------------

  /**
   * Join a request room to receive updates for that request
   */
  socket.on(ClientEvent.JOIN_REQUEST, (requestId: string) => {
    if (!requestId || typeof requestId !== 'string') {
      socket.emit(ServerEvent.ERROR, {
        code: 'INVALID_REQUEST_ID',
        message: 'Invalid request ID provided',
      });
      return;
    }

    const requestRoom = getRoomName(RoomType.REQUEST, requestId);
    socket.join(requestRoom);
    contextLogger.debug('Joined request room', { requestId, room: requestRoom });
  });

  /**
   * Leave a request room
   */
  socket.on(ClientEvent.LEAVE_REQUEST, (requestId: string) => {
    if (!requestId || typeof requestId !== 'string') return;

    const requestRoom = getRoomName(RoomType.REQUEST, requestId);
    socket.leave(requestRoom);
    contextLogger.debug('Left request room', { requestId, room: requestRoom });
  });

  /**
   * Join a user's notification room (for watching another user's updates)
   * Only admins can do this
   */
  socket.on(ClientEvent.JOIN_USER, (targetUserId: string) => {
    if (!targetUserId || typeof targetUserId !== 'string') {
      socket.emit(ServerEvent.ERROR, {
        code: 'INVALID_USER_ID',
        message: 'Invalid user ID provided',
      });
      return;
    }

    // Only allow admins to watch other users
    const isAdmin = socket.userRoles.some((r) =>
      ['SUPER_ADMIN', 'DISTRICT_ADMIN'].includes(r)
    );

    if (!isAdmin && targetUserId !== socket.userId) {
      socket.emit(ServerEvent.ERROR, {
        code: 'PERMISSION_DENIED',
        message: 'You can only subscribe to your own updates',
      });
      return;
    }

    const userRoom = getRoomName(RoomType.USER, targetUserId);
    socket.join(userRoom);
    contextLogger.debug('Joined user room', { targetUserId, room: userRoom });
  });

  /**
   * Leave a user's notification room
   */
  socket.on(ClientEvent.LEAVE_USER, (targetUserId: string) => {
    if (!targetUserId || typeof targetUserId !== 'string') return;

    const userRoom = getRoomName(RoomType.USER, targetUserId);
    socket.leave(userRoom);
    contextLogger.debug('Left user room', { targetUserId, room: userRoom });
  });

  /**
   * Join an auction room to receive real-time bid updates
   */
  socket.on(ClientEvent.JOIN_AUCTION, (auctionId: string) => {
    if (!auctionId || typeof auctionId !== 'string') {
      socket.emit(ServerEvent.ERROR, {
        code: 'INVALID_AUCTION_ID',
        message: 'Invalid auction ID provided',
      });
      return;
    }

    const auctionRoom = getRoomName(RoomType.AUCTION, auctionId);
    socket.join(auctionRoom);
    contextLogger.debug('Joined auction room', { auctionId, room: auctionRoom });
  });

  /**
   * Leave an auction room
   */
  socket.on(ClientEvent.LEAVE_AUCTION, (auctionId: string) => {
    if (!auctionId || typeof auctionId !== 'string') return;

    const auctionRoom = getRoomName(RoomType.AUCTION, auctionId);
    socket.leave(auctionRoom);
    contextLogger.debug('Left auction room', { auctionId, room: auctionRoom });
  });

  /**
   * Ping handler for keepalive
   */
  socket.on(ClientEvent.PING, () => {
    // Update last activity
    const userConns = connections.get(socket.userId);
    if (userConns) {
      const conn = userConns.find((c) => c.socketId === socket.id);
      if (conn) {
        conn.lastActivity = new Date();
      }
    }
  });

  // ----------------------------------------
  // Disconnect Handler
  // ----------------------------------------

  socket.on('disconnect', (reason) => {
    removeConnection(socket);
    contextLogger.info('Socket disconnected', { reason, userId: socket.userId });
  });
}

// ============================================
// SERVER-SIDE EMIT HELPERS
// ============================================

let ioInstance: SocketIOServer | null = null;

/**
 * Set the Socket.IO server instance (called during initialization)
 */
export function setIOInstance(io: SocketIOServer): void {
  ioInstance = io;
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): SocketIOServer | null {
  return ioInstance;
}

/**
 * Emit request updated event to all watchers
 */
export function emitRequestUpdated(payload: RequestUpdatedPayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const requestRoom = getRoomName(RoomType.REQUEST, payload.requestId);
  ioInstance.to(requestRoom).emit(ServerEvent.REQUEST_UPDATED, payload);

  logger.debug('[Socket] Emitted request_updated', {
    requestId: payload.requestId,
    room: requestRoom,
  });
}

/**
 * Emit request status changed event
 */
export function emitRequestStatusChanged(payload: RequestStatusChangedPayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const requestRoom = getRoomName(RoomType.REQUEST, payload.requestId);
  ioInstance.to(requestRoom).emit(ServerEvent.REQUEST_STATUS_CHANGED, payload);

  logger.debug('[Socket] Emitted request_status_changed', {
    requestId: payload.requestId,
    newStatus: payload.newStatus,
    room: requestRoom,
  });
}

/**
 * Emit comment added event
 */
export function emitCommentAdded(payload: CommentAddedPayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const requestRoom = getRoomName(RoomType.REQUEST, payload.requestId);
  ioInstance.to(requestRoom).emit(ServerEvent.REQUEST_COMMENT_ADDED, payload);

  logger.debug('[Socket] Emitted comment_added', {
    requestId: payload.requestId,
    room: requestRoom,
  });
}

/**
 * Emit document uploaded event
 */
export function emitDocumentUploaded(payload: DocumentUploadedPayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const requestRoom = getRoomName(RoomType.REQUEST, payload.requestId);
  ioInstance.to(requestRoom).emit(ServerEvent.REQUEST_DOCUMENT_UPLOADED, payload);

  logger.debug('[Socket] Emitted document_uploaded', {
    requestId: payload.requestId,
    room: requestRoom,
  });
}

/**
 * Send notification to a specific user
 */
export function emitToUser(
  userId: string,
  event: string,
  data: unknown
): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const userRoom = getRoomName(RoomType.USER, userId);
  ioInstance.to(userRoom).emit(event, data);

  logger.debug('[Socket] Emitted to user', { userId, event, room: userRoom });
}

/**
 * Send notification to all users with a specific role
 */
export function emitToRole(
  role: string,
  event: string,
  data: unknown
): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const roleRoom = getRoomName(RoomType.ROLE, role);
  ioInstance.to(roleRoom).emit(event, data);

  logger.debug('[Socket] Emitted to role', { role, event, room: roleRoom });
}

/**
 * Send notification to all users in a district
 */
export function emitToDistrict(
  district: string,
  event: string,
  data: unknown
): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const districtRoom = getRoomName(RoomType.DISTRICT, district);
  ioInstance.to(districtRoom).emit(event, data);

  logger.debug('[Socket] Emitted to district', { district, event, room: districtRoom });
}

/**
 * Broadcast to all connected clients
 */
export function broadcast(event: string, data: unknown): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping broadcast');
    return;
  }

  ioInstance.emit(event, data);
  logger.debug('[Socket] Broadcasted event', { event });
}

// ============================================
// AUCTION EMIT HELPERS
// ============================================

/**
 * Emit new bid to all auction watchers
 */
export function emitAuctionBid(payload: AuctionBidPayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const auctionRoom = getRoomName(RoomType.AUCTION, payload.auctionId);
  ioInstance.to(auctionRoom).emit(ServerEvent.AUCTION_BID_PLACED, payload);

  logger.debug('[Socket] Emitted auction_bid', {
    auctionId: payload.auctionId,
    bidAmount: payload.bid.amount,
    room: auctionRoom,
  });
}

/**
 * Notify a user they've been outbid
 */
export function emitAuctionOutbid(userId: string, payload: AuctionOutbidPayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const userRoom = getRoomName(RoomType.USER, userId);
  ioInstance.to(userRoom).emit(ServerEvent.AUCTION_OUTBID, payload);

  logger.debug('[Socket] Emitted auction_outbid', {
    userId,
    auctionId: payload.auctionId,
    room: userRoom,
  });
}

/**
 * Emit auction ended to all watchers
 */
export function emitAuctionEnded(payload: AuctionEndedPayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const auctionRoom = getRoomName(RoomType.AUCTION, payload.auctionId);
  ioInstance.to(auctionRoom).emit(ServerEvent.AUCTION_ENDED, payload);

  logger.debug('[Socket] Emitted auction_ended', {
    auctionId: payload.auctionId,
    status: payload.status,
    room: auctionRoom,
  });
}

/**
 * Notify auction winner
 */
export function emitAuctionWon(userId: string, payload: { auctionId: string; auctionTitle: string; assetId: string; winningBid: number; nextSteps: string }): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const userRoom = getRoomName(RoomType.USER, userId);
  ioInstance.to(userRoom).emit(ServerEvent.AUCTION_WON, payload);

  logger.debug('[Socket] Emitted auction_won', {
    userId,
    auctionId: payload.auctionId,
    room: userRoom,
  });
}

// ============================================
// PAYMENT EMIT HELPERS
// ============================================

export interface PaymentReceivedPayload {
  paymentId: string;
  loanId: string;
  requestId: string;
  amount: number;
  emiNumber: number;
  remainingEmis: number;
  isLoanCompleted: boolean;
  paidAt: string;
}

/**
 * Emit payment received event to the customer
 */
export function emitPaymentReceived(userId: string, payload: PaymentReceivedPayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const userRoom = getRoomName(RoomType.USER, userId);
  ioInstance.to(userRoom).emit(ServerEvent.PAYMENT_RECEIVED, payload);

  // Also emit to the request room for admins watching
  const requestRoom = getRoomName(RoomType.REQUEST, payload.requestId);
  ioInstance.to(requestRoom).emit(ServerEvent.PAYMENT_RECEIVED, payload);

  logger.debug('[Socket] Emitted payment_received', {
    userId,
    loanId: payload.loanId,
    amount: payload.amount,
    emiNumber: payload.emiNumber,
  });
}

export interface EMIReminderPayload {
  loanId: string;
  requestId: string;
  emiNumber: number;
  emiAmount: number;
  dueDate: string;
  daysUntilDue: number;
}

/**
 * Emit EMI reminder to customer
 */
export function emitEMIReminder(userId: string, payload: EMIReminderPayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const userRoom = getRoomName(RoomType.USER, userId);
  ioInstance.to(userRoom).emit(ServerEvent.EMI_REMINDER, payload);

  logger.debug('[Socket] Emitted emi_reminder', {
    userId,
    loanId: payload.loanId,
    emiNumber: payload.emiNumber,
  });
}

export interface EMIOverduePayload {
  loanId: string;
  requestId: string;
  emiNumber: number;
  emiAmount: number;
  dueDate: string;
  daysOverdue: number;
  penaltyAmount: number;
}

/**
 * Emit EMI overdue notification to customer
 */
export function emitEMIOverdue(userId: string, payload: EMIOverduePayload): void {
  if (!ioInstance) {
    logger.warn('[Socket] IO instance not initialized, skipping emit');
    return;
  }

  const userRoom = getRoomName(RoomType.USER, userId);
  ioInstance.to(userRoom).emit(ServerEvent.EMI_OVERDUE, payload);

  logger.debug('[Socket] Emitted emi_overdue', {
    userId,
    loanId: payload.loanId,
    emiNumber: payload.emiNumber,
    daysOverdue: payload.daysOverdue,
  });
}
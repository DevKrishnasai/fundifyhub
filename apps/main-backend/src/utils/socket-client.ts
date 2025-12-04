/**
 * Socket Client for Main Backend
 *
 * CONSOLIDATED ARCHITECTURE: WebSocket server now runs in the same process
 * as the main backend. This module provides a simple API for emitting
 * real-time events from controllers/services.
 *
 * Internally delegates to the socket/handlers module which manages
 * the Socket.IO server instance.
 */

import {
  emitRequestUpdated as socketEmitRequestUpdated,
  emitRequestStatusChanged as socketEmitRequestStatusChanged,
  emitCommentAdded as socketEmitCommentAdded,
  emitDocumentUploaded as socketEmitDocumentUploaded,
  emitToUser,
  emitToRole,
  getIO,
} from '../socket';
import logger from './logger';
import {
  type RequestUpdatedPayload,
  type RequestStatusChangedPayload,
  type CommentAddedPayload,
  type DocumentUploadedPayload,
  REQUEST_STATUS,
  ServerEvent,
} from '@fundifyhub/types';

/** Internal notification payload (different from socket-types NotificationPayload) */
interface InternalNotificationPayload {
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// ============================================
// PUBLIC API - REQUEST EVENTS
// ============================================

/**
 * Emit request updated event
 * Called when any field on a request changes
 */
export function emitRequestUpdated(payload: {
  requestId: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  status?: string;
  message?: string;
  updatedBy?: {
    id: string;
    name: string;
    role: string;
  };
}): void {
  try {
    const io = getIO();
    if (!io) {
      logger.debug('[SocketClient] Socket not initialized, skipping emit');
      return;
    }

    const eventPayload: RequestUpdatedPayload = {
      requestId: payload.requestId,
      field: payload.field,
      oldValue: payload.oldValue,
      newValue: payload.newValue,
      status: payload.status,
      message: payload.message,
      updatedBy: payload.updatedBy,
      timestamp: new Date().toISOString(),
    };

    socketEmitRequestUpdated(eventPayload);
    logger.debug('[SocketClient] Emitted request_updated', { requestId: payload.requestId });
  } catch (error) {
    logger.error('[SocketClient] Failed to emit request_updated', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Emit request status changed event
 * Called when a request transitions between statuses
 * Supports both old REQUEST_STATUS and new stage:subStatus format
 */
export function emitRequestStatusChanged(payload: {
  requestId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: {
    id: string;
    name: string;
    role: string;
  };
  reason?: string;
}): void {
  try {
    const io = getIO();
    if (!io) {
      logger.debug('[SocketClient] Socket not initialized, skipping emit');
      return;
    }

    const eventPayload: RequestStatusChangedPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    socketEmitRequestStatusChanged(eventPayload);
    logger.debug('[SocketClient] Emitted request_status_changed', { requestId: payload.requestId, newStatus: payload.newStatus });
  } catch (error) {
    logger.error('[SocketClient] Failed to emit request_status_changed', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Emit request comment added event
 * Called when a comment is added to a request
 */
export function emitRequestCommentAdded(payload: {
  requestId: string;
  comment: {
    id: string;
    content: string;
    isInternal: boolean;
    createdAt: string;
  };
  author: {
    id: string;
    name: string;
    role: string;
  };
}): void {
  try {
    const io = getIO();
    if (!io) {
      logger.debug('[SocketClient] Socket not initialized, skipping emit');
      return;
    }

    const eventPayload: CommentAddedPayload = {
      requestId: payload.requestId,
      comment: payload.comment,
      author: payload.author,
      timestamp: new Date().toISOString(),
    };

    socketEmitCommentAdded(eventPayload);
    logger.debug('[SocketClient] Emitted request_comment_added', { requestId: payload.requestId });
  } catch (error) {
    logger.error('[SocketClient] Failed to emit request_comment_added', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Emit request document uploaded event
 * Called when a document is uploaded to a request
 */
export function emitRequestDocumentUploaded(payload: {
  requestId: string;
  document: {
    id: string;
    type: string;
    fileName: string;
    uploadedAt: string;
  };
  uploadedBy: {
    id: string;
    name: string;
    role: string;
  };
}): void {
  try {
    const io = getIO();
    if (!io) {
      logger.debug('[SocketClient] Socket not initialized, skipping emit');
      return;
    }

    const eventPayload: DocumentUploadedPayload = {
      requestId: payload.requestId,
      document: payload.document,
      uploadedBy: payload.uploadedBy,
      timestamp: new Date().toISOString(),
    };

    socketEmitDocumentUploaded(eventPayload);
    logger.debug('[SocketClient] Emitted request_document_uploaded', { requestId: payload.requestId });
  } catch (error) {
    logger.error('[SocketClient] Failed to emit request_document_uploaded', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Emit notification to specific user
 * Delivers real-time notification via socket
 */
export function emitUserNotification(payload: {
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}): void {
  try {
    const io = getIO();
    if (!io) {
      logger.debug('[SocketClient] Socket not initialized, skipping notification emit');
      return;
    }

    const notificationPayload: InternalNotificationPayload = {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      timestamp: new Date().toISOString(),
    };

    emitToUser(payload.userId, ServerEvent.NOTIFICATION_NEW, notificationPayload);
    logger.debug('[SocketClient] Emitted notification to user', { userId: payload.userId });
  } catch (error) {
    logger.error('[SocketClient] Failed to emit notification', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Emit notification to all users with a specific role
 */
export function emitRoleNotification(payload: {
  role: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}): void {
  try {
    const io = getIO();
    if (!io) {
      logger.debug('[SocketClient] Socket not initialized, skipping role notification emit');
      return;
    }

    const notificationPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    emitToRole(payload.role, ServerEvent.NOTIFICATION_NEW, notificationPayload);
    logger.debug('[SocketClient] Emitted role notification', { role: payload.role });
  } catch (error) {
    logger.error('[SocketClient] Failed to emit role notification', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Broadcast to all users viewing a specific request
 * Useful for collaborative updates
 */
export function emitToRequest(requestId: string, event: string, data: unknown): void {
  try {
    const io = getIO();
    if (!io) {
      logger.debug('[SocketClient] Socket not initialized, skipping request emit');
      return;
    }

    // Import from socket handlers to get room name helper
    const { RoomType, getRoomName } = require('../socket/types');
    const room = getRoomName(RoomType.REQUEST, requestId);
    io.to(room).emit(event, data);

    logger.debug('[SocketClient] Emitted to request room', { requestId });
  } catch (error) {
    logger.error('[SocketClient] Failed to emit to request', error instanceof Error ? error : new Error(String(error)));
  }
}

// ============================================
// LIFECYCLE (No-ops for backwards compatibility)
// ============================================

/**
 * Initialize socket connection
 * @deprecated Socket is now initialized in server.ts via initializeSocketServer
 */
export function initializeSocketClient(): void {
  logger.debug('[SocketClient] Socket is now consolidated into main server - no separate initialization needed');
}

/**
 * Close socket connection
 * @deprecated Socket is now shut down in server.ts via shutdownSocketServer
 */
export function closeSocketClient(): void {
  logger.debug('[SocketClient] Socket shutdown is handled by main server');
}

// ============================================
// EXPORTS
// ============================================

export const socketClient = {
  emitRequestUpdated,
  emitRequestStatusChanged,
  emitUserNotification,
  emitRoleNotification,
  emitToRequest,
  initialize: initializeSocketClient,
  close: closeSocketClient,
};

export default socketClient;

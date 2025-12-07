'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSocket, useSocketEvent } from './useSocket';
import { ServerEvent } from '@fundifyhub/types';

/**
 * Specialized hook for real-time request updates via WebSocket
 * Handles joining/leaving request rooms and processing updates
 */

interface RequestUpdatePayload {
  requestId: string;
  status?: string;
  updatedAt?: string;
  updatedBy?: string;
  changeType?: 'status' | 'document' | 'comment' | 'assignment' | 'offer' | 'payment';
  metadata?: Record<string, unknown>;
}

interface UseRequestSocketOptions {
  /** Callback when request is updated */
  onUpdate?: (payload: RequestUpdatePayload) => void;
  /** Callback when a new comment is added */
  onComment?: (comment: { id: string; content: string; authorId: string }) => void;
  /** Callback when a document is uploaded */
  onDocument?: (document: { id: string; fileName: string; uploadedBy: string }) => void;
  /** Callback when status changes */
  onStatusChange?: (newStatus: string, previousStatus: string) => void;
  /** Whether to auto-refresh data on update (default: false) */
  autoRefresh?: boolean;
  /** Callback to trigger data refresh */
  onRefreshNeeded?: () => void;
  /** Enable debug logging */
  debug?: boolean;
}

interface UseRequestSocketReturn {
  /** Whether socket is connected */
  isConnected: boolean;
  /** Whether authenticated with socket server */
  isAuthenticated: boolean;
  /** Join the request room (call on mount) */
  join: () => void;
  /** Leave the request room (call on unmount) */
  leave: () => void;
  /** Whether currently in the request room */
  isInRoom: boolean;
}

/**
 * Hook for subscribing to real-time updates for a specific request
 * 
 * @example
 * ```tsx
 * const { isConnected, join, leave } = useRequestSocket(requestId, {
 *   onUpdate: (payload) => {
 *     console.log('Request updated:', payload);
 *   },
 *   onStatusChange: (newStatus, oldStatus) => {
 *     toast.info(`Status changed from ${oldStatus} to ${newStatus}`);
 *     refetchRequest();
 *   },
 *   onComment: (comment) => {
 *     setComments(prev => [...prev, comment]);
 *   },
 * });
 * 
 * // Join room on mount
 * useEffect(() => {
 *   join();
 *   return () => leave();
 * }, [join, leave]);
 * ```
 */
export function useRequestSocket(
  requestId: string | null | undefined,
  options: UseRequestSocketOptions = {}
): UseRequestSocketReturn {
  const {
    onUpdate,
    onComment,
    onDocument,
    onStatusChange,
    autoRefresh = false,
    onRefreshNeeded,
    debug = false,
  } = options;

  const { isConnected, isAuthenticated, joinRequest, leaveRequest, socket } = useSocket();
  const isInRoomRef = useRef(false);
  const previousStatusRef = useRef<string | null>(null);

  // Debug logger
  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[useRequestSocket]', ...args);
    }
  }, [debug]);

  // Handle request updates
  const handleRequestUpdate = useCallback((payload: RequestUpdatePayload) => {
    // Only process updates for our request
    if (payload.requestId !== requestId) return;

    log('Received update:', payload);

    // Call general update handler
    onUpdate?.(payload);

    // Handle status changes specifically
    if (payload.changeType === 'status' && payload.status) {
      const prevStatus = previousStatusRef.current;
      if (prevStatus && prevStatus !== payload.status) {
        onStatusChange?.(payload.status, prevStatus);
      }
      previousStatusRef.current = payload.status;
    }

    // Trigger refresh if enabled
    if (autoRefresh) {
      onRefreshNeeded?.();
    }
  }, [requestId, onUpdate, onStatusChange, autoRefresh, onRefreshNeeded, log]);

  // Handle new comments
  const handleNewComment = useCallback((comment: { id: string; content: string; authorId: string; requestId: string }) => {
    if (comment.requestId !== requestId) return;
    log('Received comment:', comment);
    onComment?.(comment);
  }, [requestId, onComment, log]);

  // Handle new documents
  const handleNewDocument = useCallback((document: { id: string; fileName: string; uploadedBy: string; requestId: string }) => {
    if (document.requestId !== requestId) return;
    log('Received document:', document);
    onDocument?.(document);
  }, [requestId, onDocument, log]);

  // Subscribe to events
  useSocketEvent(ServerEvent.REQUEST_UPDATED, handleRequestUpdate);
  useSocketEvent(ServerEvent.REQUEST_COMMENT_ADDED, handleNewComment);
  useSocketEvent(ServerEvent.REQUEST_DOCUMENT_UPLOADED, handleNewDocument);

  // Join request room
  const join = useCallback(() => {
    if (!requestId || isInRoomRef.current) return;
    
    log('Joining room for request:', requestId);
    joinRequest(requestId);
    isInRoomRef.current = true;
  }, [requestId, joinRequest, log]);

  // Leave request room
  const leave = useCallback(() => {
    if (!requestId || !isInRoomRef.current) return;
    
    log('Leaving room for request:', requestId);
    leaveRequest(requestId);
    isInRoomRef.current = false;
  }, [requestId, leaveRequest, log]);

  // Auto-join/leave on requestId change
  useEffect(() => {
    if (!requestId || !isConnected) return;

    // Join the room
    join();

    // Leave on cleanup
    return () => {
      leave();
    };
  }, [requestId, isConnected, join, leave]);

  // Re-join if connection is re-established
  useEffect(() => {
    if (isConnected && requestId && !isInRoomRef.current) {
      join();
    }
  }, [isConnected, requestId, join]);

  return {
    isConnected,
    isAuthenticated,
    join,
    leave,
    isInRoom: isInRoomRef.current,
  };
}

export default useRequestSocket;

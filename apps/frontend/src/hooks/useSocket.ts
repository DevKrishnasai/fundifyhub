/**
 * Socket.IO Client Hook for FundifyHub Frontend
 *
 * Provides a robust WebSocket connection with:
 * - Automatic reconnection
 * - Authentication handling
 * - Event subscription helpers
 * - Graceful error handling (never breaks the app)
 *
 * Usage:
 * ```tsx
 * const { isConnected, socket, joinRequest } = useSocket();
 *
 * useSocketEvent(ServerEvent.REQUEST_UPDATED, (data) => {
 *   console.log('Request updated:', data);
 * });
 * ```
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ServerEvent,
  ClientEvent,
  DEFAULT_SOCKET_OPTIONS,
  type ConnectedPayload,
  type AuthResult,
} from '@fundifyhub/types';
import { useAuth } from '@/contexts/AuthContext';
import config from '@/lib/config';

// ============================================
// TYPES
// ============================================

interface UseSocketReturn {
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Whether the socket is authenticated */
  isAuthenticated: boolean;
  /** Connection ID from server */
  connectionId: string | null;
  /** Raw socket instance (use with caution) */
  socket: Socket | null;
  /** Join a request room for real-time updates */
  joinRequest: (requestId: string) => void;
  /** Leave a request room */
  leaveRequest: (requestId: string) => void;
  /** Manually reconnect */
  reconnect: () => void;
}

interface SocketState {
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionId: string | null;
}

// ============================================
// SINGLETON SOCKET INSTANCE
// ============================================

let socketInstance: Socket | null = null;
let socketInitPromise: Promise<Socket> | null = null;

/**
 * Get or create the socket instance (singleton pattern)
 */
function getSocket(wsUrl: string): Socket {
  if (!socketInstance) {
    socketInstance = io(wsUrl, {
      ...DEFAULT_SOCKET_OPTIONS,
      autoConnect: false, // We'll connect manually after setting auth
    });
  }
  return socketInstance;
}

// ============================================
// MAIN HOOK
// ============================================

export function useSocket(): UseSocketReturn {
  const { user, isLoggedIn } = useAuth();
  const [state, setState] = useState<SocketState>({
    isConnected: false,
    isAuthenticated: false,
    connectionId: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get WebSocket URL from config (auto-derived from API URL if not set)
  const wsUrl = config.public.wsUrl;

  /**
   * Initialize socket connection
   */
  useEffect(() => {
    // Skip if no wsUrl configured
    if (!wsUrl) {
      console.warn('[Socket] No WS_URL configured, skipping socket connection');
      return;
    }

    try {
      const socket = getSocket(wsUrl);
      socketRef.current = socket;

      // Set up event handlers
      const handleConnect = () => {
        console.log('[Socket] Connected');
        setState((prev) => ({ ...prev, isConnected: true }));
      };

      const handleDisconnect = (reason: string) => {
        console.log('[Socket] Disconnected:', reason);
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isAuthenticated: false,
        }));
      };

      const handleConnected = (data: ConnectedPayload) => {
        console.log('[Socket] Server welcome:', data.message);
        setState((prev) => ({ ...prev, connectionId: data.connectionId }));
      };

      const handleAuthenticated = (result: AuthResult) => {
        if (result.success) {
          console.log('[Socket] Authenticated successfully');
          setState((prev) => ({ ...prev, isAuthenticated: true }));
        } else {
          console.warn('[Socket] Authentication failed:', result.error);
          setState((prev) => ({ ...prev, isAuthenticated: false }));
        }
      };

      const handleError = (error: unknown) => {
        console.error('[Socket] Error:', error);
        // Don't crash - just log the error
      };

      const handleConnectError = (error: Error) => {
        console.warn('[Socket] Connection error:', error.message);
        // Socket.IO will automatically retry
      };

      // Attach handlers
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on(ServerEvent.CONNECTED, handleConnected);
      socket.on('authenticated', handleAuthenticated);
      socket.on(ServerEvent.ERROR, handleError);
      socket.on('connect_error', handleConnectError);

      // Connect with auth token if logged in
      if (isLoggedIn && user) {
        // Get token from cookie or storage
        const token = getAuthToken();
        if (token) {
          socket.auth = { token };
          console.log('[Socket] Setting auth token');
        }
      }

      // Connect if not already connected
      if (!socket.connected) {
        socket.connect();
      }

      // Cleanup
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off(ServerEvent.CONNECTED, handleConnected);
        socket.off('authenticated', handleAuthenticated);
        socket.off(ServerEvent.ERROR, handleError);
        socket.off('connect_error', handleConnectError);
      };
    } catch (error) {
      console.error('[Socket] Failed to initialize:', error);
      // Don't throw - just log and continue
    }
  }, [wsUrl, isLoggedIn, user]);

  /**
   * Re-authenticate when user changes or socket connects
   */
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    if (isLoggedIn && user) {
      const token = getAuthToken();
      if (token) {
        console.log('[Socket] Sending authentication via event');
        socket.emit(ClientEvent.AUTHENTICATE, { token });
      } else {
        console.log('[Socket] No socket token found in cookies');
      }
    }
  }, [isLoggedIn, user, state.isConnected]);

  /**
   * Join a request room
   */
  const joinRequest = useCallback((requestId: string) => {
    try {
      socketRef.current?.emit(ClientEvent.JOIN_REQUEST, requestId);
    } catch (error) {
      console.error('[Socket] Failed to join request room:', error);
    }
  }, []);

  /**
   * Leave a request room
   */
  const leaveRequest = useCallback((requestId: string) => {
    try {
      socketRef.current?.emit(ClientEvent.LEAVE_REQUEST, requestId);
    } catch (error) {
      console.error('[Socket] Failed to leave request room:', error);
    }
  }, []);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    try {
      const socket = socketRef.current;
      if (socket) {
        socket.disconnect();
        socket.connect();
      }
    } catch (error) {
      console.error('[Socket] Failed to reconnect:', error);
    }
  }, []);

  return {
    isConnected: state.isConnected,
    isAuthenticated: state.isAuthenticated,
    connectionId: state.connectionId,
    socket: socketRef.current,
    joinRequest,
    leaveRequest,
    reconnect,
  };
}

// ============================================
// EVENT SUBSCRIPTION HOOK
// ============================================

/**
 * Subscribe to a socket event
 *
 * @example
 * useSocketEvent(ServerEvent.REQUEST_UPDATED, (data) => {
 *   refetchRequest();
 * });
 */
export function useSocketEvent<T = unknown>(
  event: ServerEvent | string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
): void {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) {
      console.log(`[Socket] Cannot subscribe to ${event}: socket=${!!socket}, isConnected=${isConnected}`);
      return;
    }

    try {
      console.log(`[Socket] Subscribing to event: ${event}`);
      socket.on(event, handler);
      return () => {
        console.log(`[Socket] Unsubscribing from event: ${event}`);
        socket.off(event, handler);
      };
    } catch (error) {
      console.error(`[Socket] Failed to subscribe to ${event}:`, error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, event, ...deps]);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get auth token from cookies
 * Uses socketToken cookie (non-httpOnly) set during login
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // Get socketToken from cookie (non-httpOnly, specifically for WebSocket auth)
    const cookies = document.cookie.split(';');
    console.log('[Socket] Looking for socketToken in cookies:', cookies.map(c => c.trim().split('=')[0]));
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'socketToken') {
        console.log('[Socket] Found socketToken');
        return decodeURIComponent(value);
      }
    }

    console.log('[Socket] socketToken not found - user needs to re-login');
    return null;
  } catch {
    return null;
  }
}

// ============================================
// EXPORTS
// ============================================

export default useSocket;

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import config from '@/lib/config';
import { ServerEvent, ClientEvent } from '@fundifyhub/types';
import { toast } from 'sonner';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isFallbackMode: boolean;
  subscribe: (event: string, callback: (data: any) => void) => void;
  unsubscribe: (event: string, callback: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  
  // Store event listeners to re-attach if socket reconnects
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  // Initialize socket connection
  useEffect(() => {
    // Only connect if logged in and we have a WS URL
    if (!isLoggedIn || !user || !config.public.wsUrl) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Don't reconnect if already connected with same user (unless token changed? AuthContext handles that by re-rendering)
    if (socket?.connected) {
      return;
    }

    const socketInstance = io(config.public.wsUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: document.cookie.replace(/(?:^|.*;\s*)token\s*=\s*([^;]*).*$|^.*$/, "$1") // Try to get token from cookie if possible, or let AuthContext handle it
        // Note: Ideally we should get the token from AuthContext or a secure storage
        // For now, we rely on the cookie or the fact that the browser sends cookies with the handshake request
      },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
      setIsFallbackMode(false);
      
      // Authenticate if needed (though handshake auth is preferred)
      // socketInstance.emit(ClientEvent.AUTHENTICATE, { token: ... });
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server disconnected us, maybe auth failed
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
      setIsFallbackMode(true);
    });

    // Attach existing listeners
    listenersRef.current.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        socketInstance.on(event, callback);
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isLoggedIn, user]);

  // Subscribe to events
  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)?.add(callback);

    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  // Unsubscribe from events
  const unsubscribe = useCallback((event: string, callback: (data: any) => void) => {
    const callbacks = listenersRef.current.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        listenersRef.current.delete(event);
      }
    }

    if (socket) {
      socket.off(event, callback);
    }
  }, [socket]);

  // Global event handlers (e.g. notifications)
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: any) => {
      toast.info(data.title || 'New Notification', {
        description: data.message,
      });
    };

    socket.on(ServerEvent.NOTIFICATION_NEW, handleNewNotification);

    return () => {
      socket.off(ServerEvent.NOTIFICATION_NEW, handleNewNotification);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      isConnected, 
      isFallbackMode,
      subscribe,
      unsubscribe 
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

/**
 * Hook to subscribe to a specific socket event with automatic cleanup
 * and fallback polling support (optional)
 */
export function useSocketEvent<T>(
  event: string, 
  callback: (data: T) => void, 
  fallbackFetcher?: () => Promise<T>,
  pollingInterval = 30000
) {
  const { socket, isConnected, subscribe, unsubscribe, isFallbackMode } = useSocket();
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (data: T) => savedCallback.current(data);
    subscribe(event, handler);
    return () => unsubscribe(event, handler);
  }, [subscribe, unsubscribe, event]);

  // Polling fallback
  useEffect(() => {
    if ((!isConnected || isFallbackMode) && fallbackFetcher) {
      // Initial fetch
      fallbackFetcher().then(data => savedCallback.current(data)).catch(console.error);

      const interval = setInterval(() => {
        fallbackFetcher().then(data => savedCallback.current(data)).catch(console.error);
      }, pollingInterval);

      return () => clearInterval(interval);
    }
  }, [isConnected, isFallbackMode, fallbackFetcher, pollingInterval]);
}

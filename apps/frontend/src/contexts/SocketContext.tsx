"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import config from '@/lib/config';
import { ServerEvent, ClientEvent, NotificationPayload, NotificationCountPayload, PaymentReceivedPayload, EmiReminderPayload } from '@fundifyhub/types';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Generic event handler type for socket events
 * Uses unknown instead of any for type safety - handlers should narrow the type
 */
type SocketEventHandler<T = unknown> = (data: T) => void;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isFallbackMode: boolean;
  subscribe: <T = unknown>(event: string, callback: SocketEventHandler<T>) => void;
  unsubscribe: <T = unknown>(event: string, callback: SocketEventHandler<T>) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  
  // Store event listeners to re-attach if socket reconnects
  // Socket.IO handlers require flexible typing for internal storage,
  // type safety is enforced at subscribe/unsubscribe boundary
  const listenersRef = useRef<Map<string, Set<SocketEventHandler>>>(new Map());
  // Track joined rooms for reconnection
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  // Track socket instance to avoid recreating when already connected
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    // Only connect if logged in and we have a WS URL
    if (!isLoggedIn || !user || !config.public.wsUrl) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Don't reconnect if already connected with same user
    if (socketRef.current?.connected) {
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
      
      // Join user room for personalized notifications
      if (user?.id) {
        socketInstance.emit(ClientEvent.JOIN_USER, user.id);
        joinedRoomsRef.current.add(`user:${user.id}`);
      }
      
      // Re-join any rooms we were previously in (after reconnect)
      joinedRoomsRef.current.forEach(room => {
        if (room.startsWith('request:')) {
          socketInstance.emit(ClientEvent.JOIN_REQUEST, room.replace('request:', ''));
        } else if (room.startsWith('auction:')) {
          socketInstance.emit(ClientEvent.JOIN_AUCTION, room.replace('auction:', ''));
        }
      });
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

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [isLoggedIn, user]);

  // Subscribe to events
  const subscribe = useCallback(<T = unknown>(event: string, callback: SocketEventHandler<T>) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)?.add(callback as SocketEventHandler);

    if (socket) {
      socket.on(event, callback as SocketEventHandler);
    }
  }, [socket]);

  // Unsubscribe from events
  const unsubscribe = useCallback(<T = unknown>(event: string, callback: SocketEventHandler<T>) => {
    const callbacks = listenersRef.current.get(event);
    if (callbacks) {
      callbacks.delete(callback as SocketEventHandler);
      if (callbacks.size === 0) {
        listenersRef.current.delete(event);
      }
    }

    if (socket) {
      socket.off(event, callback as SocketEventHandler);
    }
  }, [socket]);

  // Join a room (request, auction, etc.)
  const joinRoom = useCallback((room: string) => {
    if (!socket) return;
    
    if (room.startsWith('request:')) {
      socket.emit(ClientEvent.JOIN_REQUEST, room.replace('request:', ''));
    } else if (room.startsWith('auction:')) {
      socket.emit(ClientEvent.JOIN_AUCTION, room.replace('auction:', ''));
    }
    joinedRoomsRef.current.add(room);
  }, [socket]);

  // Leave a room
  const leaveRoom = useCallback((room: string) => {
    if (!socket) return;
    
    if (room.startsWith('request:')) {
      socket.emit(ClientEvent.LEAVE_REQUEST, room.replace('request:', ''));
    } else if (room.startsWith('auction:')) {
      socket.emit(ClientEvent.LEAVE_AUCTION, room.replace('auction:', ''));
    }
    joinedRoomsRef.current.delete(room);
  }, [socket]);

  // Global event handlers (e.g. notifications, payments)
  useEffect(() => {
    if (!socket) return;

    // Handle new notification - show toast and invalidate cache
    const handleNewNotification = (data: NotificationPayload) => {
      toast.info(data.title || 'New Notification', {
        description: data.message,
      });
      // Invalidate notification queries to update badge count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    // Handle notification count update
    const handleNotificationCount = (data: NotificationCountPayload) => {
      // Update the unread count in cache
      queryClient.setQueryData(['notifications', 'unreadCount'], data.unreadCount);
    };

    // Handle payment received - show toast and invalidate relevant queries
    const handlePaymentReceived = (data: PaymentReceivedPayload) => {
      const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(data.amount);
      
      toast.success('Payment Received!', {
        description: `EMI #${data.emiNumber} of ${formattedAmount} has been confirmed. ${data.remainingEmis} EMIs remaining.`,
      });
      
      // Invalidate loan and request queries to reflect updated payment status
      queryClient.invalidateQueries({ queryKey: ['requests', data.requestId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    };

    // Handle EMI reminder
    const handleEmiReminder = (data: EmiReminderPayload) => {
      const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(data.amount);
      
      toast.warning('EMI Reminder', {
        description: `Your EMI of ${formattedAmount} is due in ${data.daysUntilDue} day${data.daysUntilDue === 1 ? '' : 's'}.`,
      });
    };

    socket.on(ServerEvent.NOTIFICATION_NEW, handleNewNotification);
    socket.on(ServerEvent.NOTIFICATION_COUNT, handleNotificationCount);
    socket.on(ServerEvent.PAYMENT_RECEIVED, handlePaymentReceived);
    socket.on(ServerEvent.EMI_REMINDER, handleEmiReminder);

    return () => {
      socket.off(ServerEvent.NOTIFICATION_NEW, handleNewNotification);
      socket.off(ServerEvent.NOTIFICATION_COUNT, handleNotificationCount);
      socket.off(ServerEvent.PAYMENT_RECEIVED, handlePaymentReceived);
      socket.off(ServerEvent.EMI_REMINDER, handleEmiReminder);
    };
  }, [socket, queryClient]);

  return (
    <SocketContext.Provider value={{ 
      socket, 
      isConnected, 
      isFallbackMode,
      subscribe,
      unsubscribe,
      joinRoom,
      leaveRoom,
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

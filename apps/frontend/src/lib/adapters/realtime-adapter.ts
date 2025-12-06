/**
 * Realtime Adapter
 *
 * Abstraction layer for Socket.IO realtime communication.
 *
 * @module lib/adapters/realtime
 */
import { io, Socket } from 'socket.io-client';
import { ClientEvent, ServerEvent } from '@fundifyhub/types';

// TODO: (agent) Get from env
const URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

const socket: Socket = io(URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: false, // Connect manually
});

socket.on('connect', () => {
  console.log('[Realtime] Connected to socket server');
});

socket.on('disconnect', (reason) => {
  console.log(`[Realtime] Disconnected: ${reason}`);
});

export const realtimeAdapter = {
  connect(token: string) {
    if (socket.connected) return;
    socket.auth = { token };
    socket.connect();
  },

  disconnect() {
    socket.disconnect();
  },

  joinRequestRoom(requestId: string) {
    socket.emit(ClientEvent.JOIN_REQUEST, requestId);
  },

  leaveRequestRoom(requestId: string) {
    socket.emit(ClientEvent.LEAVE_REQUEST, requestId);
  },

  joinAuctionRoom(auctionId: string) {
    socket.emit(ClientEvent.JOIN_AUCTION, auctionId);
  },

  leaveAuctionRoom(auctionId: string) {
    socket.emit(ClientEvent.LEAVE_AUCTION, auctionId);
  },

  onRequestUpdate(callback: (payload: any) => void) {
    socket.on(ServerEvent.REQUEST_UPDATED, callback);
    return () => socket.off(ServerEvent.REQUEST_UPDATED, callback);
  },

  onLoanUpdate(callback: (payload: unknown) => void) {
    socket.on(ServerEvent.LOAN_UPDATED, callback);
    return () => socket.off(ServerEvent.LOAN_UPDATED, callback);
  },

  onAuctionBidPlaced(callback: (payload: unknown) => void) {
    socket.on(ServerEvent.AUCTION_BID_PLACED, callback);
    return () => socket.off(ServerEvent.AUCTION_BID_PLACED, callback);
  },

  onAuctionOutbid(callback: (payload: unknown) => void) {
    socket.on(ServerEvent.AUCTION_OUTBID, callback);
    return () => socket.off(ServerEvent.AUCTION_OUTBID, callback);
  },

  onAuctionExtended(callback: (payload: unknown) => void) {
    socket.on(ServerEvent.AUCTION_EXTENDED, callback);
    return () => socket.off(ServerEvent.AUCTION_EXTENDED, callback);
  },

  onAuctionEnded(callback: (payload: unknown) => void) {
    socket.on(ServerEvent.AUCTION_ENDED, callback);
    return () => socket.off(ServerEvent.AUCTION_ENDED, callback);
  },

  onAuctionWon(callback: (payload: unknown) => void) {
    socket.on(ServerEvent.AUCTION_WON, callback);
    return () => socket.off(ServerEvent.AUCTION_WON, callback);
  },

  onNewNotification(callback: (payload: unknown) => void) {
    socket.on(ServerEvent.NEW_NOTIFICATION, callback);
    return () => socket.off(ServerEvent.NEW_NOTIFICATION, callback);
  },

  /**
   * Generic event subscription helper
   */
  on<TPayload = unknown>(event: ServerEvent | string, callback: (payload: TPayload) => void) {
    socket.on(event, callback as (payload: unknown) => void);
    return () => socket.off(event, callback as (payload: unknown) => void);
  },

  /**
   * Generic event unsubscription helper
   */
  off<TPayload = unknown>(event: ServerEvent | string, callback: (payload: TPayload) => void) {
    socket.off(event, callback as (payload: unknown) => void);
  },

  /**
   * Get socket connection status
   */
  isConnected(): boolean {
    return socket.connected;
  },

  /**
   * Get socket instance for advanced usage
   */
  getSocket(): Socket {
    return socket;
  },
};

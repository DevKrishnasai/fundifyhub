/**
 * Socket.io Event Types for Real-Time Communication
 *
 * Centralized type definitions for all WebSocket events between
 * frontend and main-backend service.
 */

import type { REQUEST_STATUS } from '../constants';

// ============================================
// SOCKET EVENT NAMES
// ============================================

/** Server-to-client events */
export enum ServerEvent {
  // Connection events
  CONNECTED = 'connected',
  ERROR = 'error',

  // Request events
  REQUEST_UPDATED = 'request:updated',
  REQUEST_STATUS_CHANGED = 'request:status_changed',
  REQUEST_COMMENT_ADDED = 'request:comment_added',
  REQUEST_DOCUMENT_UPLOADED = 'request:document_uploaded',

  // Notification events
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_COUNT = 'notification:count',

  // User events
  USER_SESSION_EXPIRED = 'user:session_expired',

  // Admin events (broadcast to admins only)
  ADMIN_NEW_REQUEST = 'admin:new_request',
  ADMIN_STATS_UPDATE = 'admin:stats_update',

  // Agent events
  AGENT_ASSIGNED = 'agent:assigned',
  AGENT_INSPECTION_REMINDER = 'agent:inspection_reminder',

  // Payment events
  PAYMENT_RECEIVED = 'payment:received',
  EMI_REMINDER = 'emi:reminder',
  EMI_OVERDUE = 'emi:overdue',

  // Auction events
  AUCTION_BID_PLACED = 'auction:bidPlaced',
  AUCTION_OUTBID = 'auction:outbid',
  AUCTION_EXTENDED = 'auction:extended',
  AUCTION_ENDED = 'auction:ended',
  AUCTION_WON = 'auction:won',
}

/** Client-to-server events */
export enum ClientEvent {
  // Room management
  JOIN_REQUEST = 'join:request',
  LEAVE_REQUEST = 'leave:request',
  JOIN_USER = 'join:user',
  LEAVE_USER = 'leave:user',
  JOIN_ADMIN = 'join:admin',
  LEAVE_ADMIN = 'leave:admin',
  JOIN_AUCTION = 'join:auction',
  LEAVE_AUCTION = 'leave:auction',

  // Health check
  PING = 'ping',
  PONG = 'pong',
}

// ============================================
// PAYLOAD TYPES
// ============================================

/** Request update payload */
export interface RequestUpdatePayload {
  requestId: string;
  status?: REQUEST_STATUS;
  updatedAt: string;
  updatedBy?: string;
  changes?: Record<string, unknown>;
}

/** Request status change payload */
export interface StatusChangePayload {
  requestId: string;
  oldStatus: REQUEST_STATUS;
  newStatus: REQUEST_STATUS;
  updatedBy: string;
  updatedAt: string;
  note?: string;
}

/** Request comment added payload */
export interface RequestCommentPayload {
  requestId: string;
  commentId: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  isInternal: boolean;
}

/** Document uploaded payload */
export interface DocumentUploadedPayload {
  requestId: string;
  documentId: string;
  fileName: string;
  fileType: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

/** In-app notification payload */
export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  isRead: boolean;
  requestId?: string;
  loanId?: string;
  createdAt: string;
}

/** Notification count payload */
export interface NotificationCountPayload {
  userId: string;
  unreadCount: number;
}

/** Admin stats update payload */
export interface AdminStatsPayload {
  pendingRequests: number;
  activeLoans: number;
  overduePayments: number;
  timestamp: string;
}

/** Agent assignment payload */
export interface AgentAssignedPayload {
  agentId: string;
  requestId: string;
  requestNumber: string;
  inspectionDate?: string;
  message: string;
}

/** Payment received payload */
export interface PaymentReceivedPayload {
  loanId: string;
  requestId: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  paidAt: string;
}

/** EMI reminder payload */
export interface EMIReminderPayload {
  userId: string;
  loanId: string;
  requestId: string;
  emiId: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

/** EMI overdue payload */
export interface EMIOverduePayload {
  userId: string;
  loanId: string;
  requestId: string;
  emiId: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  lateFeeAmount: number;
}

/** Auction bid placed payload */
export interface AuctionBidPlacedPayload {
  auctionId: string;
  bid: {
    id: string;
    amount: number;
    bidderId: string;
    bidderName: string;
    placedAt: string;
    isAutoBid: boolean;
  };
  currentHighBid: number;
  totalBids: number;
  wasExtended: boolean;
  extendedEndTime: string | null;
}

/** Auction outbid payload */
export interface AuctionOutbidPayload {
  auctionId: string;
  previousBidId: string;
  previousBidAmount: number;
  newBidAmount: number;
  newBidderName: string;
}

/** Auction extended payload */
export interface AuctionExtendedPayload {
  auctionId: string;
  newEndTime: string;
  extensionMinutes: number;
  reason: string;
}

/** Auction ended payload */
export interface AuctionEndedPayload {
  auctionId: string;
  winnerId?: string;
  winnerName?: string;
  finalBidAmount?: number;
  status: string;
  endedAt: string;
}

// ============================================
// ROOM NAMES
// ============================================

/**
 * Generate room name for a specific request
 */
export const getRequestRoom = (requestId: string): string => `request:${requestId}`;

/**
 * Generate room name for a specific user (personal notifications)
 */
export const getUserRoom = (userId: string): string => `user:${userId}`;

/**
 * Generate room name for admin broadcasts
 */
export const getAdminRoom = (): string => 'admin:all';

/**
 * Generate room name for a specific auction
 */
export const getAuctionRoom = (auctionId: string): string => `auction:${auctionId}`;

// ============================================
// CONNECTION STATUS
// ============================================

export interface SocketConnectionInfo {
  socketId: string;
  userId: string;
  connectedAt: string;
  rooms: string[];
}

export interface SocketAuthPayload {
  token: string;
  userId?: string;
}

export interface SocketErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// SOCKET OPTIONS
// ============================================

/** Default socket.io client options */
export const DEFAULT_SOCKET_OPTIONS: {
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  timeout: number;
  transports: string[];
} = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
};

// ============================================
// TYPE ALIASES FOR BACKWARD COMPATIBILITY
// ============================================

/** Alias for backward compatibility */
export type RequestUpdatedPayload = RequestUpdatePayload;

/** Alias for backward compatibility */
export type RequestStatusChangedPayload = StatusChangePayload;

/** Alias for backward compatibility */
export type CommentAddedPayload = RequestCommentPayload;

/** Alias for backward compatibility */
export type AuctionBidPayload = AuctionBidPlacedPayload;

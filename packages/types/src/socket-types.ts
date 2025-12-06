/**
 * Socket.io Event Types for Real-Time Communication
 *
 * Centralized type definitions for all WebSocket events between
 * frontend and main-backend service.
 */

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
  // Authentication
  AUTHENTICATE = 'authenticate',

  // Room subscriptions
  JOIN_REQUEST = 'join:request',
  LEAVE_REQUEST = 'leave:request',
  JOIN_USER = 'join:user',
  LEAVE_USER = 'leave:user',
  JOIN_AUCTION = 'join:auction',
  LEAVE_AUCTION = 'leave:auction',

  // Presence
  PING = 'ping',
}

// ============================================
// EVENT PAYLOADS
// ============================================

/** Connection success payload */
export interface ConnectedPayload {
  connectionId: string;
  serverTime: string;
  message: string;
}

/** Error payload */
export interface SocketErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Authentication payload */
export interface AuthenticatePayload {
  token: string;
}

/** Authentication result */
export interface AuthResult {
  success: boolean;
  userId?: string;
  roles?: string[];
  error?: string;
}

/** Request update payload */
export interface RequestUpdatedPayload {
  requestId: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  status?: string;
  /** New stage-based status (10 values) */
  stage?: string;
  /** Sub-status within the stage */
  subStatus?: string;
  message?: string;
  updatedBy?: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: string;
}

/** Request status change payload - supports both old REQUEST_STATUS and new stage:subStatus format */
export interface RequestStatusChangedPayload {
  requestId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: {
    id: string;
    name: string;
    role: string;
  };
  reason?: string;
  timestamp: string;
}

/** Comment added payload */
export interface CommentAddedPayload {
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
  timestamp?: string;
}

/** Document uploaded payload */
export interface DocumentUploadedPayload {
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
  timestamp?: string;
}

/** New notification payload */
export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

/** Notification count payload */
export interface NotificationCountPayload {
  unreadCount: number;
}

/** New request notification (for admins) */
export interface NewRequestPayload {
  requestId: string;
  customerId: string;
  customerName: string;
  assetType: string;
  amount: number;
  district: string;
  createdAt: string;
}

/** Stats update payload (for admins) */
export interface StatsUpdatePayload {
  type: 'request' | 'payment' | 'loan';
  delta: number;
  newTotal: number;
}

/** Agent assigned payload */
export interface AgentAssignedPayload {
  requestId: string;
  agentId: string;
  agentName: string;
  scheduledDate?: string;
  customerName: string;
  customerAddress: string;
  assetType: string;
}

/** Payment received payload */
export interface PaymentReceivedPayload {
  paymentId: string;
  loanId: string;
  requestId: string;
  amount: number;
  emiNumber: number;
  remainingEmis: number;
  paidAt: string;
}

/** EMI reminder payload */
export interface EmiReminderPayload {
  emiId: string;
  loanId: string;
  requestId: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

/** EMI overdue payload */
export interface EmiOverduePayload {
  emiId: string;
  loanId: string;
  requestId: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  lateFee: number;
  totalDue: number;
}

// ============================================
// AUCTION EVENT PAYLOADS
// ============================================

/** Auction bid placed payload */
export interface AuctionBidPayload {
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

/** User outbid notification payload */
export interface AuctionOutbidPayload {
  auctionId: string;
  auctionTitle: string;
  yourBid: number;
  newHighBid: number;
  newHighBidder: string;
}

/** Auction time extended payload */
export interface AuctionExtendedPayload {
  auctionId: string;
  newEndTime: string;
  reason: string; // 'last_minute_bid'
}

/** Auction ended payload */
export interface AuctionEndedPayload {
  auctionId: string;
  status: 'SOLD' | 'UNSOLD' | 'CANCELLED';
  winnerId: string | null;
  winnerName: string | null;
  finalPrice: number | null;
  totalBids: number;
}

/** Auction won notification payload */
export interface AuctionWonPayload {
  auctionId: string;
  auctionTitle: string;
  assetId: string;
  winningBid: number;
  nextSteps: string;
}

// ============================================
// ROOM TYPES
// ============================================

/** Room types for organizing socket connections */
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

/** Generate room name */
export const getRoomName = (type: RoomType, id: string): string => `${type}:${id}`;

// ============================================
// TYPE GUARDS
// ============================================

export const isAuthenticatePayload = (data: unknown): data is AuthenticatePayload => {
  return typeof data === 'object' && data !== null && 'token' in data;
};

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

/**
 * WebSocket event types and payloads
 * @module socket-types
 */

export enum ServerEvent {
  // Connection events
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  
  // Request events
  REQUEST_UPDATED = 'request:updated',
  REQUEST_STATUS_CHANGED = 'request:status_changed',
  REQUEST_COMMENT_ADDED = 'request:comment_added',
  REQUEST_DOCUMENT_UPLOADED = 'request:document_uploaded',
  
  // Notification events
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_COUNT = 'notification:count',
  
  // Payment events
  PAYMENT_RECEIVED = 'payment:received',
  EMI_REMINDER = 'payment:emi_reminder',
  
  // Auction events
  AUCTION_BID = 'auction:bid',
  AUCTION_BID_PLACED = 'auction:bid_placed',
  AUCTION_ENDED = 'auction:ended',
  AUCTION_WON = 'auction:won',
  AUCTION_OUTBID = 'auction:outbid',

  // User events
  USER_SESSION_EXPIRED = 'user:session_expired',
  EMI_OVERDUE = 'payment:emi_overdue'
}

export enum ClientEvent {
  // Connection
  AUTHENTICATE = 'authenticate',
  PING = 'ping',
  
  // Rooms
  JOIN_REQUEST = 'join:request',
  LEAVE_REQUEST = 'leave:request',
  JOIN_USER = 'join:user',
  LEAVE_USER = 'leave:user',
  JOIN_AUCTION = 'join:auction',
  LEAVE_AUCTION = 'leave:auction'
}

// Payload types
export interface RequestUpdatedPayload {
  requestId: string;
  data: any; // TODO: Define specific update payload
  updatedBy: string;
  timestamp: string;
}

export interface RequestStatusChangedPayload {
  requestId: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
  timestamp: string;
}

export interface CommentAddedPayload {
  requestId: string;
  commentId: string;
  content: string;
  authorId: string;
  timestamp: string;
}

export interface DocumentUploadedPayload {
  requestId: string;
  documentId: string;
  type: string;
  url: string;
  uploadedBy: string;
  timestamp: string;
}

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

export interface NotificationCountPayload {
  count: number;
}

export interface PaymentReceivedPayload {
  paymentId: string;
  loanId: string;
  amount: number;
  status: string;
  timestamp: string;
}

export interface EmiReminderPayload {
  loanId: string;
  amount: number;
  dueDate: string;
}

export interface AuctionBidPayload {
  auctionId: string;
  bid: {
    id: string;
    amount: number;
    bidderId: string;
    createdAt: string | Date;
    bidderName?: string;
    [key: string]: any;
  };
  wasExtended?: boolean;
  extendedEndTime?: string | Date;
}

export interface AuctionEndedPayload {
  auctionId: string;
  winnerId?: string;
  winningBid?: number;
  winnerName?: string;
  status: string;
  timestamp: string;
}


export interface AuctionOutbidPayload {
  auctionId: string;
  newBidAmount: number;
  timestamp: string;
}

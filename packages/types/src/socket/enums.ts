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

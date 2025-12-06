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

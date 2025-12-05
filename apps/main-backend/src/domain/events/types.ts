/**
 * Domain Event Types
 * 
 * Type definitions for all domain events.
 * Used by event bus for type-safe event publishing and subscription.
 * 
 * @module domain/events/types
 */

/**
 * Base event interface
 */
export interface DomainEvent {
  eventType: string;
  aggregateId: string; // ID of the aggregate (userId, loanId, requestId, etc.)
  timestamp: Date;
  data: Record<string, any>;
}

/**
 * Request-related events
 */

export interface RequestCreatedEvent extends DomainEvent {
  eventType: 'request.created';
  data: {
    requestId: string;
    customerId: string;
    assetCategory: string;
    requestAmount: number;
  };
}

export interface RequestSubmittedEvent extends DomainEvent {
  eventType: 'request.submitted';
  data: {
    requestId: string;
    customerId: string;
    status: string;
  };
}

export interface RequestAssignedToAgentEvent extends DomainEvent {
  eventType: 'request.assigned_to_agent';
  data: {
    requestId: string;
    customerId: string;
    agentId: string;
  };
}

export interface OfferCreatedEvent extends DomainEvent {
  eventType: 'offer.created';
  data: {
    requestId: string;
    offerId: string;
    customerId: string;
    offerAmount: number;
    tenure: number;
    roi: number;
  };
}

export interface OfferAcceptedEvent extends DomainEvent {
  eventType: 'offer.accepted';
  data: {
    requestId: string;
    offerId: string;
    customerId: string;
  };
}

export interface OfferRejectedEvent extends DomainEvent {
  eventType: 'offer.rejected';
  data: {
    requestId: string;
    offerId: string;
    customerId: string;
  };
}

export interface InspectionScheduledEvent extends DomainEvent {
  eventType: 'inspection.scheduled';
  data: {
    requestId: string;
    customerId: string;
    inspectionDate: Date;
    agentId: string;
  };
}

export interface InspectionCompletedEvent extends DomainEvent {
  eventType: 'inspection.completed';
  data: {
    requestId: string;
    customerId: string;
    agentId: string;
  };
}

export interface DocumentsUploadedEvent extends DomainEvent {
  eventType: 'documents.uploaded';
  data: {
    requestId: string;
    customerId: string;
    documentCount: number;
  };
}

export interface DocumentsVerifiedEvent extends DomainEvent {
  eventType: 'documents.verified';
  data: {
    requestId: string;
    customerId: string;
    verifiedBy: string;
  };
}

/**
 * Loan-related events
 */

export interface LoanCreatedEvent extends DomainEvent {
  eventType: 'loan.created';
  data: {
    loanId: string;
    requestId: string;
    customerId: string;
    loanAmount: number;
    tenure: number;
    emiAmount: number;
  };
}

export interface LoanDisbursedEvent extends DomainEvent {
  eventType: 'loan.disbursed';
  data: {
    loanId: string;
    customerId: string;
    disbursedAmount: number;
    disbursedDate: Date;
  };
}

export interface EMIPaidEvent extends DomainEvent {
  eventType: 'emi.paid';
  data: {
    loanId: string;
    emiId: string;
    customerId: string;
    paidAmount: number;
    paymentDate: Date;
  };
}

export interface EMIOverdueEvent extends DomainEvent {
  eventType: 'emi.overdue';
  data: {
    loanId: string;
    emiId: string;
    customerId: string;
    dueAmount: number;
    daysOverdue: number;
  };
}

export interface LoanDefaultedEvent extends DomainEvent {
  eventType: 'loan.defaulted';
  data: {
    loanId: string;
    customerId: string;
    reason: string;
  };
}

export interface LoanCompletedEvent extends DomainEvent {
  eventType: 'loan.completed';
  data: {
    loanId: string;
    customerId: string;
    completedDate: Date;
  };
}

export interface PrepaymentRecordedEvent extends DomainEvent {
  eventType: 'prepayment.recorded';
  data: {
    loanId: string;
    customerId: string;
    prepaymentAmount: number;
    recordedDate: Date;
  };
}

/**
 * Payment-related events
 */

export interface PaymentOrderCreatedEvent extends DomainEvent {
  eventType: 'payment.order_created';
  data: {
    loanId: string;
    orderId: string;
    customerId: string;
    amount: number;
  };
}

export interface PaymentCapturedEvent extends DomainEvent {
  eventType: 'payment.captured';
  data: {
    paymentId: string;
    orderId: string;
    customerId: string;
    amount: number;
    method: string;
  };
}

export interface PaymentFailedEvent extends DomainEvent {
  eventType: 'payment.failed';
  data: {
    orderId: string;
    customerId: string;
    reason: string;
  };
}

/**
 * Auction-related events
 */

export interface AuctionCreatedEvent extends DomainEvent {
  eventType: 'auction.created';
  data: {
    auctionId: string;
    loanId: string;
    startingPrice: number;
    endDate: Date;
  };
}

export interface AuctionPublishedEvent extends DomainEvent {
  eventType: 'auction.published';
  data: {
    auctionId: string;
    loanId: string;
  };
}

export interface BidPlacedEvent extends DomainEvent {
  eventType: 'bid.placed';
  data: {
    auctionId: string;
    bidderId: string;
    bidAmount: number;
    timestamp: Date;
  };
}

export interface BidOutbidEvent extends DomainEvent {
  eventType: 'bid.outbid';
  data: {
    auctionId: string;
    previousBidderId: string;
    newBidderId: string;
    newBidAmount: number;
  };
}

export interface AuctionExtendedEvent extends DomainEvent {
  eventType: 'auction.extended';
  data: {
    auctionId: string;
    newEndDate: Date;
  };
}

export interface AuctionEndedEvent extends DomainEvent {
  eventType: 'auction.ended';
  data: {
    auctionId: string;
    winnerId: string;
    winningBid: number;
  };
}

/**
 * User-related events
 */

export interface UserRegisteredEvent extends DomainEvent {
  eventType: 'user.registered';
  data: {
    userId: string;
    email: string;
    fullName: string;
  };
}

export interface UserEmailVerifiedEvent extends DomainEvent {
  eventType: 'user.email_verified';
  data: {
    userId: string;
    email: string;
  };
}

export interface PasswordResetRequestedEvent extends DomainEvent {
  eventType: 'password_reset.requested';
  data: {
    userId: string;
    email: string;
  };
}

export interface PasswordResetConfirmedEvent extends DomainEvent {
  eventType: 'password_reset.confirmed';
  data: {
    userId: string;
    email: string;
  };
}

/**
 * Union type of all events
 */
export type AllDomainEvents =
  | RequestCreatedEvent
  | RequestSubmittedEvent
  | RequestAssignedToAgentEvent
  | OfferCreatedEvent
  | OfferAcceptedEvent
  | OfferRejectedEvent
  | InspectionScheduledEvent
  | InspectionCompletedEvent
  | DocumentsUploadedEvent
  | DocumentsVerifiedEvent
  | LoanCreatedEvent
  | LoanDisbursedEvent
  | EMIPaidEvent
  | EMIOverdueEvent
  | LoanDefaultedEvent
  | LoanCompletedEvent
  | PrepaymentRecordedEvent
  | PaymentOrderCreatedEvent
  | PaymentCapturedEvent
  | PaymentFailedEvent
  | AuctionCreatedEvent
  | AuctionPublishedEvent
  | BidPlacedEvent
  | BidOutbidEvent
  | AuctionExtendedEvent
  | AuctionEndedEvent
  | UserRegisteredEvent
  | UserEmailVerifiedEvent
  | PasswordResetRequestedEvent
  | PasswordResetConfirmedEvent;

/**
 * Event handler type
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

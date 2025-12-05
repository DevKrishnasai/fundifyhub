/**
 * Event Bus - In-process event handling
 * 
 * Simple EventEmitter-based event bus for domain events.
 * Enables loose coupling between domain services.
 * 
 * Usage:
 * - Services emit events when state changes
 * - Event handlers respond and trigger side effects
 * - No direct service-to-service calls
 * 
 * Example:
 * ```
 * // In service
 * eventBus.emit('request.created', { requestId, customerId, ... })
 * 
 * // In handler
 * eventBus.on('request.created', async (event) => {
 *   await notificationAdapter.publishEvent('RequestCreated', event)
 * })
 * ```
 * 
 * @module domain/events
 */

import { EventEmitter } from 'events';

/**
 * Domain event types
 */
export interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId: string;
  data: Record<string, unknown>;
}

/**
 * Request events
 */
export interface RequestCreatedEvent extends DomainEvent {
  type: 'request.created';
  data: {
    requestId: string;
    customerId: string;
    amount: number;
    districtId: string;
  };
}

export interface RequestSubmittedEvent extends DomainEvent {
  type: 'request.submitted';
  data: {
    requestId: string;
    customerId: string;
  };
}

export interface RequestAssignedEvent extends DomainEvent {
  type: 'request.assigned';
  data: {
    requestId: string;
    agentId: string;
    agentName: string;
  };
}

export interface OfferCreatedEvent extends DomainEvent {
  type: 'offer.created';
  data: {
    requestId: string;
    offerId: string;
    monthlyEmi: number;
    tenure: number;
  };
}

export interface OfferAcceptedEvent extends DomainEvent {
  type: 'offer.accepted';
  data: {
    requestId: string;
    offerId: string;
    customerId: string;
  };
}

export interface LoanDisbursedEvent extends DomainEvent {
  type: 'loan.disbursed';
  data: {
    loanId: string;
    requestId: string;
    customerId: string;
    amount: number;
  };
}

/**
 * Payment events
 */
export interface PaymentRecordedEvent extends DomainEvent {
  type: 'payment.recorded';
  data: {
    paymentId: string;
    loanId: string;
    emiId: string;
    amount: number;
    method: string;
  };
}

export interface PaymentFailedEvent extends DomainEvent {
  type: 'payment.failed';
  data: {
    paymentId: string;
    orderId: string;
    errorCode: string;
    errorMessage: string;
  };
}

/**
 * Auction events
 */
export interface AuctionCreatedEvent extends DomainEvent {
  type: 'auction.created';
  data: {
    auctionId: string;
    loanId: string;
    startPrice: number;
    reservePrice: number;
  };
}

export interface BidPlacedEvent extends DomainEvent {
  type: 'bid.placed';
  data: {
    auctionId: string;
    bidderId: string;
    bidAmount: number;
  };
}

export interface AuctionEndedEvent extends DomainEvent {
  type: 'auction.ended';
  data: {
    auctionId: string;
    winnerId?: string;
    finalBid?: number;
    success: boolean;
  };
}

/**
 * Union of all domain events
 */
export type AnyDomainEvent =
  | RequestCreatedEvent
  | RequestSubmittedEvent
  | RequestAssignedEvent
  | OfferCreatedEvent
  | OfferAcceptedEvent
  | LoanDisbursedEvent
  | PaymentRecordedEvent
  | PaymentFailedEvent
  | AuctionCreatedEvent
  | BidPlacedEvent
  | AuctionEndedEvent;

/**
 * EventBus - Simple in-process event bus using Node EventEmitter
 */
class EventBus extends EventEmitter {
  /**
   * Emit domain event
   */
  emitEvent(event: AnyDomainEvent): void {
    console.log(`[EventBus] Emitting event: ${event.type}`, { aggregateId: event.aggregateId });
    this.emit(event.type, event);
  }

  /**
   * Subscribe to event
   */
  onEvent<T extends AnyDomainEvent>(
    eventType: T['type'],
    handler: (event: T) => Promise<void> | void
  ): void {
    this.on(eventType, async (event: T) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus] Error handling event ${eventType}:`, err);
        // Don't re-throw to prevent event bus from breaking
      }
    });
  }

  /**
   * Remove event listener
   */
  offEvent(eventType: string, handler: Function): void {
    this.removeListener(eventType, handler as any);
  }

  /**
   * Remove all listeners for event type
   */
  removeAllListeners(eventType?: string | symbol): this {
    super.removeAllListeners(eventType);
    return this;
  }
}

/**
 * Global singleton instance
 */
export const eventBus = new EventBus();

export default eventBus;

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
import type { RequestEvent } from '../requests/requests.events';
import type { LoanEvent } from '../loans/loans.events';
import type { AuctionEvent } from '../auctions/auctions.events';
import type { PaymentEvent } from '../payments/payments.events';

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
 * Union of all domain events
 */
export type AnyDomainEvent =
  | RequestEvent
  | LoanEvent
  | AuctionEvent
  | PaymentEvent;

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

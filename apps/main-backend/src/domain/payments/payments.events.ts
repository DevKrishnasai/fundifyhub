import type { DomainEvent } from '../events/bus';

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
    customerId: string;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    paymentDate: string;
    remainingBalance: number;
    nextEMIDate?: string;
  };
}

export interface PaymentFailedEvent extends DomainEvent {
  type: 'payment.failed';
  data: {
    paymentId: string;
    orderId: string;
    loanId: string;
    amount: number;
    errorCode: string;
    errorMessage: string;
    customerId: string;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    retryLink: string;
    attemptCount: number;
  };
}

export type PaymentEvent =
  | PaymentRecordedEvent
  | PaymentFailedEvent;

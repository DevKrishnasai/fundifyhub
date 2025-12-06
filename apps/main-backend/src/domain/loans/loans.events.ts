import type { DomainEvent } from '../events/bus';
import type { Loan, EMISchedule, Payment } from '@fundifyhub/prisma';

/**
 * Defines the payload for when a new loan is created and becomes active.
 */
export interface LoanCreatedEvent extends DomainEvent {
  type: 'loan.created';
  data: {
    loan: Loan;
    userId: string;
  };
}

/**
 * Defines the payload for when a payment is successfully applied to an EMI.
 */
export interface LoanPaymentAppliedEvent extends DomainEvent {
  type: 'loan.payment.applied';
  data: {
    loanId: string;
    payment: Payment;
    emiSchedule: EMISchedule;
    userId: string;
  };
}

/**
 * Defines the payload for when a prepayment is recorded.
 */
export interface LoanPrepaymentRecordedEvent extends DomainEvent {
  type: 'loan.prepayment.recorded';
  data: {
    loanId: string;
    amount: number;
    newOutstandingBalance: number;
    userId: string;
  };
}

/**
 * Defines the payload for when a loan is fully paid off and closed.
 */
export interface LoanClosedEvent extends DomainEvent {
  type: 'loan.closed';
  data: {
    loanId: string;
    closureDate: Date;
    userId:string;
  };
}

/**
 * Defines the payload for an upcoming EMI reminder.
 */
export interface LoanEmiDueReminderEvent extends DomainEvent {
  type: 'loan.emi.due';
  data: {
    loanId: string;
    emiSchedule: EMISchedule;
    userId: string;
  };
}

/**
 * Defines the payload for when an EMI becomes overdue.
 */
export interface LoanEmiOverdueEvent extends DomainEvent {
  type: 'loan.emi.overdue';
  data: {
    loanId: string;
    emiSchedule: EMISchedule;
    daysOverdue: number;
    userId: string;
  };
}

/**
 * Defines the payload for when an EMI payment is successfully recorded.
 */
export interface LoanEmiPaidEvent extends DomainEvent {
  type: 'loan.emiPaid';
  data: {
    loanId: string;
    emiId: string;
    customerId: string;
    emiNumber: number;
    amount: number;
    lateFee: number;
    remainingEMIs: number;
    paidBy: string;
    paidAt: Date;
  };
}

/**
 * Defines the payload for when a payment is recorded (generic).
 */
export interface LoanPaymentRecordedEvent extends DomainEvent {
  type: 'loan.paymentRecorded';
  data: {
    loanId: string;
    customerId: string;
    emiId: string;
    emiNumber: number;
    amount: number;
    lateFee: number;
    paymentDate: Date;
    remainingEMIs: number;
  };
}

/**
 * Defines the payload for when a prepayment is recorded (updated structure).
 */
export interface LoanPrepaymentEvent extends DomainEvent {
  type: 'loan.prepaymentRecorded';
  data: {
    loanId: string;
    customerId: string;
    amount: number;
    remainingBalance: number;
    isFullPrepayment: boolean;
    prepaymentDate: Date;
  };
}

/**
 * Defines the payload for when a loan is closed (updated structure).
 */
export interface LoanClosedEventUpdated extends DomainEvent {
  type: 'loan.closed';
  data: {
    loanId: string;
    customerId: string;
    closureDate: Date;
    loanNumber: string;
  };
}

/**
 * A union type of all possible events related to loans.
 */
export type LoanEvent =
  | LoanCreatedEvent
  | LoanPaymentAppliedEvent
  | LoanPrepaymentRecordedEvent
  | LoanClosedEvent
  | LoanEmiDueReminderEvent
  | LoanEmiOverdueEvent
  | LoanEmiPaidEvent
  | LoanPaymentRecordedEvent
  | LoanPrepaymentEvent
  | LoanClosedEventUpdated;

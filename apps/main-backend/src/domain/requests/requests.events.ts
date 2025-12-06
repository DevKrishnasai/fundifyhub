import type { DomainEvent } from '../events/bus';

/**
 * Request events
 */
export interface RequestCreatedEvent extends DomainEvent {
  type: 'request.created';
  data: {
    requestId: string;
    customerId: string;
    customerEmail: string;
    customerName: string;
    amount: number;
    requestedAmount: number;
    districtId: string;
    assetDescription: string;
  };
}

export interface RequestSubmittedEvent extends DomainEvent {
  type: 'request.submitted';
  data: {
    requestId: string;
    customerId: string;
    districtId: string;
    requestedAmount: number;
    assetType: string;
    stage: string;
  };
}

export interface RequestAssignedEvent extends DomainEvent {
  type: 'request.assigned';
  data: {
    requestId: string;
    agentId: string;
    agentName: string;
    agentEmail: string;
    agentPhone: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    assetDescription: string;
    requestedAmount: number;
    assignedBy: string;
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

export interface AgentAssignedEvent extends DomainEvent {
  type: 'agent.assigned';
  data: {
    requestId: string;
    agentId: string;
    customerId: string;
    districtId: string;
  };
}

export interface AdminAssignedEvent extends DomainEvent {
  type: 'admin.assigned';
  data: {
    requestId: string;
    adminId: string;
    customerId: string;
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

export interface OfferRejectedEvent extends DomainEvent {
  type: 'offer.rejected';
  data: {
    requestId: string;
    offerId: string;
    customerId: string;
    reason?: string;
  };
}

export interface InspectionScheduledEvent extends DomainEvent {
  type: 'inspection.scheduled';
  data: {
    requestId: string;
    inspectionId: string;
    scheduledDate: string;
    agentId: string;
    customerId: string;
  };
}

export interface LoanDisbursedEvent extends DomainEvent {
  type: 'loan.disbursed';
  data: {
    loanId: string;
    requestId: string;
    customerId: string;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    disbursedAmount: number;
    tenureMonths: number;
    emiAmount: number;
    firstEMIDate: string;
    disbursedBy?: string;
  };
}

export type RequestEvent =
  | RequestCreatedEvent
  | RequestSubmittedEvent
  | RequestAssignedEvent
  | AgentAssignedEvent
  | AdminAssignedEvent
  | OfferCreatedEvent
  | OfferAcceptedEvent
  | OfferRejectedEvent
  | InspectionScheduledEvent
  | LoanDisbursedEvent;

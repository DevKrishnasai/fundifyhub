import { REQUEST_STATUS } from './constants';

// ============================================
// WORKFLOW EVENTS (ACTIONS)
// ============================================

export const WORKFLOW_EVENTS = {
  // Admin Actions
  START_REVIEW: 'START_REVIEW',
  MAKE_OFFER: 'MAKE_OFFER',
  REVISE_OFFER: 'REVISE_OFFER',
  REQUEST_MORE_INFO: 'REQUEST_MORE_INFO',
  ASSIGN_AGENT: 'ASSIGN_AGENT',
  REASSIGN_AGENT: 'REASSIGN_AGENT',
  SELF_ASSIGN_ADMIN: 'SELF_ASSIGN_ADMIN',
  ASSIGN_ADMIN: 'ASSIGN_ADMIN', // Super admin assigns a district admin to handle the request
  REJECT: 'REJECT',
  CANCEL: 'CANCEL',
  CANCEL_OFFER: 'CANCEL_OFFER',
  CLOSE_REQUEST: 'CLOSE_REQUEST',
  RESEND_OFFER: 'RESEND_OFFER',
  MAKE_NEW_OFFER: 'MAKE_NEW_OFFER',
  RESUME_REVIEW: 'RESUME_REVIEW',
  DISBURSE: 'DISBURSE',
  REQUEST_DIFFERENT_BANK_DETAILS: 'REQUEST_DIFFERENT_BANK_DETAILS',
  TRANSFER_FAILED: 'TRANSFER_FAILED',
  CREATE_LOAN: 'CREATE_LOAN',
  MARK_OVERDUE: 'MARK_OVERDUE',
  MARK_COMPLETED: 'MARK_COMPLETED',
  MARK_PAID: 'MARK_PAID',
  MARK_DEFAULTED: 'MARK_DEFAULTED',
  MARK_SETTLED: 'MARK_SETTLED',
  REOPEN: 'REOPEN',
  RESCHEDULE_INSPECTION: 'RESCHEDULE_INSPECTION',

  // Customer Actions
  SUBMIT_INFO: 'SUBMIT_INFO',
  WITHDRAW: 'WITHDRAW',
  ACCEPT_OFFER: 'ACCEPT_OFFER',
  DECLINE_OFFER: 'DECLINE_OFFER',
  REQUEST_RESCHEDULE: 'REQUEST_RESCHEDULE',
  SIGN_AGREEMENT: 'SIGN_AGREEMENT',
  GENERATE_AGREEMENT: 'GENERATE_AGREEMENT',
  SUBMIT_BANK_DETAILS: 'SUBMIT_BANK_DETAILS',
  UPDATE_BANK_DETAILS: 'UPDATE_BANK_DETAILS',
  REFUSE_SIGNATURE: 'REFUSE_SIGNATURE',
  PROVIDE_EXPLANATION: 'PROVIDE_EXPLANATION',
  REQUEST_RESUME: 'REQUEST_RESUME',

  // Agent Actions
  START_INSPECTION: 'START_INSPECTION',
  COMPLETE_INSPECTION: 'COMPLETE_INSPECTION',
  CUSTOMER_NOT_AVAILABLE: 'CUSTOMER_NOT_AVAILABLE',
  ASSET_MISMATCH: 'ASSET_MISMATCH',
  AGENT_NOT_AVAILABLE: 'AGENT_NOT_AVAILABLE',
  CANCEL_AGENT: 'CANCEL_AGENT',
  APPROVE_INSPECTION: 'APPROVE_INSPECTION',
  REJECT_INSPECTION: 'REJECT_INSPECTION',

  // System Actions
  EXPIRE_OFFER: 'EXPIRE_OFFER',
  AUTO_ACTIVATE: 'AUTO_ACTIVATE',
  AUTO_OVERDUE: 'AUTO_OVERDUE',
  AUTO_DEFAULT: 'AUTO_DEFAULT',
  ADD_COMMENT: 'ADD_COMMENT', // Added for consistency
  TOGGLE_COMMENTS: 'TOGGLE_COMMENTS',
} as const;

export type WorkflowEvent = typeof WORKFLOW_EVENTS[keyof typeof WORKFLOW_EVENTS];

// ============================================
// ENGINE INTERFACES
// ============================================

export interface WorkflowContext {
  user: {
    id: string;
    roles: string[];
    districts?: string[];
  };
  request: {
    id: string;
    customerId: string;
    district: string;
    assignedAgentId?: string | null;
    amount?: number;
    // Add other fields needed for guards
  };
}

export interface TransitionConfig {
  targetStatus: REQUEST_STATUS;
  guards?: Array<(context: WorkflowContext) => boolean>;
  requiredInput?: string[]; // Fields required in the action payload
}

export interface WorkflowActionConfig {
  label: string;
  icon?: string; // Lucide icon name
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  description?: string;
  tooltip?: string; // Tooltip text for the action button
  requiresConfirmation?: boolean;
  modalComponent?: string; // Name of the modal to render
  priority?: number; // Lower number = higher priority (primary button)
}

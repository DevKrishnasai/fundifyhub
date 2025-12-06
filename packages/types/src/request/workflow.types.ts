/**
 * Workflow engine types and matrix for request status management
 * @module request/workflow.types
 * 
 * This file consolidates all workflow-related types, the complete
 * state machine, and helper functions for loan request processing.
 */

import { REQUEST_STATUS, AGENT_ACCESS_DENY_STATUSES, PENDING_REQUEST_STATUSES } from './request.constants';
import { ROLES } from '../auth/auth.constants';

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
  ASSIGN_ADMIN: 'ASSIGN_ADMIN',
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
  ADD_COMMENT: 'ADD_COMMENT',
  TOGGLE_COMMENTS: 'TOGGLE_COMMENTS',
} as const;

export type WorkflowEvent = (typeof WORKFLOW_EVENTS)[keyof typeof WORKFLOW_EVENTS];

// ============================================
// BASE TYPES
// ============================================

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

// ============================================
// WORKFLOW ACTION TYPES
// ============================================

export interface WorkflowAction {
  /** Unique action identifier */
  id: string;
  /** Display label for UI button */
  label: string;
  /** Tooltip or help text */
  description?: string;
  /** Icon name (lucide-react) */
  icon?: string;
  /** Button style */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  /** Status after action */
  targetStatus: REQUEST_STATUS;
  /** Opens modal/form for input */
  requiresInput?: boolean;
  /** Shows confirmation dialog */
  requiresConfirmation?: boolean;
  /** Admin must have access to request's district */
  districtCheck?: boolean;
  /** Must be request owner */
  requiresCustomerOwnership?: boolean;
  /** Must be assigned agent */
  requiresAgentAssignment?: boolean;
  /** Lower number = higher priority for display */
  priority?: number;
  /** Modal component name to render */
  modalComponent?: string;
  /** Tooltip text for the action button */
  tooltip?: string;
}

export interface WorkflowState {
  /** Human-readable description of status */
  description: string;
  customerActions: WorkflowAction[];
  adminActions: WorkflowAction[];
  agentActions: WorkflowAction[];
  /** Automated system actions */
  systemActions?: WorkflowAction[];
}

// ============================================
// WORKFLOW CONTEXT TYPES
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
  };
}

export interface TransitionConfig {
  targetStatus: REQUEST_STATUS;
  guards?: Array<(context: WorkflowContext) => boolean>;
  requiredInput?: string[];
}

export interface WorkflowActionConfig {
  label: string;
  icon?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  description?: string;
  tooltip?: string;
  requiresConfirmation?: boolean;
  modalComponent?: string;
  priority?: number;
}

/**
 * Request context for permission checks
 */
export interface RequestContext {
  customerId: string;
  districtId: string;  // District ID (FK to District model)
  agentId?: string | null;
  adminId?: string | null;
}

/**
 * User context for multi-role permission checks
 */
export interface UserContext {
  id: string;
  roles: UserRole[];
  districts?: string[];
}

// ============================================
// COMPLETE WORKFLOW MATRIX
// ============================================

export const WORKFLOW_MATRIX: Record<REQUEST_STATUS, WorkflowState> = {
  // ============================================
  // PHASE 1: SUBMISSION & REVIEW
  // ============================================

  [REQUEST_STATUS.PENDING]: {
    description: 'Customer submitted request, waiting for admin to review',
    customerActions: [
      {
        id: 'withdraw-request',
        label: 'Withdraw Request',
        icon: 'XCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresConfirmation: true,
        requiresCustomerOwnership: true,
        priority: 10,
      },
    ],
    adminActions: [
      {
        id: 'assign-admin',
        label: 'Assign Admin',
        icon: 'UserCog',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.PENDING,
        requiresInput: true,
        priority: 2,
      },
      {
        id: 'start-review',
        label: 'Start Review',
        icon: 'FileSearch',
        variant: 'default',
        targetStatus: REQUEST_STATUS.UNDER_REVIEW,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'reject',
        label: 'Reject',
        icon: 'XCircle',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.REJECTED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 5,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.UNDER_REVIEW]: {
    description: 'Admin is reviewing the request',
    customerActions: [],
    adminActions: [
      {
        id: 'assign-admin',
        label: 'Assign Admin',
        icon: 'UserCog',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.UNDER_REVIEW,
        requiresInput: true,
        districtCheck: true,
        priority: 3,
      },
      {
        id: 'make-offer',
        label: 'Make Offer',
        icon: 'FilePlus',
        variant: 'default',
        targetStatus: REQUEST_STATUS.OFFER_SENT,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'request-more-info',
        label: 'Request More Info',
        icon: 'MessageCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.MORE_INFO_REQUIRED,
        requiresInput: true,
        districtCheck: true,
        priority: 2,
      },
      {
        id: 'reject',
        label: 'Reject',
        icon: 'XCircle',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.REJECTED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 5,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.MORE_INFO_REQUIRED]: {
    description: 'Admin needs additional documents from customer',
    customerActions: [
      {
        id: 'submit-info',
        label: 'Submit Additional Info',
        icon: 'Upload',
        variant: 'default',
        targetStatus: REQUEST_STATUS.PENDING,
        requiresInput: true,
        requiresCustomerOwnership: true,
        priority: 1,
      },
      {
        id: 'withdraw',
        label: 'Withdraw Request',
        icon: 'XCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresConfirmation: true,
        requiresCustomerOwnership: true,
        priority: 10,
      },
    ],
    adminActions: [
      {
        id: 'resume-review',
        label: 'Resume Review',
        icon: 'Play',
        variant: 'default',
        targetStatus: REQUEST_STATUS.UNDER_REVIEW,
        districtCheck: true,
        priority: 2,
      },
      {
        id: 'cancel',
        label: 'Cancel',
        icon: 'Ban',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [],
  },

  // ============================================
  // PHASE 2: OFFER & NEGOTIATION
  // ============================================

  [REQUEST_STATUS.OFFER_SENT]: {
    description: 'Admin sent offer, waiting for customer response',
    customerActions: [
      {
        id: 'accept-offer',
        label: 'Accept Offer',
        icon: 'CheckCircle',
        variant: 'default',
        targetStatus: REQUEST_STATUS.OFFER_ACCEPTED,
        requiresCustomerOwnership: true,
        priority: 1,
      },
      {
        id: 'decline-offer',
        label: 'Decline Offer',
        icon: 'XCircle',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.OFFER_DECLINED,
        requiresInput: true,
        requiresCustomerOwnership: true,
        priority: 2,
      },
    ],
    adminActions: [
      {
        id: 'revise-offer',
        label: 'Revise Offer',
        icon: 'Edit',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.OFFER_SENT,
        requiresInput: true,
        districtCheck: true,
        priority: 2,
      },
      {
        id: 'cancel-offer',
        label: 'Cancel Offer',
        icon: 'Ban',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [],
    systemActions: [
      {
        id: 'expire-offer',
        label: 'Expire Offer',
        targetStatus: REQUEST_STATUS.OFFER_EXPIRED,
        description: 'Auto-expires after 7 days',
        priority: 99,
      },
    ],
  },

  [REQUEST_STATUS.OFFER_ACCEPTED]: {
    description: 'Customer accepted offer, ready to assign agent',
    customerActions: [],
    adminActions: [
      {
        id: 'assign-agent',
        label: 'Assign Agent for Inspection',
        icon: 'UserPlus',
        variant: 'default',
        targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'cancel',
        label: 'Cancel',
        icon: 'Ban',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.OFFER_DECLINED]: {
    description: 'Customer declined the offer',
    customerActions: [],
    adminActions: [
      {
        id: 'make-new-offer',
        label: 'Make New Offer',
        icon: 'RefreshCw',
        variant: 'default',
        targetStatus: REQUEST_STATUS.OFFER_SENT,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'close-request',
        label: 'Close Request',
        icon: 'Archive',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.CANCELLED,
        districtCheck: true,
        priority: 5,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.OFFER_EXPIRED]: {
    description: 'Offer expired, customer did not respond in time',
    customerActions: [],
    adminActions: [
      {
        id: 'resend-offer',
        label: 'Resend Offer',
        icon: 'Send',
        variant: 'default',
        targetStatus: REQUEST_STATUS.OFFER_SENT,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'close-request',
        label: 'Close Request',
        icon: 'Archive',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.CANCELLED,
        districtCheck: true,
        priority: 5,
      },
    ],
    agentActions: [],
  },

  // ============================================
  // PHASE 3: INSPECTION
  // ============================================

  [REQUEST_STATUS.INSPECTION_SCHEDULED]: {
    description: 'Agent assigned with scheduled inspection date',
    customerActions: [
      {
        id: 'request-reschedule',
        label: 'Request Reschedule',
        icon: 'Calendar',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED,
        requiresInput: true,
        requiresCustomerOwnership: true,
        priority: 5,
      },
      {
        id: 'withdraw',
        label: 'Withdraw Request',
        icon: 'XCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresConfirmation: true,
        requiresCustomerOwnership: true,
        priority: 10,
      },
    ],
    adminActions: [
      {
        id: 'reassign-agent',
        label: 'Reassign Agent',
        icon: 'UserSwitch',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
        requiresInput: true,
        districtCheck: true,
        priority: 5,
      },
      {
        id: 'cancel',
        label: 'Cancel',
        icon: 'Ban',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [
      {
        id: 'start-inspection',
        label: 'Start Inspection',
        description: 'Enabled on scheduled date',
        icon: 'PlayCircle',
        variant: 'default',
        targetStatus: REQUEST_STATUS.INSPECTION_IN_PROGRESS,
        requiresAgentAssignment: true,
        priority: 1,
      },
      {
        id: 'customer-not-available',
        label: 'Customer Not Available',
        icon: 'UserX',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE,
        requiresInput: true,
        requiresAgentAssignment: true,
        priority: 5,
      },
      {
        id: 'cancel-agent',
        label: "Can't Make It",
        icon: 'XCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.AGENT_NOT_AVAILABLE,
        requiresInput: true,
        requiresAgentAssignment: true,
        priority: 10,
      },
    ],
  },

  [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: {
    description: 'Customer requested to reschedule inspection',
    customerActions: [
      {
        id: 'withdraw',
        label: 'Withdraw Request',
        icon: 'XCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresConfirmation: true,
        requiresCustomerOwnership: true,
        priority: 10,
      },
    ],
    adminActions: [
      {
        id: 'reassign-agent',
        label: 'Reschedule Inspection',
        icon: 'Calendar',
        variant: 'default',
        targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'cancel',
        label: 'Cancel',
        icon: 'Ban',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.INSPECTION_IN_PROGRESS]: {
    description: 'Agent is conducting physical inspection',
    customerActions: [],
    adminActions: [],
    agentActions: [
      {
        id: 'complete-inspection',
        label: 'Complete Inspection',
        icon: 'CheckCircle',
        variant: 'default',
        targetStatus: REQUEST_STATUS.INSPECTION_COMPLETED,
        requiresInput: true,
        requiresAgentAssignment: true,
        priority: 1,
      },
    ],
  },

  [REQUEST_STATUS.INSPECTION_COMPLETED]: {
    description: 'Agent completed inspection, decision pending',
    customerActions: [],
    adminActions: [],
    agentActions: [
      {
        id: 'approve',
        label: 'Approve',
        icon: 'ThumbsUp',
        variant: 'default',
        targetStatus: REQUEST_STATUS.APPROVED,
        requiresAgentAssignment: true,
        priority: 1,
      },
      {
        id: 'reject',
        label: 'Reject',
        icon: 'ThumbsDown',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.REJECTED,
        requiresInput: true,
        requiresConfirmation: true,
        requiresAgentAssignment: true,
        priority: 2,
      },
    ],
  },

  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: {
    description: 'Customer was not available on the scheduled inspection date',
    customerActions: [
      {
        id: 'reschedule',
        label: 'Reschedule Inspection',
        icon: 'Calendar',
        variant: 'default',
        targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
        requiresInput: true,
        requiresCustomerOwnership: true,
        priority: 1,
      },
    ],
    adminActions: [
      {
        id: 'reschedule',
        label: 'Reschedule',
        icon: 'Calendar',
        variant: 'default',
        targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'reject',
        label: 'Reject (Too Many No-Shows)',
        icon: 'XCircle',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.REJECTED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 5,
      },
      {
        id: 'cancel',
        label: 'Cancel',
        icon: 'Ban',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresInput: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.ASSET_MISMATCH]: {
    description: 'Asset does not match description provided',
    customerActions: [
      {
        id: 'provide-explanation',
        label: 'Provide Explanation',
        icon: 'MessageCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.ASSET_MISMATCH,
        requiresInput: true,
        requiresCustomerOwnership: true,
        priority: 5,
      },
    ],
    adminActions: [
      {
        id: 'revise-offer',
        label: 'Revise Offer (Lower Amount)',
        icon: 'Edit',
        variant: 'default',
        targetStatus: REQUEST_STATUS.OFFER_SENT,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'reject',
        label: 'Reject',
        icon: 'XCircle',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.REJECTED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 2,
      },
      {
        id: 'reschedule-inspection',
        label: 'Reschedule Inspection',
        icon: 'Calendar',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
        requiresInput: true,
        districtCheck: true,
        priority: 5,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.AGENT_NOT_AVAILABLE]: {
    description: 'Agent cannot make the scheduled inspection',
    customerActions: [],
    adminActions: [
      {
        id: 'reassign-agent',
        label: 'Reassign to New Agent',
        icon: 'UserSwitch',
        variant: 'default',
        targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'cancel',
        label: 'Cancel',
        icon: 'Ban',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresInput: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [],
  },

  // ============================================
  // PHASE 4: APPROVAL & DOCUMENTATION
  // ============================================

  [REQUEST_STATUS.APPROVED]: {
    description: 'Agent approved - automatically requesting signature',
    customerActions: [],
    adminActions: [],
    agentActions: [],
    systemActions: [
      {
        id: 'auto-request-signature',
        label: 'Request Signature',
        targetStatus: REQUEST_STATUS.PENDING_SIGNATURE,
        description: 'Automatically moves to signature stage immediately',
        priority: 1,
      },
    ],
  },

  [REQUEST_STATUS.PENDING_SIGNATURE]: {
    description: 'Waiting for customer to sign loan agreement',
    customerActions: [
      {
        id: 'refuse-signature',
        label: 'Refuse to Sign',
        icon: 'XCircle',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresInput: true,
        requiresConfirmation: true,
        requiresCustomerOwnership: true,
        priority: 10,
      },
    ],
    adminActions: [],
    agentActions: [],
    systemActions: [
      {
        id: 'auto-cancel-signature',
        label: 'Auto-cancel',
        targetStatus: REQUEST_STATUS.CANCELLED,
        description: 'Auto-cancels after 7 days if not signed',
        priority: 99,
      },
    ],
  },

  [REQUEST_STATUS.PENDING_BANK_DETAILS]: {
    description: 'Waiting for customer to provide bank details for disbursement',
    customerActions: [],
    adminActions: [],
    agentActions: [],
  },

  // ============================================
  // PHASE 5: LOAN PROCESSING & DISBURSEMENT
  // ============================================

  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: {
    description: 'Bank details submitted, admin will disburse amount',
    customerActions: [],
    adminActions: [
      {
        id: 'disburse-amount',
        label: 'Disburse Amount',
        description: 'Create loan and transfer amount to customer',
        icon: 'Send',
        variant: 'default',
        targetStatus: REQUEST_STATUS.AMOUNT_DISBURSED,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'request-different-details',
        label: 'Request Different Details',
        description: 'Ask customer to resubmit bank details',
        icon: 'AlertCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.PENDING_BANK_DETAILS,
        requiresInput: true,
        districtCheck: true,
        priority: 5,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.TRANSFER_FAILED]: {
    description: 'Transfer failed, need different bank details',
    customerActions: [
      {
        id: 'update-bank-details',
        label: 'Update Bank Details',
        icon: 'Edit',
        variant: 'default',
        targetStatus: REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
        requiresInput: true,
        requiresCustomerOwnership: true,
        priority: 1,
      },
    ],
    adminActions: [
      {
        id: 'cancel',
        label: 'Cancel',
        icon: 'Ban',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.CANCELLED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.AMOUNT_DISBURSED]: {
    description: 'Money successfully sent to customer',
    customerActions: [],
    adminActions: [
      {
        id: 'create-emi-schedule',
        label: 'Create EMI Schedule & Activate',
        icon: 'Calendar',
        variant: 'default',
        targetStatus: REQUEST_STATUS.ACTIVE,
        requiresInput: false,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 1,
      },
    ],
    agentActions: [],
    systemActions: [
      {
        id: 'auto-activate',
        label: 'Auto-activate',
        targetStatus: REQUEST_STATUS.ACTIVE,
        description: 'Auto-activates after EMI schedule created',
        priority: 2,
      },
    ],
  },

  // ============================================
  // PHASE 6: ACTIVE LOAN
  // ============================================

  [REQUEST_STATUS.ACTIVE]: {
    description: 'Loan is active, customer paying EMIs',
    customerActions: [],
    adminActions: [],
    agentActions: [],
    systemActions: [
      {
        id: 'auto-overdue',
        label: 'Auto mark overdue',
        targetStatus: REQUEST_STATUS.PAYMENT_OVERDUE,
        description: 'Auto-marks overdue when EMI missed',
        priority: 99,
      },
      {
        id: 'auto-complete',
        label: 'Auto complete',
        targetStatus: REQUEST_STATUS.COMPLETED,
        description: 'Auto-completes when all EMIs paid',
        priority: 99,
      },
    ],
  },

  [REQUEST_STATUS.PAYMENT_OVERDUE]: {
    description: 'Customer missed EMI payment',
    customerActions: [],
    adminActions: [],
    agentActions: [],
    systemActions: [
      {
        id: 'auto-default',
        label: 'Auto default',
        targetStatus: REQUEST_STATUS.DEFAULTED,
        description: 'Auto-defaults after 3 missed EMIs',
        priority: 99,
      },
      {
        id: 'auto-active',
        label: 'Auto re-activate',
        targetStatus: REQUEST_STATUS.ACTIVE,
        description: 'Auto-activates when overdue EMI is paid',
        priority: 99,
      },
    ],
  },

  [REQUEST_STATUS.DEFAULTED]: {
    description: 'Multiple missed payments, loan defaulted',
    customerActions: [],
    adminActions: [
      {
        id: 'mark-settled',
        label: 'Mark as Settled',
        icon: 'CheckCircle',
        variant: 'default',
        targetStatus: REQUEST_STATUS.COMPLETED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 5,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.COMPLETED]: {
    description: 'All EMIs paid, loan successfully closed',
    customerActions: [],
    adminActions: [],
    agentActions: [],
  },

  // ============================================
  // TERMINAL STATES
  // ============================================

  [REQUEST_STATUS.REJECTED]: {
    description: 'Request was rejected',
    customerActions: [],
    adminActions: [
      {
        id: 'reopen',
        label: 'Reopen Request',
        icon: 'RotateCcw',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.UNDER_REVIEW,
        requiresInput: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.CANCELLED]: {
    description: 'Request was cancelled',
    customerActions: [],
    adminActions: [
      {
        id: 'reopen',
        label: 'Reopen Request',
        icon: 'RotateCcw',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.UNDER_REVIEW,
        requiresInput: true,
        districtCheck: true,
        priority: 10,
      },
    ],
    agentActions: [],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all available actions for a given status and role
 */
export function getAvailableActions(status: REQUEST_STATUS, role: UserRole): WorkflowAction[] {
  const state = WORKFLOW_MATRIX[status];
  if (!state) return [];

  switch (role) {
    case ROLES.CUSTOMER:
      return state.customerActions;
    case ROLES.DISTRICT_ADMIN:
    case ROLES.SUPER_ADMIN:
      return state.adminActions;
    case ROLES.AGENT:
      return state.agentActions;
    default:
      return [];
  }
}

/**
 * Get all available actions for a user with multiple roles
 * Merges actions from all applicable roles and filters based on permissions
 */
export function getActionsForUser(
  status: REQUEST_STATUS,
  user: UserContext,
  request: RequestContext
): WorkflowAction[] {
  const state = WORKFLOW_MATRIX[status];
  if (!state) return [];

  const allActions: WorkflowAction[] = [];
  const seenActionIds = new Set<string>();

  const hasDistrictAccess = (): boolean => {
    if (user.roles.includes(ROLES.SUPER_ADMIN)) return true;
    return user.districts?.includes(request.districtId) ?? false;
  };

  const canPerformAction = (action: WorkflowAction): boolean => {
    if (action.districtCheck && !hasDistrictAccess()) {
      return false;
    }
    if (action.requiresCustomerOwnership && user.id !== request.customerId) {
      return false;
    }
    if (action.requiresAgentAssignment && user.id !== request.agentId) {
      return false;
    }
    return true;
  };

  // Collect customer actions if user is the request owner
  if (user.roles.includes(ROLES.CUSTOMER) && user.id === request.customerId) {
    for (const action of state.customerActions) {
      if (!seenActionIds.has(action.id) && canPerformAction(action)) {
        allActions.push(action);
        seenActionIds.add(action.id);
      }
    }
  }

  // Collect admin actions if user has admin role
  if (user.roles.includes(ROLES.SUPER_ADMIN) || user.roles.includes(ROLES.DISTRICT_ADMIN)) {
    for (const action of state.adminActions) {
      if (!seenActionIds.has(action.id) && canPerformAction(action)) {
        allActions.push(action);
        seenActionIds.add(action.id);
      }
    }
  }

  // Collect agent actions if user has agent role
  if (user.roles.includes(ROLES.AGENT)) {
    for (const action of state.agentActions) {
      if (!seenActionIds.has(action.id) && canPerformAction(action)) {
        allActions.push(action);
        seenActionIds.add(action.id);
      }
    }
  }

  return allActions.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

/**
 * Check if user can view request details
 * 
 * Supports both:
 * - Stage-based (new): pass stage and optional subStatus
 * - Status-based (legacy): pass currentStatus (REQUEST_STATUS)
 */
export function canViewRequestDetail(
  user: UserContext,
  request: RequestContext,
  stageOrStatus?: REQUEST_STATUS | string,
  subStatus?: string | null
): boolean {
  // Import stage constants dynamically to avoid circular dependency
  const { REQUEST_STAGE } = require('../workflow/stage-constants');
  
  if (user.roles.includes(ROLES.SUPER_ADMIN)) {
    return true;
  }

  if (user.roles.includes(ROLES.CUSTOMER) && user.id === request.customerId) {
    return true;
  }

  if (user.roles.includes(ROLES.DISTRICT_ADMIN)) {
    if (user.id === request.adminId) {
      return true;
    }
    if (user.districts?.includes(request.districtId)) {
      // Check if stage is pending-like (DRAFT, REVIEW, OFFER)
      const pendingStages = [REQUEST_STAGE.DRAFT, REQUEST_STAGE.REVIEW, REQUEST_STAGE.OFFER];
      const isPending = stageOrStatus && pendingStages.includes(stageOrStatus);
      
      // Legacy: Also check old status format
      const isLegacyPending = stageOrStatus && PENDING_REQUEST_STATUSES.includes(stageOrStatus as REQUEST_STATUS);
      
      if ((isPending || isLegacyPending) && !request.adminId) {
        return true;
      }
      return false;
    }
  }

  if (user.roles.includes(ROLES.AGENT) && user.id === request.agentId) {
    // Agent loses access after certain stages (post-disbursement)
    const agentDenyStages = [REQUEST_STAGE.DISBURSEMENT, REQUEST_STAGE.ACTIVE, REQUEST_STAGE.COMPLETED];
    if (stageOrStatus && agentDenyStages.includes(stageOrStatus)) {
      // Check subStatus - allow if not yet disbursed
      if (stageOrStatus === REQUEST_STAGE.DISBURSEMENT && subStatus !== 'COMPLETED') {
        return true;
      }
      return false;
    }
    
    // Legacy: Also check old status format
    if (stageOrStatus && AGENT_ACCESS_DENY_STATUSES.includes(stageOrStatus as REQUEST_STATUS)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Get primary actions (high priority) for display on cards
 */
export function getPrimaryActions(status: REQUEST_STATUS, role: UserRole, limit: number = 2): WorkflowAction[] {
  const actions = getAvailableActions(status, role);
  return actions.sort((a, b) => (a.priority || 99) - (b.priority || 99)).slice(0, limit);
}

/**
 * Get secondary actions for "More" dropdown
 */
export function getSecondaryActions(
  status: REQUEST_STATUS,
  role: UserRole,
  primaryLimit: number = 2
): WorkflowAction[] {
  const actions = getAvailableActions(status, role);
  return actions.sort((a, b) => (a.priority || 99) - (b.priority || 99)).slice(primaryLimit);
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(fromStatus: REQUEST_STATUS, toStatus: REQUEST_STATUS, role: UserRole): boolean {
  const actions = getAvailableActions(fromStatus, role);
  return actions.some((action) => action.targetStatus === toStatus);
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: REQUEST_STATUS): string {
  return WORKFLOW_MATRIX[status]?.description || status;
}

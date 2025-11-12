/**
 * Workflow Engine for Request Status Management
 * 
 * This file defines the complete workflow state machine for loan requests,
 * including valid transitions, role-based actions, and business rules.
 */

import { REQUEST_STATUS, ROLES } from './constants';

// ============================================
// TYPES & INTERFACES
// ============================================

export type UserRole = 'CUSTOMER' | 'DISTRICT_ADMIN' | 'SUPER_ADMIN' | 'AGENT';

export interface WorkflowAction {
  id: string;                    // Unique action identifier
  label: string;                 // Display label for UI button
  description?: string;          // Tooltip or help text
  icon?: string;                 // Icon name (lucide-react)
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'; // Button style
  targetStatus: REQUEST_STATUS;  // Status after action
  requiresInput?: boolean;       // Opens modal/form for input
  requiresConfirmation?: boolean; // Shows confirmation dialog
  districtCheck?: boolean;       // Admin must have access to request's district
  requiresCustomerOwnership?: boolean; // Must be request owner
  requiresAgentAssignment?: boolean;   // Must be assigned agent
  priority?: number;             // Lower number = higher priority for display
}

export interface WorkflowState {
  description: string;           // Human-readable description of status
  customerActions: WorkflowAction[];
  adminActions: WorkflowAction[];
  agentActions: WorkflowAction[];
  systemActions?: WorkflowAction[]; // Automated system actions
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
      }
    ],
    adminActions: [
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
      }
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.UNDER_REVIEW]: {
    description: 'Admin is reviewing the request',
    customerActions: [],
    adminActions: [
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
      }
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
      }
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
      }
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
      }
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
      }
    ],
    agentActions: [],
    systemActions: [
      {
        id: 'expire-offer',
        label: 'Expire Offer',
        targetStatus: REQUEST_STATUS.OFFER_EXPIRED,
        description: 'Auto-expires after 7 days',
        priority: 99,
      }
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
      }
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
      }
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
      }
    ],
    agentActions: [],
  },

  // ============================================
  // PHASE 3: INSPECTION
  // ============================================

  [REQUEST_STATUS.INSPECTION_SCHEDULED]: {
    description: 'Agent assigned with scheduled date and time',
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
    ],
  },

  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: {
    description: 'Customer was not available at scheduled time',
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
      }
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
      }
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
      }
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
      }
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
      }
    ],
    agentActions: [],
  },

  // ============================================
  // PHASE 4: APPROVAL & DOCUMENTATION
  // ============================================

  [REQUEST_STATUS.APPROVED]: {
    description: 'Agent approved the request',
    customerActions: [],
    adminActions: [],
    agentActions: [],
    systemActions: [
      {
        id: 'auto-request-signature',
        label: 'Request Signature',
        targetStatus: REQUEST_STATUS.PENDING_SIGNATURE,
        description: 'Automatically moves to signature stage',
        priority: 1,
      }
    ],
  },

  [REQUEST_STATUS.PENDING_SIGNATURE]: {
    description: 'Waiting for customer to sign loan agreement',
    customerActions: [
      {
        id: 'sign-agreement',
        label: 'Sign Agreement',
        icon: 'FileSignature',
        variant: 'default',
        targetStatus: REQUEST_STATUS.PENDING_BANK_DETAILS,
        requiresCustomerOwnership: true,
        priority: 1,
      },
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
      }
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
      }
    ],
  },

  [REQUEST_STATUS.PENDING_BANK_DETAILS]: {
    description: 'Waiting for customer to provide UPI/bank details',
    customerActions: [
      {
        id: 'submit-bank-details',
        label: 'Submit Bank Details',
        icon: 'CreditCard',
        variant: 'default',
        targetStatus: REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
        requiresInput: true,
        requiresCustomerOwnership: true,
        priority: 1,
      }
    ],
    adminActions: [],
    agentActions: [],
    systemActions: [
      {
        id: 'auto-cancel-bank-details',
        label: 'Auto-cancel',
        targetStatus: REQUEST_STATUS.CANCELLED,
        description: 'Auto-cancels after 7 days if not submitted',
        priority: 99,
      }
    ],
  },

  // ============================================
  // PHASE 5: LOAN PROCESSING
  // ============================================

  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: {
    description: 'Customer submitted bank details, admin verifying',
    customerActions: [],
    adminActions: [
      {
        id: 'process-loan',
        label: 'Process Loan',
        icon: 'FileCheck',
        variant: 'default',
        targetStatus: REQUEST_STATUS.PROCESSING_LOAN,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'request-different-details',
        label: 'Request Different Details',
        icon: 'AlertCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.PENDING_BANK_DETAILS,
        requiresInput: true,
        districtCheck: true,
        priority: 5,
      }
    ],
    agentActions: [],
  },

  [REQUEST_STATUS.PROCESSING_LOAN]: {
    description: 'Admin is creating loan record',
    customerActions: [],
    adminActions: [
      {
        id: 'transfer-amount',
        label: 'Transfer Amount',
        icon: 'Send',
        variant: 'default',
        targetStatus: REQUEST_STATUS.TRANSFERRING_AMOUNT,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      }
    ],
    agentActions: [],
  },

  // ============================================
  // PHASE 6: DISBURSEMENT
  // ============================================

  [REQUEST_STATUS.TRANSFERRING_AMOUNT]: {
    description: 'Admin is transferring money to customer',
    customerActions: [],
    adminActions: [
      {
        id: 'confirm-transfer',
        label: 'Upload Proof & Confirm',
        icon: 'CheckCircle',
        variant: 'default',
        targetStatus: REQUEST_STATUS.AMOUNT_DISBURSED,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'transfer-failed',
        label: 'Transfer Failed',
        icon: 'AlertTriangle',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.TRANSFER_FAILED,
        requiresInput: true,
        districtCheck: true,
        priority: 5,
      }
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
      }
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
      }
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
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      }
    ],
    agentActions: [],
    systemActions: [
      {
        id: 'auto-activate',
        label: 'Auto-activate',
        targetStatus: REQUEST_STATUS.ACTIVE,
        description: 'Auto-activates after EMI schedule created',
        priority: 2,
      }
    ],
  },

  // ============================================
  // PHASE 7: ACTIVE LOAN
  // ============================================

  [REQUEST_STATUS.ACTIVE]: {
    description: 'Loan is active, customer paying EMIs',
    customerActions: [],
    adminActions: [
      {
        id: 'mark-overdue',
        label: 'Mark Overdue',
        icon: 'AlertCircle',
        variant: 'outline',
        targetStatus: REQUEST_STATUS.PAYMENT_OVERDUE,
        districtCheck: true,
        priority: 5,
      },
      {
        id: 'mark-completed',
        label: 'Mark Completed',
        icon: 'CheckCheck',
        variant: 'default',
        targetStatus: REQUEST_STATUS.COMPLETED,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 10,
      }
    ],
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
      }
    ],
  },

  [REQUEST_STATUS.PAYMENT_OVERDUE]: {
    description: 'Customer missed EMI payment',
    customerActions: [],
    adminActions: [
      {
        id: 'mark-paid',
        label: 'Mark as Paid',
        icon: 'CheckCircle',
        variant: 'default',
        targetStatus: REQUEST_STATUS.ACTIVE,
        requiresInput: true,
        districtCheck: true,
        priority: 1,
      },
      {
        id: 'mark-defaulted',
        label: 'Mark as Defaulted',
        icon: 'AlertTriangle',
        variant: 'destructive',
        targetStatus: REQUEST_STATUS.DEFAULTED,
        requiresInput: true,
        requiresConfirmation: true,
        districtCheck: true,
        priority: 5,
      }
    ],
    agentActions: [],
    systemActions: [
      {
        id: 'auto-default',
        label: 'Auto default',
        targetStatus: REQUEST_STATUS.DEFAULTED,
        description: 'Auto-defaults after 3 missed EMIs',
        priority: 99,
      }
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
      }
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
      }
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
      }
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
export function getAvailableActions(
  status: REQUEST_STATUS,
  role: UserRole
): WorkflowAction[] {
  const state = WORKFLOW_MATRIX[status];
  if (!state) return [];

  switch (role) {
    case 'CUSTOMER':
      return state.customerActions;
    case 'DISTRICT_ADMIN':
    case 'SUPER_ADMIN':
      return state.adminActions;
    case 'AGENT':
      return state.agentActions;
    default:
      return [];
  }
}

/**
 * Get primary actions (high priority) for display on cards
 */
export function getPrimaryActions(
  status: REQUEST_STATUS,
  role: UserRole,
  limit: number = 2
): WorkflowAction[] {
  const actions = getAvailableActions(status, role);
  return actions
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
    .slice(0, limit);
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
  return actions
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))
    .slice(primaryLimit);
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(
  fromStatus: REQUEST_STATUS,
  toStatus: REQUEST_STATUS,
  role: UserRole
): boolean {
  const actions = getAvailableActions(fromStatus, role);
  return actions.some(action => action.targetStatus === toStatus);
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: REQUEST_STATUS): string {
  return WORKFLOW_MATRIX[status]?.description || status;
}

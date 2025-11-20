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

export type UserRole = typeof ROLES[keyof typeof ROLES];

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
      }
    ],
  },

  [REQUEST_STATUS.PENDING_SIGNATURE]: {
    description: 'Waiting for customer to sign loan agreement',
    customerActions: [
      // No action button - SignaturePad component is rendered directly in the documents section
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
    description: 'Waiting for customer to provide bank details for disbursement',
    customerActions: [
      // Bank details form is shown directly in UI, no action button needed
    ],
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
        requiresInput: false,
        requiresConfirmation: true,
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
  // PHASE 6: ACTIVE LOAN
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
 * Request context for permission checks
 */
export interface RequestContext {
  customerId: string;
  district: string;
  agentId?: string | null;
}

/**
 * User context for multi-role permission checks
 */
export interface UserContext {
  id: string;
  roles: UserRole[];
  districts?: string[];
}

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
 * 
 * @param status - Current request status
 * @param user - User context with roles and districts
 * @param request - Request context for permission checks
 * @returns Deduplicated array of available actions
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

  // Helper to check district access
  const hasDistrictAccess = (): boolean => {
    if (user.roles.includes(ROLES.SUPER_ADMIN)) return true;
    return user.districts?.includes(request.district) ?? false;
  };

  // Helper to check if action passes permission checks
  const canPerformAction = (action: WorkflowAction): boolean => {
    // Check district access for admin actions
    if (action.districtCheck && !hasDistrictAccess()) {
      return false;
    }

    // Check customer ownership
    if (action.requiresCustomerOwnership && user.id !== request.customerId) {
      return false;
    }

    // Check agent assignment
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

  // Sort by priority
  return allActions.sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

/**
 * Check if user can view request details
 * TO-DO IMPLEMENTATION: Detail screen should only be shown to:
 * - Request owner (customer)
 * - District admin of that district
 * - Super admin
 * - Assigned agent
 * 
 * @param user - User context
 * @param request - Request context
 * @returns true if user can view the request
 */
export function canViewRequestDetail(
  user: UserContext,
  request: RequestContext
): boolean {
  // Super admin can view all requests
  if (user.roles.includes(ROLES.SUPER_ADMIN)) {
    return true;
  }

  // Customer can view their own requests
  if (user.roles.includes(ROLES.CUSTOMER) && user.id === request.customerId) {
    return true;
  }

  // District admin can view requests in their district
  if (user.roles.includes(ROLES.DISTRICT_ADMIN)) {
    if (user.districts?.includes(request.district)) {
      return true;
    }
  }

  // Assigned agent can view the request
  if (user.roles.includes(ROLES.AGENT) && user.id === request.agentId) {
    return true;
  }

  return false;
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

/**
 * @fileoverview Stage-Based Workflow Configuration
 * 
 * Defines all valid transitions, guards, and UI config for the
 * simplified 10-stage request lifecycle.
 */

import {
  REQUEST_STAGE,
  SUB_STATUS,
  MODAL_COMPONENTS,
  WORKFLOW_EVENTS,
  calculateActionFlags,
  type ActionFlags,
  type TransitionConfig,
  type WorkflowActionConfig,
  type WorkflowContext,
} from '@fundifyhub/types';

import { Guards } from './stage-guards';

// ============================================
// TYPE DEFINITIONS
// ============================================

type TransitionMap = Record<string, Record<string, TransitionConfig>>;
type ActionConfigMap = Record<string, WorkflowActionConfig>;

// ============================================
// TRANSITION RULES
// ============================================

/**
 * Stage transition configuration
 * 
 * Structure: TRANSITIONS[`${stage}:${subStatus}`][event] = config
 * 
 * Each entry defines what happens when an event is triggered
 * from a specific stage+subStatus combination.
 */
export const TRANSITIONS: TransitionMap = {
  // ========================================
  // REVIEW STAGE
  // ========================================
  
  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.PENDING}`]: {
    [WORKFLOW_EVENTS.ASSIGN_TO_ME]: {
      targetStage: REQUEST_STAGE.REVIEW,
      targetSubStatus: SUB_STATUS.REVIEW.ASSIGNED,
      guards: [Guards.isAdminInDistrict, Guards.isNotAssigned],
    },
    [WORKFLOW_EVENTS.ASSIGN_ADMIN]: {
      targetStage: REQUEST_STAGE.REVIEW,
      targetSubStatus: SUB_STATUS.REVIEW.ASSIGNED,
      guards: [Guards.isSuperAdmin],
      requiredInput: ['adminId'],
    },
    [WORKFLOW_EVENTS.START_REVIEW]: {
      targetStage: REQUEST_STAGE.REVIEW,
      targetSubStatus: SUB_STATUS.REVIEW.IN_REVIEW,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStage: REQUEST_STAGE.REJECTED,
      targetSubStatus: null,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['reason'],
    },
    [WORKFLOW_EVENTS.WITHDRAW]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
  },

  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.ASSIGNED}`]: {
    [WORKFLOW_EVENTS.START_REVIEW]: {
      targetStage: REQUEST_STAGE.REVIEW,
      targetSubStatus: SUB_STATUS.REVIEW.IN_REVIEW,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStage: REQUEST_STAGE.REJECTED,
      targetSubStatus: null,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['reason'],
    },
    [WORKFLOW_EVENTS.WITHDRAW]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
  },

  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.IN_REVIEW}`]: {
    [WORKFLOW_EVENTS.MAKE_OFFER]: {
      targetStage: REQUEST_STAGE.OFFER,
      targetSubStatus: SUB_STATUS.OFFER.SENT,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['amount', 'tenureMonths', 'interestRate'],
    },
    [WORKFLOW_EVENTS.REQUEST_INFO]: {
      targetStage: REQUEST_STAGE.REVIEW,
      targetSubStatus: SUB_STATUS.REVIEW.INFO_REQUIRED,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['notes'],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStage: REQUEST_STAGE.REJECTED,
      targetSubStatus: null,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['reason'],
    },
  },

  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.INFO_REQUIRED}`]: {
    [WORKFLOW_EVENTS.SUBMIT_INFO]: {
      targetStage: REQUEST_STAGE.REVIEW,
      targetSubStatus: SUB_STATUS.REVIEW.INFO_RECEIVED,
      guards: [Guards.isRequestOwner],
    },
    [WORKFLOW_EVENTS.WITHDRAW]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.INFO_RECEIVED}`]: {
    [WORKFLOW_EVENTS.START_REVIEW]: {
      targetStage: REQUEST_STAGE.REVIEW,
      targetSubStatus: SUB_STATUS.REVIEW.IN_REVIEW,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
    },
    [WORKFLOW_EVENTS.MAKE_OFFER]: {
      targetStage: REQUEST_STAGE.OFFER,
      targetSubStatus: SUB_STATUS.OFFER.SENT,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['amount', 'tenureMonths', 'interestRate'],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStage: REQUEST_STAGE.REJECTED,
      targetSubStatus: null,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['reason'],
    },
  },

  // ========================================
  // OFFER STAGE
  // ========================================

  [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.SENT}`]: {
    [WORKFLOW_EVENTS.ACCEPT_OFFER]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: SUB_STATUS.INSPECTION.PENDING_ASSIGNMENT,
      guards: [Guards.isRequestOwner],
    },
    [WORKFLOW_EVENTS.DECLINE_OFFER]: {
      targetStage: REQUEST_STAGE.OFFER,
      targetSubStatus: SUB_STATUS.OFFER.DECLINED,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
    [WORKFLOW_EVENTS.REVISE_OFFER]: {
      targetStage: REQUEST_STAGE.OFFER,
      targetSubStatus: SUB_STATUS.OFFER.SENT,
      guards: [Guards.canManageRequest],
      requiredInput: ['amount', 'tenureMonths', 'interestRate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
    [WORKFLOW_EVENTS.WITHDRAW]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.isRequestOwner],
    },
  },

  [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.DECLINED}`]: {
    [WORKFLOW_EVENTS.MAKE_OFFER]: {
      targetStage: REQUEST_STAGE.OFFER,
      targetSubStatus: SUB_STATUS.OFFER.SENT,
      guards: [Guards.canManageRequest],
      requiredInput: ['amount', 'tenureMonths', 'interestRate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.EXPIRED}`]: {
    [WORKFLOW_EVENTS.MAKE_OFFER]: {
      targetStage: REQUEST_STAGE.OFFER,
      targetSubStatus: SUB_STATUS.OFFER.SENT,
      guards: [Guards.canManageRequest],
      requiredInput: ['amount', 'tenureMonths', 'interestRate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  // ========================================
  // INSPECTION STAGE
  // ========================================

  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.PENDING_ASSIGNMENT}`]: {
    [WORKFLOW_EVENTS.ASSIGN_AGENT]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: SUB_STATUS.INSPECTION.SCHEDULED,
      guards: [Guards.canManageRequest],
      requiredInput: ['agentId', 'inspectionDate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.SCHEDULED}`]: {
    [WORKFLOW_EVENTS.START_INSPECTION]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: SUB_STATUS.INSPECTION.IN_PROGRESS,
      guards: [Guards.isAssignedAgent],
    },
    [WORKFLOW_EVENTS.REQUEST_RESCHEDULE]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: SUB_STATUS.INSPECTION.RESCHEDULE_REQUESTED,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
    [WORKFLOW_EVENTS.REASSIGN_AGENT]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: SUB_STATUS.INSPECTION.SCHEDULED,
      guards: [Guards.canManageRequest],
      requiredInput: ['agentId', 'inspectionDate'],
    },
    [WORKFLOW_EVENTS.REPORT_ISSUE]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: null, // Will be set based on issue type
      guards: [Guards.isAssignedAgent],
      requiredInput: ['issueType', 'description'],
    },
    [WORKFLOW_EVENTS.WITHDRAW]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.isRequestOwner],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.RESCHEDULE_REQUESTED}`]: {
    [WORKFLOW_EVENTS.APPROVE_RESCHEDULE]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: SUB_STATUS.INSPECTION.SCHEDULED,
      guards: [Guards.canManageRequest],
      requiredInput: ['agentId', 'inspectionDate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.IN_PROGRESS}`]: {
    [WORKFLOW_EVENTS.COMPLETE_INSPECTION]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: SUB_STATUS.INSPECTION.COMPLETED,
      guards: [Guards.isAssignedAgent],
      requiredInput: ['notes'],
    },
    [WORKFLOW_EVENTS.REPORT_ISSUE]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: null, // Will be set based on issue type
      guards: [Guards.isAssignedAgent],
      requiredInput: ['issueType', 'description'],
    },
  },

  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.COMPLETED}`]: {
    [WORKFLOW_EVENTS.APPROVE]: {
      targetStage: REQUEST_STAGE.DOCUMENTATION,
      targetSubStatus: SUB_STATUS.DOCUMENTATION.PENDING_SIGNATURE,
      guards: [Guards.isAssignedAgentOrAdmin],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStage: REQUEST_STAGE.REJECTED,
      targetSubStatus: null,
      guards: [Guards.isAssignedAgentOrAdmin],
      requiredInput: ['reason'],
    },
  },

  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.CUSTOMER_UNAVAILABLE}`]: {
    [WORKFLOW_EVENTS.APPROVE_RESCHEDULE]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: SUB_STATUS.INSPECTION.SCHEDULED,
      guards: [Guards.canManageRequest],
      requiredInput: ['agentId', 'inspectionDate'],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStage: REQUEST_STAGE.REJECTED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
      requiredInput: ['reason'],
    },
  },

  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.AGENT_UNAVAILABLE}`]: {
    [WORKFLOW_EVENTS.REASSIGN_AGENT]: {
      targetStage: REQUEST_STAGE.INSPECTION,
      targetSubStatus: SUB_STATUS.INSPECTION.SCHEDULED,
      guards: [Guards.canManageRequest],
      requiredInput: ['agentId', 'inspectionDate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.ASSET_ISSUE}`]: {
    [WORKFLOW_EVENTS.REVISE_OFFER]: {
      targetStage: REQUEST_STAGE.OFFER,
      targetSubStatus: SUB_STATUS.OFFER.SENT,
      guards: [Guards.canManageRequest],
      requiredInput: ['amount', 'tenureMonths', 'interestRate'],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStage: REQUEST_STAGE.REJECTED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
      requiredInput: ['reason'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  // ========================================
  // DOCUMENTATION STAGE
  // ========================================

  [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_SIGNATURE}`]: {
    [WORKFLOW_EVENTS.SIGN_AGREEMENT]: {
      targetStage: REQUEST_STAGE.DOCUMENTATION,
      targetSubStatus: SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS,
      guards: [Guards.isRequestOwner],
    },
    [WORKFLOW_EVENTS.REFUSE_SIGNATURE]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
  },

  [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS}`]: {
    [WORKFLOW_EVENTS.SUBMIT_BANK_DETAILS]: {
      targetStage: REQUEST_STAGE.DISBURSEMENT,
      targetSubStatus: SUB_STATUS.DISBURSEMENT.PENDING,
      guards: [Guards.isRequestOwner],
      requiredInput: ['accountNumber', 'ifscCode', 'accountName'],
    },
  },

  [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.BANK_DETAILS_SUBMITTED}`]: {
    // This is a transitional state, normally moves to DISBURSEMENT
    [WORKFLOW_EVENTS.REQUEST_NEW_BANK_DETAILS]: {
      targetStage: REQUEST_STAGE.DOCUMENTATION,
      targetSubStatus: SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS,
      guards: [Guards.canManageRequest],
      requiredInput: ['reason'],
    },
  },

  // ========================================
  // DISBURSEMENT STAGE
  // ========================================

  [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.PENDING}`]: {
    [WORKFLOW_EVENTS.DISBURSE]: {
      targetStage: REQUEST_STAGE.DISBURSEMENT,
      targetSubStatus: SUB_STATUS.DISBURSEMENT.COMPLETED,
      guards: [Guards.canManageRequest],
      requiredInput: ['transactionId'],
    },
    [WORKFLOW_EVENTS.REQUEST_NEW_BANK_DETAILS]: {
      targetStage: REQUEST_STAGE.DOCUMENTATION,
      targetSubStatus: SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS,
      guards: [Guards.canManageRequest],
      requiredInput: ['reason'],
    },
  },

  [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.COMPLETED}`]: {
    [WORKFLOW_EVENTS.ACTIVATE_LOAN]: {
      targetStage: REQUEST_STAGE.ACTIVE,
      targetSubStatus: SUB_STATUS.ACTIVE.CURRENT,
      guards: [Guards.canManageRequest],
    },
  },

  [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.FAILED}`]: {
    [WORKFLOW_EVENTS.RETRY_TRANSFER]: {
      targetStage: REQUEST_STAGE.DOCUMENTATION,
      targetSubStatus: SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS,
      guards: [Guards.isRequestOwner],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStage: REQUEST_STAGE.CANCELLED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  // ========================================
  // ACTIVE STAGE
  // ========================================

  [`${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.CURRENT}`]: {
    [WORKFLOW_EVENTS.MARK_OVERDUE]: {
      targetStage: REQUEST_STAGE.ACTIVE,
      targetSubStatus: SUB_STATUS.ACTIVE.OVERDUE,
      systemOnly: true,
    },
    [WORKFLOW_EVENTS.COMPLETE_LOAN]: {
      targetStage: REQUEST_STAGE.COMPLETED,
      targetSubStatus: null,
      systemOnly: true,
    },
  },

  [`${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.OVERDUE}`]: {
    [WORKFLOW_EVENTS.MARK_DEFAULTED]: {
      targetStage: REQUEST_STAGE.ACTIVE,
      targetSubStatus: SUB_STATUS.ACTIVE.DEFAULTED,
      guards: [Guards.canManageRequest],
    },
    [WORKFLOW_EVENTS.COMPLETE_LOAN]: {
      targetStage: REQUEST_STAGE.COMPLETED,
      targetSubStatus: null,
      systemOnly: true,
    },
  },

  [`${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.DEFAULTED}`]: {
    [WORKFLOW_EVENTS.SETTLE_LOAN]: {
      targetStage: REQUEST_STAGE.COMPLETED,
      targetSubStatus: null,
      guards: [Guards.canManageRequest],
    },
  },

  // ========================================
  // TERMINAL STAGES (can be reopened)
  // ========================================

  [`${REQUEST_STAGE.REJECTED}:null`]: {
    [WORKFLOW_EVENTS.REOPEN]: {
      targetStage: REQUEST_STAGE.REVIEW,
      targetSubStatus: SUB_STATUS.REVIEW.PENDING,
      guards: [Guards.canManageRequest],
    },
  },

  [`${REQUEST_STAGE.CANCELLED}:null`]: {
    [WORKFLOW_EVENTS.REOPEN]: {
      targetStage: REQUEST_STAGE.REVIEW,
      targetSubStatus: SUB_STATUS.REVIEW.PENDING,
      guards: [Guards.canManageRequest],
    },
  },
};

// ============================================
// ACTION UI CONFIGURATION
// ============================================

export const ACTION_CONFIG: ActionConfigMap = {
  // Review stage actions
  [WORKFLOW_EVENTS.ASSIGN_TO_ME]: {
    label: 'Assign to Me',
    icon: 'UserPlus',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Take ownership of this request',
  },
  [WORKFLOW_EVENTS.ASSIGN_ADMIN]: {
    label: 'Assign Admin',
    icon: 'UserCog',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.ASSIGN_ADMIN_MODAL,
    tooltip: 'Assign a district admin',
  },
  [WORKFLOW_EVENTS.START_REVIEW]: {
    label: 'Start Review',
    icon: 'FileSearch',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Begin reviewing this request',
  },
  [WORKFLOW_EVENTS.REQUEST_INFO]: {
    label: 'Request Info',
    icon: 'MessageCircle',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.REQUEST_INFO_MODAL,
    tooltip: 'Ask for additional information',
  },
  [WORKFLOW_EVENTS.SUBMIT_INFO]: {
    label: 'Submit Info',
    icon: 'Upload',
    variant: 'default',
    tooltip: 'Submit requested information',
  },

  // Offer stage actions
  [WORKFLOW_EVENTS.MAKE_OFFER]: {
    label: 'Make Offer',
    icon: 'BadgeDollarSign',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.CREATE_OFFER_MODAL,
    tooltip: 'Create a loan offer',
  },
  [WORKFLOW_EVENTS.REVISE_OFFER]: {
    label: 'Revise Offer',
    icon: 'Edit',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.CREATE_OFFER_MODAL,
    tooltip: 'Modify the offer',
  },
  [WORKFLOW_EVENTS.ACCEPT_OFFER]: {
    label: 'Accept Offer',
    icon: 'CheckCircle',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Accept the loan offer',
  },
  [WORKFLOW_EVENTS.DECLINE_OFFER]: {
    label: 'Decline Offer',
    icon: 'XCircle',
    variant: 'destructive',
    modalComponent: MODAL_COMPONENTS.DECLINE_OFFER_MODAL,
    tooltip: 'Decline the loan offer',
  },

  // Inspection stage actions
  [WORKFLOW_EVENTS.ASSIGN_AGENT]: {
    label: 'Assign Agent',
    icon: 'UserPlus',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.ASSIGN_AGENT_MODAL,
    tooltip: 'Assign agent for inspection',
  },
  [WORKFLOW_EVENTS.REASSIGN_AGENT]: {
    label: 'Reassign Agent',
    icon: 'UserSwitch',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.ASSIGN_AGENT_MODAL,
    tooltip: 'Assign a different agent',
  },
  [WORKFLOW_EVENTS.START_INSPECTION]: {
    label: 'Start Inspection',
    icon: 'PlayCircle',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Begin asset inspection',
  },
  [WORKFLOW_EVENTS.COMPLETE_INSPECTION]: {
    label: 'Complete Inspection',
    icon: 'ClipboardCheck',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.COMPLETE_INSPECTION_MODAL,
    tooltip: 'Mark inspection as complete',
  },
  [WORKFLOW_EVENTS.REQUEST_RESCHEDULE]: {
    label: 'Request Reschedule',
    icon: 'Calendar',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.RESCHEDULE_MODAL,
    tooltip: 'Request a new date',
  },
  [WORKFLOW_EVENTS.APPROVE_RESCHEDULE]: {
    label: 'Reschedule',
    icon: 'Calendar',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.ASSIGN_AGENT_MODAL,
    tooltip: 'Set new inspection date',
  },
  [WORKFLOW_EVENTS.REPORT_ISSUE]: {
    label: 'Report Issue',
    icon: 'AlertTriangle',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.REPORT_ISSUE_MODAL,
    tooltip: 'Report a problem',
  },
  [WORKFLOW_EVENTS.APPROVE]: {
    label: 'Approve',
    icon: 'ThumbsUp',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.APPROVE_MODAL,
    tooltip: 'Approve the asset',
  },

  // Documentation stage actions
  [WORKFLOW_EVENTS.SIGN_AGREEMENT]: {
    label: 'Sign Agreement',
    icon: 'FileSignature',
    variant: 'default',
    tooltip: 'Sign the loan agreement',
  },
  [WORKFLOW_EVENTS.REFUSE_SIGNATURE]: {
    label: 'Refuse to Sign',
    icon: 'XCircle',
    variant: 'destructive',
    modalComponent: MODAL_COMPONENTS.REFUSE_SIGNATURE_MODAL,
    tooltip: 'Refuse to sign',
  },
  [WORKFLOW_EVENTS.SUBMIT_BANK_DETAILS]: {
    label: 'Submit Bank Details',
    icon: 'Building2',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.BANK_DETAILS_MODAL,
    tooltip: 'Provide bank account details',
  },
  [WORKFLOW_EVENTS.REQUEST_NEW_BANK_DETAILS]: {
    label: 'Request New Details',
    icon: 'AlertCircle',
    variant: 'outline',
    tooltip: 'Ask for different bank details',
  },

  // Disbursement stage actions
  [WORKFLOW_EVENTS.DISBURSE]: {
    label: 'Disburse',
    icon: 'Banknote',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.DISBURSEMENT_MODAL,
    tooltip: 'Transfer loan amount',
  },
  [WORKFLOW_EVENTS.MARK_TRANSFER_FAILED]: {
    label: 'Mark Failed',
    icon: 'XCircle',
    variant: 'destructive',
    modalComponent: MODAL_COMPONENTS.TRANSFER_FAILED_MODAL,
    tooltip: 'Mark transfer as failed',
  },
  [WORKFLOW_EVENTS.RETRY_TRANSFER]: {
    label: 'Update Bank Details',
    icon: 'RefreshCw',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.BANK_DETAILS_MODAL,
    tooltip: 'Provide new bank details',
  },
  [WORKFLOW_EVENTS.ACTIVATE_LOAN]: {
    label: 'Activate Loan',
    icon: 'Zap',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Start the loan and EMI schedule',
  },

  // Active stage actions
  [WORKFLOW_EVENTS.MARK_OVERDUE]: {
    label: 'Mark Overdue',
    icon: 'AlertTriangle',
    variant: 'outline',
    tooltip: 'Mark as overdue (system)',
  },
  [WORKFLOW_EVENTS.MARK_DEFAULTED]: {
    label: 'Mark Defaulted',
    icon: 'Ban',
    variant: 'destructive',
    requiresConfirmation: true,
    tooltip: 'Mark loan as defaulted',
  },
  [WORKFLOW_EVENTS.COMPLETE_LOAN]: {
    label: 'Complete Loan',
    icon: 'PartyPopper',
    variant: 'default',
    tooltip: 'Mark loan as complete (system)',
  },
  [WORKFLOW_EVENTS.SETTLE_LOAN]: {
    label: 'Settle',
    icon: 'CheckCheck',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Mark defaulted loan as settled',
  },

  // Terminal actions
  [WORKFLOW_EVENTS.REJECT]: {
    label: 'Reject',
    icon: 'XCircle',
    variant: 'destructive',
    modalComponent: MODAL_COMPONENTS.REJECT_MODAL,
    tooltip: 'Reject this request',
  },
  [WORKFLOW_EVENTS.CANCEL]: {
    label: 'Cancel',
    icon: 'Ban',
    variant: 'destructive',
    modalComponent: MODAL_COMPONENTS.CANCEL_MODAL,
    tooltip: 'Cancel this request',
  },
  [WORKFLOW_EVENTS.WITHDRAW]: {
    label: 'Withdraw',
    icon: 'XCircle',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.WITHDRAW_MODAL,
    tooltip: 'Withdraw your request',
  },
  [WORKFLOW_EVENTS.REOPEN]: {
    label: 'Reopen',
    icon: 'RotateCcw',
    variant: 'outline',
    requiresConfirmation: true,
    tooltip: 'Reopen this request',
  },

  // Common
  [WORKFLOW_EVENTS.ADD_COMMENT]: {
    label: 'Add Comment',
    icon: 'MessageSquare',
    variant: 'ghost',
    tooltip: 'Add a comment',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the transition key for a stage+subStatus
 */
function getTransitionKey(stage: REQUEST_STAGE, subStatus: string | null): string {
  return `${stage}:${subStatus ?? 'null'}`;
}

/**
 * Get available transitions for a stage+subStatus
 */
export function getAvailableTransitions(
  stage: REQUEST_STAGE,
  subStatus: string | null
): Record<string, TransitionConfig> {
  const key = getTransitionKey(stage, subStatus);
  return TRANSITIONS[key] ?? {};
}

/**
 * Get available events for a given state
 */
export function getAvailableEvents(
  stage: REQUEST_STAGE,
  subStatus: string | null,
  context: WorkflowContext
): string[] {
  const transitions = getAvailableTransitions(stage, subStatus);
  const events: string[] = [];

  for (const [event, config] of Object.entries(transitions)) {
    // Skip system-only events
    if (config.systemOnly) continue;

    // Check guards
    const guardsPass = config.guards?.every((guard) => guard(context)) ?? true;
    if (guardsPass) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Get action configs for available events
 */
export function getAvailableActions(
  stage: REQUEST_STAGE,
  subStatus: string | null,
  context: WorkflowContext
): Array<{ event: string; config: WorkflowActionConfig }> {
  const events = getAvailableEvents(stage, subStatus, context);
  
  return events
    .map((event) => ({
      event,
      config: ACTION_CONFIG[event],
    }))
    .filter((item) => item.config !== undefined)
    .sort((a, b) => (a.config.priority ?? 99) - (b.config.priority ?? 99));
}

/**
 * Check if a transition is allowed
 */
export function canTransition(
  stage: REQUEST_STAGE,
  subStatus: string | null,
  event: string,
  context: WorkflowContext
): { allowed: boolean; reason?: string } {
  const transitions = getAvailableTransitions(stage, subStatus);
  const config = transitions[event];

  if (!config) {
    return { allowed: false, reason: 'Invalid transition' };
  }

  if (config.systemOnly) {
    return { allowed: false, reason: 'System-only action' };
  }

  const guardsPass = config.guards?.every((guard) => guard(context)) ?? true;
  if (!guardsPass) {
    return { allowed: false, reason: 'Permission denied' };
  }

  return { allowed: true };
}

/**
 * Execute a transition and return the new state
 */
export function executeTransition(
  stage: REQUEST_STAGE,
  subStatus: string | null,
  event: string
): { stage: REQUEST_STAGE; subStatus: string | null; actionFlags: ActionFlags } | null {
  const transitions = getAvailableTransitions(stage, subStatus);
  const config = transitions[event];

  if (!config) {
    return null;
  }

  const newSubStatus = config.targetSubStatus;
  const actionFlags = calculateActionFlags(config.targetStage, newSubStatus);

  return {
    stage: config.targetStage,
    subStatus: newSubStatus,
    actionFlags,
  };
}

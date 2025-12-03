import { REQUEST_STATUS, WORKFLOW_EVENTS, MODAL_COMPONENTS } from '@fundifyhub/types';
import type { TransitionConfig, WorkflowActionConfig } from '@fundifyhub/types';
import { Guards } from './guards';

// ============================================
// TRANSITION RULES (The Logic)
// ============================================

export const TRANSITIONS: Record<string, Record<string, TransitionConfig>> = {
  [REQUEST_STATUS.PENDING]: {
    [WORKFLOW_EVENTS.SELF_ASSIGN_ADMIN]: {
      targetStatus: REQUEST_STATUS.PENDING, // Status stays same, but assignedAdminId is set
      guards: [Guards.isDistrictAdminInDistrict, Guards.isNotAssignedToAnyAdmin],
    },
    [WORKFLOW_EVENTS.ASSIGN_ADMIN]: {
      targetStatus: REQUEST_STATUS.PENDING, // Status stays same, but assignedAdminId is set
      guards: [Guards.isSuperAdmin],
      requiredInput: ['adminId'],
    },
    [WORKFLOW_EVENTS.START_REVIEW]: {
      targetStatus: REQUEST_STATUS.UNDER_REVIEW,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStatus: REQUEST_STATUS.REJECTED,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['reason'],
    },
    [WORKFLOW_EVENTS.WITHDRAW]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
  },

  [REQUEST_STATUS.UNDER_REVIEW]: {
    [WORKFLOW_EVENTS.MAKE_OFFER]: {
      targetStatus: REQUEST_STATUS.OFFER_SENT,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['amount', 'tenureMonths', 'interestRate'],
    },
    [WORKFLOW_EVENTS.REQUEST_MORE_INFO]: {
      targetStatus: REQUEST_STATUS.MORE_INFO_REQUIRED,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['notes'],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStatus: REQUEST_STATUS.REJECTED,
      guards: [Guards.isAssignedAdminOrSuperAdmin],
      requiredInput: ['reason'],
    },
  },

  [REQUEST_STATUS.MORE_INFO_REQUIRED]: {
    [WORKFLOW_EVENTS.SUBMIT_INFO]: {
      targetStatus: REQUEST_STATUS.PENDING,
      guards: [Guards.isRequestOwner],
    },
    [WORKFLOW_EVENTS.WITHDRAW]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.isRequestOwner],
    },
    [WORKFLOW_EVENTS.RESUME_REVIEW]: {
      targetStatus: REQUEST_STATUS.UNDER_REVIEW,
      guards: [Guards.canManageRequest],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.OFFER_SENT]: {
    [WORKFLOW_EVENTS.ACCEPT_OFFER]: {
      targetStatus: REQUEST_STATUS.OFFER_ACCEPTED,
      guards: [Guards.isRequestOwner],
    },
    [WORKFLOW_EVENTS.DECLINE_OFFER]: {
      targetStatus: REQUEST_STATUS.OFFER_DECLINED,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
    [WORKFLOW_EVENTS.REVISE_OFFER]: {
      targetStatus: REQUEST_STATUS.OFFER_SENT,
      guards: [Guards.canManageRequest],
      requiredInput: ['amount', 'tenureMonths', 'interestRate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.canManageRequest],
    },
    [WORKFLOW_EVENTS.EXPIRE_OFFER]: {
      targetStatus: REQUEST_STATUS.OFFER_EXPIRED,
      // System action, no user guards needed usually, but can add system check
    },
  },

  [REQUEST_STATUS.OFFER_ACCEPTED]: {
    [WORKFLOW_EVENTS.ASSIGN_AGENT]: {
      targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
      guards: [Guards.canManageRequest],
      requiredInput: ['agentId', 'inspectionDate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.OFFER_DECLINED]: {
    [WORKFLOW_EVENTS.MAKE_OFFER]: { // Make New Offer
      targetStatus: REQUEST_STATUS.OFFER_SENT,
      guards: [Guards.canManageRequest],
      requiredInput: ['amount', 'tenureMonths', 'interestRate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.INSPECTION_SCHEDULED]: {
    [WORKFLOW_EVENTS.START_INSPECTION]: {
      targetStatus: REQUEST_STATUS.INSPECTION_IN_PROGRESS,
      guards: [Guards.isAssignedAgent],
    },
    [WORKFLOW_EVENTS.REQUEST_RESCHEDULE]: {
      targetStatus: REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
    [WORKFLOW_EVENTS.REASSIGN_AGENT]: {
      targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
      guards: [Guards.canManageRequest],
      requiredInput: ['agentId'],
    },
    [WORKFLOW_EVENTS.CUSTOMER_NOT_AVAILABLE]: {
      targetStatus: REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE,
      guards: [Guards.isAssignedAgent],
    },
    [WORKFLOW_EVENTS.AGENT_NOT_AVAILABLE]: {
      targetStatus: REQUEST_STATUS.AGENT_NOT_AVAILABLE,
      guards: [Guards.isAssignedAgent],
    },
    [WORKFLOW_EVENTS.WITHDRAW]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.isRequestOwner],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: {
    [WORKFLOW_EVENTS.RESCHEDULE_INSPECTION]: {
      targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
      guards: [Guards.canManageRequest],
      requiredInput: ['agentId', 'inspectionDate'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.canManageRequest],
    },
    [WORKFLOW_EVENTS.WITHDRAW]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.isRequestOwner],
    },
  },

  [REQUEST_STATUS.INSPECTION_IN_PROGRESS]: {
    [WORKFLOW_EVENTS.COMPLETE_INSPECTION]: {
      targetStatus: REQUEST_STATUS.INSPECTION_COMPLETED,
      guards: [Guards.isAssignedAgent],
    },
  },

  [REQUEST_STATUS.INSPECTION_COMPLETED]: {
    [WORKFLOW_EVENTS.APPROVE_INSPECTION]: {
      targetStatus: REQUEST_STATUS.APPROVED,
      guards: [Guards.isAssignedAgent],
    },
    [WORKFLOW_EVENTS.REJECT_INSPECTION]: {
      targetStatus: REQUEST_STATUS.REJECTED,
      guards: [Guards.isAssignedAgent],
      requiredInput: ['reason'],
    },
  },

  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: {
    [WORKFLOW_EVENTS.RESCHEDULE_INSPECTION]: {
      targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
      guards: [Guards.canManageRequest], // Admin reschedules
      requiredInput: ['agentId', 'inspectionDate'],
    },
    [WORKFLOW_EVENTS.REQUEST_RESCHEDULE]: {
      targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
      guards: [Guards.isRequestOwner], // Customer requests reschedule
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStatus: REQUEST_STATUS.REJECTED,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.ASSET_MISMATCH]: {
    [WORKFLOW_EVENTS.PROVIDE_EXPLANATION]: {
      targetStatus: REQUEST_STATUS.ASSET_MISMATCH, // Status doesn't change, just adds info
      guards: [Guards.isRequestOwner],
      requiredInput: ['explanation'],
    },
    [WORKFLOW_EVENTS.REVISE_OFFER]: {
      targetStatus: REQUEST_STATUS.OFFER_SENT,
      guards: [Guards.canManageRequest],
    },
    [WORKFLOW_EVENTS.REJECT]: {
      targetStatus: REQUEST_STATUS.REJECTED,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.AGENT_NOT_AVAILABLE]: {
    [WORKFLOW_EVENTS.REASSIGN_AGENT]: {
      targetStatus: REQUEST_STATUS.INSPECTION_SCHEDULED,
      guards: [Guards.canManageRequest],
      requiredInput: ['agentId'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.APPROVED]: {
    // System automatically moves to PENDING_SIGNATURE usually, but if manual:
    // No manual actions defined in matrix for this state usually
  },

  [REQUEST_STATUS.PENDING_SIGNATURE]: {
    [WORKFLOW_EVENTS.REFUSE_SIGNATURE]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.isRequestOwner],
      requiredInput: ['reason'],
    },
    // Signing is handled via document upload/API, which triggers status change
  },

  [REQUEST_STATUS.PENDING_BANK_DETAILS]: {
    [WORKFLOW_EVENTS.SUBMIT_BANK_DETAILS]: {
      targetStatus: REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
      guards: [Guards.isRequestOwner],
      requiredInput: ['accountNumber', 'ifscCode', 'accountName'],
    },
  },

  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: {
    [WORKFLOW_EVENTS.DISBURSE]: {
      targetStatus: REQUEST_STATUS.AMOUNT_DISBURSED,
      guards: [Guards.canManageRequest],
      requiredInput: ['transactionId'],
    },
    [WORKFLOW_EVENTS.REQUEST_DIFFERENT_BANK_DETAILS]: {
      targetStatus: REQUEST_STATUS.PENDING_BANK_DETAILS,
      guards: [Guards.canManageRequest],
      requiredInput: ['reason'],
    },
  },

  [REQUEST_STATUS.TRANSFER_FAILED]: {
    [WORKFLOW_EVENTS.UPDATE_BANK_DETAILS]: {
      targetStatus: REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
      guards: [Guards.isRequestOwner],
      requiredInput: ['accountNumber', 'ifscCode', 'accountName'],
    },
    [WORKFLOW_EVENTS.CANCEL]: {
      targetStatus: REQUEST_STATUS.CANCELLED,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.AMOUNT_DISBURSED]: {
    [WORKFLOW_EVENTS.CREATE_LOAN]: {
      targetStatus: REQUEST_STATUS.ACTIVE,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.DEFAULTED]: {
    [WORKFLOW_EVENTS.MARK_SETTLED]: {
      targetStatus: REQUEST_STATUS.COMPLETED,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.REJECTED]: {
    [WORKFLOW_EVENTS.REOPEN]: {
      targetStatus: REQUEST_STATUS.UNDER_REVIEW,
      guards: [Guards.canManageRequest],
    },
  },

  [REQUEST_STATUS.CANCELLED]: {
    [WORKFLOW_EVENTS.REOPEN]: {
      targetStatus: REQUEST_STATUS.UNDER_REVIEW,
      guards: [Guards.canManageRequest],
    },
  },
};

// ============================================
// UI CONFIGURATION (The Look)
// ============================================

export const ACTION_CONFIG: Record<string, WorkflowActionConfig> = {
  [WORKFLOW_EVENTS.SELF_ASSIGN_ADMIN]: {
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
    tooltip: 'Assign a district admin to handle this request',
  },
  [WORKFLOW_EVENTS.START_REVIEW]: {
    label: 'Start Review',
    icon: 'FileSearch',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Begin reviewing this request',
  },
  [WORKFLOW_EVENTS.MAKE_OFFER]: {
    label: 'Make Offer',
    icon: 'BadgeDollarSign',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.CREATE_OFFER_MODAL,
    tooltip: 'Create a loan offer for the customer',
  },
  [WORKFLOW_EVENTS.REVISE_OFFER]: {
    label: 'Revise Offer',
    icon: 'Edit',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.CREATE_OFFER_MODAL,
    tooltip: 'Modify the existing offer',
  },
  [WORKFLOW_EVENTS.REQUEST_MORE_INFO]: {
    label: 'Request More Info',
    icon: 'MessageCircle',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.REQUEST_INFO_MODAL,
    tooltip: 'Ask the customer for additional information',
  },
  [WORKFLOW_EVENTS.REJECT]: {
    label: 'Reject',
    icon: 'XCircle',
    variant: 'destructive',
    requiresConfirmation: true,
    modalComponent: MODAL_COMPONENTS.REJECT_MODAL,
    tooltip: 'Reject this request',
  },
  [WORKFLOW_EVENTS.WITHDRAW]: {
    label: 'Withdraw Request',
    icon: 'XCircle',
    variant: 'outline',
    requiresConfirmation: true,
    modalComponent: MODAL_COMPONENTS.CANCEL_WITHDRAW_MODAL,
    tooltip: 'Withdraw your request',
  },
  // SUBMIT_INFO is handled by the ResponseSection component, not the action bar
  // [WORKFLOW_EVENTS.SUBMIT_INFO]: {
  //   label: 'Submit Info',
  //   icon: 'Upload',
  //   variant: 'default',
  //   tooltip: 'Submit the requested information',
  // },
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
    modalComponent: MODAL_COMPONENTS.OFFER_DECLINE_MODAL,
    tooltip: 'Decline the loan offer',
  },
  [WORKFLOW_EVENTS.ASSIGN_AGENT]: {
    label: 'Assign Agent',
    icon: 'UserPlus',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.ASSIGN_AGENT_MODAL,
    tooltip: 'Assign a field agent for inspection',
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
    tooltip: 'Begin the asset inspection',
  },
  [WORKFLOW_EVENTS.COMPLETE_INSPECTION]: {
    label: 'Complete Inspection',
    icon: 'CheckCircle',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.COMPLETE_INSPECTION_MODAL,
    tooltip: 'Mark inspection as complete',
  },
  [WORKFLOW_EVENTS.REQUEST_RESCHEDULE]: {
    label: 'Request Reschedule',
    icon: 'Calendar',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.RESCHEDULE_MODAL,
    tooltip: 'Request a new inspection date',
  },
  [WORKFLOW_EVENTS.RESCHEDULE_INSPECTION]: {
    label: 'Reschedule Inspection',
    icon: 'Calendar',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.ASSIGN_AGENT_MODAL,
    tooltip: 'Set a new inspection date',
  },
  [WORKFLOW_EVENTS.APPROVE_INSPECTION]: {
    label: 'Approve',
    icon: 'ThumbsUp',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.APPROVE_MODAL,
    tooltip: 'Approve the inspection results',
  },
  [WORKFLOW_EVENTS.REJECT_INSPECTION]: {
    label: 'Reject',
    icon: 'ThumbsDown',
    variant: 'destructive',
    modalComponent: MODAL_COMPONENTS.REJECT_MODAL,
    tooltip: 'Reject the inspection results',
  },
  [WORKFLOW_EVENTS.CUSTOMER_NOT_AVAILABLE]: {
    label: 'Customer Not Available',
    icon: 'UserX',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.AGENT_ISSUE_MODAL,
    tooltip: 'Report customer unavailability',
  },
  [WORKFLOW_EVENTS.AGENT_NOT_AVAILABLE]: {
    label: "Can't Make It",
    icon: 'UserMinus',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.AGENT_ISSUE_MODAL,
    tooltip: 'Report agent unavailability',
  },
  [WORKFLOW_EVENTS.DISBURSE]: {
    label: 'Disburse Amount',
    icon: 'Send',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.DISBURSEMENT_MODAL,
    tooltip: 'Disburse the loan amount to customer',
  },
  [WORKFLOW_EVENTS.REQUEST_DIFFERENT_BANK_DETAILS]: {
    label: 'Request New Details',
    icon: 'AlertCircle',
    variant: 'outline',
    modalComponent: MODAL_COMPONENTS.REQUEST_BANK_DETAILS_MODAL,
    tooltip: 'Ask customer for different bank details',
  },
  [WORKFLOW_EVENTS.CREATE_LOAN]: {
    label: 'Activate Loan',
    icon: 'Zap',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Activate the loan and start EMI schedule',
  },
  [WORKFLOW_EVENTS.CANCEL]: {
    label: 'Cancel Request',
    icon: 'Ban',
    variant: 'destructive',
    modalComponent: MODAL_COMPONENTS.CANCEL_WITHDRAW_MODAL,
    tooltip: 'Cancel this request',
  },
  [WORKFLOW_EVENTS.REOPEN]: {
    label: 'Reopen',
    icon: 'RotateCcw',
    variant: 'outline',
    requiresConfirmation: true,
    tooltip: 'Reopen this closed request',
  },
  [WORKFLOW_EVENTS.MARK_SETTLED]: {
    label: 'Mark Settled',
    icon: 'CheckCheck',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Mark the loan as fully settled',
  },
  [WORKFLOW_EVENTS.SUBMIT_BANK_DETAILS]: {
    label: 'Submit Bank Details',
    icon: 'Landmark',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.BANK_DETAILS_MODAL,
    tooltip: 'Submit your bank account details',
  },
  [WORKFLOW_EVENTS.UPDATE_BANK_DETAILS]: {
    label: 'Update Bank Details',
    icon: 'Landmark',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.BANK_DETAILS_MODAL,
    tooltip: 'Update your bank account details',
  },
  [WORKFLOW_EVENTS.RESUME_REVIEW]: {
    label: 'Resume Review',
    icon: 'Play',
    variant: 'default',
    requiresConfirmation: true,
    tooltip: 'Resume reviewing the request',
  },
  [WORKFLOW_EVENTS.PROVIDE_EXPLANATION]: {
    label: 'Provide Explanation',
    icon: 'MessageSquare',
    variant: 'default',
    modalComponent: MODAL_COMPONENTS.EXPLANATION_MODAL,
    tooltip: 'Provide explanation for asset mismatch',
  },
  [WORKFLOW_EVENTS.REFUSE_SIGNATURE]: {
    label: 'Refuse to Sign',
    icon: 'XCircle',
    variant: 'destructive',
    modalComponent: MODAL_COMPONENTS.REFUSE_SIGNATURE_MODAL,
    tooltip: 'Refuse to sign the agreement',
  },
};

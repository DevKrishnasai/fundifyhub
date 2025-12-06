import { REQUEST_STAGE, ISSUE_TYPE, REQUEST_PHASE, REQUEST_STATUS } from './enums';
import { SubStatusDisplayConfig } from './models';

export const REQUEST_STATUS_PHASE: Record<REQUEST_STATUS, REQUEST_PHASE> = {
  [REQUEST_STATUS.PENDING]: REQUEST_PHASE.SUBMISSION,
  [REQUEST_STATUS.UNDER_REVIEW]: REQUEST_PHASE.SUBMISSION,
  [REQUEST_STATUS.MORE_INFO_REQUIRED]: REQUEST_PHASE.SUBMISSION,
  [REQUEST_STATUS.OFFER_SENT]: REQUEST_PHASE.OFFER,
  [REQUEST_STATUS.OFFER_ACCEPTED]: REQUEST_PHASE.OFFER,
  [REQUEST_STATUS.OFFER_DECLINED]: REQUEST_PHASE.OFFER,
  [REQUEST_STATUS.OFFER_EXPIRED]: REQUEST_PHASE.OFFER,
  [REQUEST_STATUS.INSPECTION_SCHEDULED]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.INSPECTION_IN_PROGRESS]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.INSPECTION_COMPLETED]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.ASSET_MISMATCH]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.AGENT_NOT_AVAILABLE]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.APPROVED]: REQUEST_PHASE.APPROVAL,
  [REQUEST_STATUS.PENDING_SIGNATURE]: REQUEST_PHASE.APPROVAL,
  [REQUEST_STATUS.PENDING_BANK_DETAILS]: REQUEST_PHASE.DISBURSEMENT,
  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: REQUEST_PHASE.DISBURSEMENT,
  [REQUEST_STATUS.TRANSFER_FAILED]: REQUEST_PHASE.DISBURSEMENT,
  [REQUEST_STATUS.AMOUNT_DISBURSED]: REQUEST_PHASE.DISBURSEMENT,
  [REQUEST_STATUS.ACTIVE]: REQUEST_PHASE.REPAYMENT,
  [REQUEST_STATUS.PAYMENT_OVERDUE]: REQUEST_PHASE.REPAYMENT,
  [REQUEST_STATUS.DEFAULTED]: REQUEST_PHASE.REPAYMENT,
  [REQUEST_STATUS.COMPLETED]: REQUEST_PHASE.REPAYMENT,
  [REQUEST_STATUS.REJECTED]: REQUEST_PHASE.SUBMISSION,
  [REQUEST_STATUS.CANCELLED]: REQUEST_PHASE.SUBMISSION,
};

export type RequestStage = `${REQUEST_STAGE}`;

// ============================================
// SUB-STATUS VALUES (per stage)
// ============================================

export const SUB_STATUS = {
  // DRAFT stage sub-statuses (future use)
  DRAFT: {
    IN_PROGRESS: 'IN_PROGRESS',
    SUBMITTED: 'SUBMITTED',
  },
  
  // REVIEW stage sub-statuses
  REVIEW: {
    PENDING: 'PENDING',           // Waiting for admin to pick up
    ASSIGNED: 'ASSIGNED',         // Admin assigned, not started
    IN_REVIEW: 'IN_REVIEW',       // Admin actively reviewing
    INFO_REQUIRED: 'INFO_REQUIRED', // Need more info from customer
    INFO_RECEIVED: 'INFO_RECEIVED', // Customer submitted info, back to review
  },
  
  // OFFER stage sub-statuses
  OFFER: {
    PENDING: 'PENDING',     // Admin preparing offer
    SENT: 'SENT',           // Offer sent to customer
    ACCEPTED: 'ACCEPTED',   // Customer accepted
    DECLINED: 'DECLINED',   // Customer declined
    EXPIRED: 'EXPIRED',     // Offer expired
    REVISED: 'REVISED',     // Admin revised offer (intermediate)
  },
  
  // INSPECTION stage sub-statuses
  INSPECTION: {
    PENDING_ASSIGNMENT: 'PENDING_ASSIGNMENT', // No agent assigned yet
    SCHEDULED: 'SCHEDULED',                   // Agent assigned with date
    RESCHEDULE_REQUESTED: 'RESCHEDULE_REQUESTED', // Customer wants different date
    IN_PROGRESS: 'IN_PROGRESS',               // Agent conducting inspection
    COMPLETED: 'COMPLETED',                   // Inspection done, pending approval
    APPROVED: 'APPROVED',                     // Agent approved the asset
    CUSTOMER_UNAVAILABLE: 'CUSTOMER_UNAVAILABLE', // Customer wasn't there
    AGENT_UNAVAILABLE: 'AGENT_UNAVAILABLE',       // Agent couldn't make it
    ASSET_ISSUE: 'ASSET_ISSUE',                   // Asset doesn't match
  },
  
  // DOCUMENTATION stage sub-statuses
  DOCUMENTATION: {
    PENDING_SIGNATURE: 'PENDING_SIGNATURE',       // Waiting for customer signature
    SIGNED: 'SIGNED',                             // Agreement signed
    PENDING_BANK_DETAILS: 'PENDING_BANK_DETAILS', // Need bank details
    BANK_DETAILS_SUBMITTED: 'BANK_DETAILS_SUBMITTED', // Details submitted
    SIGNATURE_REFUSED: 'SIGNATURE_REFUSED',       // Customer refused to sign
  },
  
  // DISBURSEMENT stage sub-statuses
  DISBURSEMENT: {
    PENDING: 'PENDING',       // Ready for transfer
    PROCESSING: 'PROCESSING', // Transfer in progress
    COMPLETED: 'COMPLETED',   // Transfer successful
    FAILED: 'FAILED',         // Transfer failed
  },
  
  // ACTIVE stage sub-statuses
  ACTIVE: {
    CURRENT: 'CURRENT',     // Payments on track
    OVERDUE: 'OVERDUE',     // Has overdue EMIs
    DEFAULTED: 'DEFAULTED', // Multiple missed payments
  },
} as const;

// Type helpers
export type SubStatusForStage<S extends REQUEST_STAGE> = 
  S extends keyof typeof SUB_STATUS 
    ? typeof SUB_STATUS[S][keyof typeof SUB_STATUS[S]] 
    : null;

// ============================================
// STAGE DISPLAY CONFIGURATION
// ============================================

export const STAGE_LABELS: Record<REQUEST_STAGE, string> = {
  [REQUEST_STAGE.DRAFT]: 'Draft',
  [REQUEST_STAGE.REVIEW]: 'Under Review',
  [REQUEST_STAGE.OFFER]: 'Offer',
  [REQUEST_STAGE.INSPECTION]: 'Inspection',
  [REQUEST_STAGE.DOCUMENTATION]: 'Documentation',
  [REQUEST_STAGE.DISBURSEMENT]: 'Disbursement',
  [REQUEST_STAGE.ACTIVE]: 'Active Loan',
  [REQUEST_STAGE.COMPLETED]: 'Completed',
  [REQUEST_STAGE.REJECTED]: 'Rejected',
  [REQUEST_STAGE.CANCELLED]: 'Cancelled',
};

export const STAGE_DESCRIPTIONS: Record<REQUEST_STAGE, string> = {
  [REQUEST_STAGE.DRAFT]: 'Your request is being prepared',
  [REQUEST_STAGE.REVIEW]: 'Admin is reviewing your request',
  [REQUEST_STAGE.OFFER]: 'Negotiating loan terms',
  [REQUEST_STAGE.INSPECTION]: 'Asset verification in progress',
  [REQUEST_STAGE.DOCUMENTATION]: 'Complete required documentation',
  [REQUEST_STAGE.DISBURSEMENT]: 'Processing loan disbursement',
  [REQUEST_STAGE.ACTIVE]: 'Your loan is active',
  [REQUEST_STAGE.COMPLETED]: 'Loan fully repaid - Thank you!',
  [REQUEST_STAGE.REJECTED]: 'Request was declined',
  [REQUEST_STAGE.CANCELLED]: 'Request was cancelled',
};

export const STAGE_ICONS: Record<REQUEST_STAGE, string> = {
  [REQUEST_STAGE.DRAFT]: 'FileEdit',
  [REQUEST_STAGE.REVIEW]: 'Search',
  [REQUEST_STAGE.OFFER]: 'BadgeDollarSign',
  [REQUEST_STAGE.INSPECTION]: 'ClipboardCheck',
  [REQUEST_STAGE.DOCUMENTATION]: 'FileSignature',
  [REQUEST_STAGE.DISBURSEMENT]: 'Banknote',
  [REQUEST_STAGE.ACTIVE]: 'TrendingUp',
  [REQUEST_STAGE.COMPLETED]: 'PartyPopper',
  [REQUEST_STAGE.REJECTED]: 'XCircle',
  [REQUEST_STAGE.CANCELLED]: 'Ban',
};

export const STAGE_COLORS: Record<REQUEST_STAGE, { bg: string; text: string; border: string }> = {
  [REQUEST_STAGE.DRAFT]: { 
    bg: 'bg-gray-100 dark:bg-gray-800', 
    text: 'text-gray-700 dark:text-gray-400', 
    border: 'border-gray-300' 
  },
  [REQUEST_STAGE.REVIEW]: { 
    bg: 'bg-blue-100 dark:bg-blue-900/30', 
    text: 'text-blue-700 dark:text-blue-400', 
    border: 'border-blue-300' 
  },
  [REQUEST_STAGE.OFFER]: { 
    bg: 'bg-indigo-100 dark:bg-indigo-900/30', 
    text: 'text-indigo-700 dark:text-indigo-400', 
    border: 'border-indigo-300' 
  },
  [REQUEST_STAGE.INSPECTION]: { 
    bg: 'bg-purple-100 dark:bg-purple-900/30', 
    text: 'text-purple-700 dark:text-purple-400', 
    border: 'border-purple-300' 
  },
  [REQUEST_STAGE.DOCUMENTATION]: { 
    bg: 'bg-violet-100 dark:bg-violet-900/30', 
    text: 'text-violet-700 dark:text-violet-400', 
    border: 'border-violet-300' 
  },
  [REQUEST_STAGE.DISBURSEMENT]: { 
    bg: 'bg-cyan-100 dark:bg-cyan-900/30', 
    text: 'text-cyan-700 dark:text-cyan-400', 
    border: 'border-cyan-300' 
  },
  [REQUEST_STAGE.ACTIVE]: { 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-700 dark:text-green-400', 
    border: 'border-green-300' 
  },
  [REQUEST_STAGE.COMPLETED]: { 
    bg: 'bg-emerald-100 dark:bg-emerald-900/30', 
    text: 'text-emerald-700 dark:text-emerald-400', 
    border: 'border-emerald-300' 
  },
  [REQUEST_STAGE.REJECTED]: { 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-700 dark:text-red-400', 
    border: 'border-red-300' 
  },
  [REQUEST_STAGE.CANCELLED]: { 
    bg: 'bg-gray-100 dark:bg-gray-800', 
    text: 'text-gray-700 dark:text-gray-400', 
    border: 'border-gray-300' 
  },
};

export const SUB_STATUS_DISPLAY: Record<string, SubStatusDisplayConfig> = {
  // REVIEW sub-statuses
  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.PENDING}`]: {
    label: 'Pending Review',
    description: 'Waiting for an admin to review your request',
    icon: 'Clock',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.ASSIGNED}`]: {
    label: 'Assigned',
    description: 'Admin assigned, review will begin soon',
    icon: 'UserCheck',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.IN_REVIEW}`]: {
    label: 'Under Review',
    description: 'Admin is reviewing your request details',
    icon: 'FileSearch',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.INFO_REQUIRED}`]: {
    label: 'Info Required',
    description: 'Please provide additional information',
    icon: 'AlertCircle',
    requiresAction: 'customer',
  },
  [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.INFO_RECEIVED}`]: {
    label: 'Info Received',
    description: 'Your response is being reviewed',
    icon: 'CheckCircle',
    requiresAction: 'admin',
  },

  // OFFER sub-statuses
  [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.PENDING}`]: {
    label: 'Preparing Offer',
    description: 'Admin is preparing a loan offer',
    icon: 'FileEdit',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.SENT}`]: {
    label: 'Offer Sent',
    description: 'Review and respond to the loan offer',
    icon: 'Mail',
    requiresAction: 'customer',
  },
  [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.ACCEPTED}`]: {
    label: 'Offer Accepted',
    description: 'Great! Moving to inspection',
    icon: 'CheckCircle',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.DECLINED}`]: {
    label: 'Offer Declined',
    description: 'You declined the offer',
    icon: 'XCircle',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.EXPIRED}`]: {
    label: 'Offer Expired',
    description: 'The offer has expired',
    icon: 'Clock',
    requiresAction: 'admin',
  },

  // INSPECTION sub-statuses
  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.PENDING_ASSIGNMENT}`]: {
    label: 'Pending Assignment',
    description: 'Waiting for agent assignment',
    icon: 'UserPlus',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.SCHEDULED}`]: {
    label: 'Scheduled',
    description: 'Agent visit is scheduled',
    icon: 'Calendar',
    requiresAction: 'agent',
  },
  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.RESCHEDULE_REQUESTED}`]: {
    label: 'Reschedule Requested',
    description: 'You requested a new date',
    icon: 'CalendarClock',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.IN_PROGRESS}`]: {
    label: 'In Progress',
    description: 'Agent is inspecting the asset',
    icon: 'ClipboardList',
    requiresAction: 'agent',
  },
  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.COMPLETED}`]: {
    label: 'Inspection Done',
    description: 'Pending approval',
    icon: 'ClipboardCheck',
    requiresAction: 'agent',
  },
  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.APPROVED}`]: {
    label: 'Approved',
    description: 'Asset verified successfully',
    icon: 'ThumbsUp',
    requiresAction: 'system',
  },
  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.CUSTOMER_UNAVAILABLE}`]: {
    label: 'Customer Unavailable',
    description: 'You were not available for inspection',
    icon: 'UserX',
    isBlocking: true,
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.AGENT_UNAVAILABLE}`]: {
    label: 'Agent Unavailable',
    description: 'Agent could not make it',
    icon: 'UserMinus',
    isBlocking: true,
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.ASSET_ISSUE}`]: {
    label: 'Asset Issue',
    description: 'There is an issue with the asset',
    icon: 'AlertTriangle',
    isBlocking: true,
    requiresAction: 'admin',
  },

  // DOCUMENTATION sub-statuses
  [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_SIGNATURE}`]: {
    label: 'Pending Signature',
    description: 'Please sign the loan agreement',
    icon: 'FileSignature',
    requiresAction: 'customer',
  },
  [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.SIGNED}`]: {
    label: 'Agreement Signed',
    description: 'Moving to bank details',
    icon: 'FileCheck',
    requiresAction: 'system',
  },
  [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS}`]: {
    label: 'Bank Details Required',
    description: 'Provide bank account for disbursement',
    icon: 'Building2',
    requiresAction: 'customer',
  },
  [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.BANK_DETAILS_SUBMITTED}`]: {
    label: 'Details Submitted',
    description: 'Ready for disbursement',
    icon: 'CheckCircle',
    requiresAction: 'admin',
  },

  // DISBURSEMENT sub-statuses
  [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.PENDING}`]: {
    label: 'Pending Transfer',
    description: 'Ready for disbursement',
    icon: 'Clock',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.PROCESSING}`]: {
    label: 'Processing',
    description: 'Transfer is being processed',
    icon: 'Loader2',
    requiresAction: 'system',
  },
  [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.COMPLETED}`]: {
    label: 'Disbursed',
    description: 'Amount transferred successfully',
    icon: 'CheckCircle',
    requiresAction: 'admin',
  },
  [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.FAILED}`]: {
    label: 'Transfer Failed',
    description: 'Please update bank details',
    icon: 'XCircle',
    isBlocking: true,
    requiresAction: 'customer',
  },

  // ACTIVE sub-statuses
  [`${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.CURRENT}`]: {
    label: 'Active',
    description: 'Payments on track',
    icon: 'TrendingUp',
    requiresAction: 'customer',
  },
  [`${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.OVERDUE}`]: {
    label: 'Payment Overdue',
    description: 'You have overdue EMI payments',
    icon: 'AlertTriangle',
    isBlocking: true,
    requiresAction: 'customer',
  },
  [`${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.DEFAULTED}`]: {
    label: 'Defaulted',
    description: 'Multiple payments missed',
    icon: 'Ban',
    isBlocking: true,
    requiresAction: 'admin',
  },
};

// ============================================
// STAGE GROUPINGS
// ============================================

/** Stages where customer can still update their request */
export const ALLOWED_UPDATE_STAGES: REQUEST_STAGE[] = [
  REQUEST_STAGE.DRAFT,
  REQUEST_STAGE.REVIEW,      // Only in PENDING/INFO_REQUIRED sub-statuses
  REQUEST_STAGE.REJECTED,    // Can resubmit
  REQUEST_STAGE.CANCELLED,   // Can create new
];

/** Stages where the request is still pending/in progress (not yet active or terminal) */
export const PENDING_STAGES: REQUEST_STAGE[] = [
  REQUEST_STAGE.DRAFT,
  REQUEST_STAGE.REVIEW,
  REQUEST_STAGE.OFFER,
  REQUEST_STAGE.INSPECTION,
  REQUEST_STAGE.DOCUMENTATION,
  REQUEST_STAGE.DISBURSEMENT,
];

/** Stages that are "active" meaning loan is running */
export const ACTIVE_STAGES: REQUEST_STAGE[] = [
  REQUEST_STAGE.ACTIVE,
];

/** Stages that are terminal/final */
export const TERMINAL_STAGES: REQUEST_STAGE[] = [
  REQUEST_STAGE.COMPLETED,
  REQUEST_STAGE.REJECTED,
  REQUEST_STAGE.CANCELLED,
];

/** Stages where agent has work to do */
export const AGENT_WORK_STAGES: REQUEST_STAGE[] = [
  REQUEST_STAGE.INSPECTION,
];

/** Stages where agents should no longer have access */
export const AGENT_DENIED_STAGES: REQUEST_STAGE[] = [
  REQUEST_STAGE.DOCUMENTATION,  // After inspection, agent is done
  REQUEST_STAGE.DISBURSEMENT,
  REQUEST_STAGE.ACTIVE,
  REQUEST_STAGE.COMPLETED,
];

// ============================================
// STAGE PROGRESS (for progress bar)
// ============================================

// Stages that show in the progress bar (excludes terminal states)
export const PROGRESS_STAGES = [
  REQUEST_STAGE.REVIEW,
  REQUEST_STAGE.OFFER,
  REQUEST_STAGE.INSPECTION,
  REQUEST_STAGE.DOCUMENTATION,
  REQUEST_STAGE.DISBURSEMENT,
  REQUEST_STAGE.ACTIVE,
] as const;

export const ISSUE_TYPE_LABELS: Record<ISSUE_TYPE, string> = {
  [ISSUE_TYPE.CUSTOMER_UNAVAILABLE]: 'Customer was not available',
  [ISSUE_TYPE.AGENT_UNAVAILABLE]: 'Agent could not make it',
  [ISSUE_TYPE.ASSET_MISMATCH]: 'Asset does not match description',
  [ISSUE_TYPE.ASSET_DAMAGED]: 'Asset is damaged',
  [ISSUE_TYPE.ASSET_NOT_PRESENT]: 'Asset was not present',
  [ISSUE_TYPE.DOCUMENTS_MISSING]: 'Required documents missing',
  [ISSUE_TYPE.OTHER]: 'Other issue',
};

// ============================================
// WORKFLOW EVENTS (Actions users can take)
// ============================================

export const WORKFLOW_EVENTS = {
  // ========== REVIEW STAGE ==========
  /** Admin assigns request to themselves */
  ASSIGN_TO_ME: 'ASSIGN_TO_ME',
  /** Super admin assigns to specific admin */
  ASSIGN_ADMIN: 'ASSIGN_ADMIN',
  /** Admin self-assigns (alias) */
  SELF_ASSIGN_ADMIN: 'ASSIGN_TO_ME',
  /** Admin starts reviewing */
  START_REVIEW: 'START_REVIEW',
  /** Admin requests more information */
  REQUEST_INFO: 'REQUEST_INFO',
  /** Admin requests more information (alias) */
  REQUEST_MORE_INFO: 'REQUEST_INFO',
  /** Customer submits requested info */
  SUBMIT_INFO: 'SUBMIT_INFO',
  /** Resume review after info received */
  RESUME_REVIEW: 'START_REVIEW',
  
  // ========== OFFER STAGE ==========
  /** Admin creates/sends offer */
  MAKE_OFFER: 'MAKE_OFFER',
  /** Admin makes new offer (alias) */
  MAKE_NEW_OFFER: 'MAKE_OFFER',
  /** Admin revises existing offer */
  REVISE_OFFER: 'REVISE_OFFER',
  /** Resend offer */
  RESEND_OFFER: 'MAKE_OFFER',
  /** Customer accepts offer */
  ACCEPT_OFFER: 'ACCEPT_OFFER',
  /** Customer declines offer */
  DECLINE_OFFER: 'DECLINE_OFFER',
  /** Cancel offer */
  CANCEL_OFFER: 'CANCEL',
  
  // ========== INSPECTION STAGE ==========
  /** Admin assigns agent for inspection */
  ASSIGN_AGENT: 'ASSIGN_AGENT',
  /** Admin reassigns to different agent */
  REASSIGN_AGENT: 'REASSIGN_AGENT',
  /** Agent starts inspection */
  START_INSPECTION: 'START_INSPECTION',
  /** Agent completes inspection */
  COMPLETE_INSPECTION: 'COMPLETE_INSPECTION',
  /** Customer requests reschedule */
  REQUEST_RESCHEDULE: 'REQUEST_RESCHEDULE',
  /** Admin approves reschedule */
  APPROVE_RESCHEDULE: 'APPROVE_RESCHEDULE',
  /** Admin reschedules inspection (alias for APPROVE_RESCHEDULE) */
  RESCHEDULE_INSPECTION: 'APPROVE_RESCHEDULE',
  /** Agent/Admin reports issue */
  REPORT_ISSUE: 'REPORT_ISSUE',
  /** Agent approves asset */
  APPROVE: 'APPROVE',
  /** Agent approves inspection (alias) */
  APPROVE_INSPECTION: 'APPROVE',
  /** Customer not available */
  CUSTOMER_NOT_AVAILABLE: 'CUSTOMER_NOT_AVAILABLE',
  /** Asset mismatch */
  ASSET_MISMATCH: 'ASSET_MISMATCH',
  /** Agent cancels */
  CANCEL_AGENT: 'CANCEL_AGENT',
  
  // ========== DOCUMENTATION STAGE ==========
  /** Customer signs agreement */
  SIGN_AGREEMENT: 'SIGN_AGREEMENT',
  /** Generate agreement */
  GENERATE_AGREEMENT: 'GENERATE_AGREEMENT',
  /** Customer refuses to sign */
  REFUSE_SIGNATURE: 'REFUSE_SIGNATURE',
  /** Customer submits bank details */
  SUBMIT_BANK_DETAILS: 'SUBMIT_BANK_DETAILS',
  /** Customer updates bank details */
  UPDATE_BANK_DETAILS: 'SUBMIT_BANK_DETAILS',
  /** Admin requests new bank details */
  REQUEST_NEW_BANK_DETAILS: 'REQUEST_NEW_BANK_DETAILS',
  /** Request different bank details (alias) */
  REQUEST_DIFFERENT_BANK_DETAILS: 'REQUEST_NEW_BANK_DETAILS',
  
  // ========== DISBURSEMENT STAGE ==========
  /** Admin initiates disbursement */
  DISBURSE: 'DISBURSE',
  /** System/Admin marks transfer failed */
  MARK_TRANSFER_FAILED: 'MARK_TRANSFER_FAILED',
  /** Transfer failed (alias) */
  TRANSFER_FAILED: 'MARK_TRANSFER_FAILED',
  /** Customer updates bank details for retry */
  RETRY_TRANSFER: 'RETRY_TRANSFER',
  /** Admin activates the loan */
  ACTIVATE_LOAN: 'ACTIVATE_LOAN',
  /** Create loan record */
  CREATE_LOAN: 'ACTIVATE_LOAN',
  
  // ========== ACTIVE STAGE (mostly system) ==========
  /** System marks EMI as overdue */
  MARK_OVERDUE: 'MARK_OVERDUE',
  /** System marks loan as defaulted */
  MARK_DEFAULTED: 'MARK_DEFAULTED',
  /** System/Payment marks loan complete */
  COMPLETE_LOAN: 'COMPLETE_LOAN',
  /** Mark completed (alias) */
  MARK_COMPLETED: 'COMPLETE_LOAN',
  /** Mark paid (alias) */
  MARK_PAID: 'COMPLETE_LOAN',
  /** Admin settles defaulted loan */
  SETTLE_LOAN: 'SETTLE_LOAN',
  /** Mark settled (alias) */
  MARK_SETTLED: 'SETTLE_LOAN',
  
  // ========== TERMINAL ACTIONS ==========
  /** Admin rejects request */
  REJECT: 'REJECT',
  /** Admin cancels request */
  CANCEL: 'CANCEL',
  /** Close request (alias) */
  CLOSE_REQUEST: 'CANCEL',
  /** Customer withdraws request */
  WITHDRAW: 'WITHDRAW',
  /** Admin reopens closed request */
  REOPEN: 'REOPEN',
  
  // ========== COMMON ACTIONS ==========
  /** Add a comment */
  ADD_COMMENT: 'ADD_COMMENT',
  /** Toggle comments enabled */
  TOGGLE_COMMENTS: 'TOGGLE_COMMENTS',
  /** Provide explanation */
  PROVIDE_EXPLANATION: 'PROVIDE_EXPLANATION',
  /** Request resume */
  REQUEST_RESUME: 'REQUEST_RESUME',
} as const;

export type WorkflowEvent = typeof WORKFLOW_EVENTS[keyof typeof WORKFLOW_EVENTS];
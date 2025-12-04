/**
 * @fileoverview Request Stage Constants
 * 
 * This file defines the simplified stage-based request lifecycle.
 * 10 main stages replace the previous 28 statuses for better maintainability.
 * 
 * Each stage has:
 * - Sub-statuses: Granular state within the stage
 * - Display config: Labels, colors, icons for UI
 * - Transition rules: What actions can be taken
 */

// ============================================
// REQUEST STAGES (10 values - matches Prisma enum)
// ============================================

export enum REQUEST_STAGE {
  DRAFT = 'DRAFT',           // Customer creating request (future multi-step)
  REVIEW = 'REVIEW',         // Admin reviewing request
  OFFER = 'OFFER',           // Offer negotiation phase
  INSPECTION = 'INSPECTION', // Asset verification by agent
  DOCUMENTATION = 'DOCUMENTATION', // Signatures & bank details
  DISBURSEMENT = 'DISBURSEMENT',   // Money transfer to customer
  ACTIVE = 'ACTIVE',         // Loan running, EMI payments
  COMPLETED = 'COMPLETED',   // Loan fully repaid ✓
  REJECTED = 'REJECTED',     // Request declined ✗
  CANCELLED = 'CANCELLED',   // Request cancelled ✗
}

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
// FAILURE TYPES
// ============================================

export enum FAILURE_TYPE {
  TRANSFER = 'TRANSFER',           // Bank transfer failed
  INSPECTION = 'INSPECTION',       // Inspection issue
  VERIFICATION = 'VERIFICATION',   // Document/identity verification failed
  DOCUMENTATION = 'DOCUMENTATION', // Missing/invalid documents
}

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

// ============================================
// SUB-STATUS DISPLAY CONFIGURATION
// ============================================

interface SubStatusDisplayConfig {
  label: string;
  description: string;
  icon: string;
  isBlocking?: boolean; // Indicates an issue that blocks progress
  requiresAction?: 'customer' | 'admin' | 'agent' | 'system';
}

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

/**
 * Get the progress percentage for a given stage
 */
export function getStageProgress(stage: REQUEST_STAGE): number {
  const index = PROGRESS_STAGES.indexOf(stage as typeof PROGRESS_STAGES[number]);
  if (index === -1) {
    // Terminal states
    if (stage === REQUEST_STAGE.COMPLETED) return 100;
    if (stage === REQUEST_STAGE.REJECTED || stage === REQUEST_STAGE.CANCELLED) return 0;
    return 0;
  }
  return Math.round(((index + 1) / PROGRESS_STAGES.length) * 100);
}

/**
 * Get the step number for a given stage (1-based)
 */
export function getStageNumber(stage: REQUEST_STAGE): number {
  const index = PROGRESS_STAGES.indexOf(stage as typeof PROGRESS_STAGES[number]);
  return index === -1 ? 0 : index + 1;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get display config for a stage + subStatus combination
 */
export function getStatusDisplay(stage: REQUEST_STAGE, subStatus: string | null): SubStatusDisplayConfig {
  const key = subStatus ? `${stage}:${subStatus}` : null;
  
  if (key && SUB_STATUS_DISPLAY[key]) {
    return SUB_STATUS_DISPLAY[key];
  }
  
  // Fallback to stage-level display
  return {
    label: STAGE_LABELS[stage],
    description: STAGE_DESCRIPTIONS[stage],
    icon: STAGE_ICONS[stage],
    requiresAction: undefined,
  };
}

/**
 * Check if a stage is a terminal state
 */
export function isTerminalStage(stage: REQUEST_STAGE): boolean {
  return TERMINAL_STAGES.includes(stage as typeof TERMINAL_STAGES[number]);
}

/**
 * Check if request is in active loan phase
 */
export function isActiveLoan(stage: REQUEST_STAGE): boolean {
  return stage === REQUEST_STAGE.ACTIVE;
}

/**
 * Check if request can proceed to next stage
 */
export function canProceed(stage: REQUEST_STAGE, subStatus: string | null): boolean {
  const key = subStatus ? `${stage}:${subStatus}` : null;
  const display = key ? SUB_STATUS_DISPLAY[key] : null;
  return display ? !display.isBlocking : true;
}

// ============================================
// ACTION FLAGS HELPERS
// ============================================

export interface ActionFlags {
  requiresCustomerAction: boolean;
  requiresAdminAction: boolean;
  requiresAgentAction: boolean;
  isBlocked: boolean;
}

/**
 * Calculate action flags based on stage and subStatus
 */
export function calculateActionFlags(stage: REQUEST_STAGE, subStatus: string | null): ActionFlags {
  const key = subStatus ? `${stage}:${subStatus}` : null;
  const display = key ? SUB_STATUS_DISPLAY[key] : null;
  
  const flags: ActionFlags = {
    requiresCustomerAction: false,
    requiresAdminAction: false,
    requiresAgentAction: false,
    isBlocked: display?.isBlocking ?? false,
  };
  
  if (display?.requiresAction) {
    switch (display.requiresAction) {
      case 'customer':
        flags.requiresCustomerAction = true;
        break;
      case 'admin':
        flags.requiresAdminAction = true;
        break;
      case 'agent':
        flags.requiresAgentAction = true;
        break;
    }
  }
  
  return flags;
}

// ============================================
// CUSTOMER-FACING STATUS TEXT
// ============================================

/**
 * Get a simple, customer-friendly status message
 */
export function getCustomerStatusText(stage: REQUEST_STAGE, subStatus: string | null): string {
  const display = getStatusDisplay(stage, subStatus);
  return display.description;
}

/**
 * Get what action the customer needs to take (if any)
 */
export function getCustomerActionRequired(stage: REQUEST_STAGE, subStatus: string | null): string | null {
  const key = subStatus ? `${stage}:${subStatus}` : null;
  const display = key ? SUB_STATUS_DISPLAY[key] : null;
  
  if (display?.requiresAction !== 'customer') {
    return null;
  }
  
  // Return action-specific messages
  switch (`${stage}:${subStatus}`) {
    case `${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.INFO_REQUIRED}`:
      return 'Submit the requested information';
    case `${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.SENT}`:
      return 'Review and respond to the offer';
    case `${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_SIGNATURE}`:
      return 'Sign the loan agreement';
    case `${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS}`:
      return 'Provide your bank details';
    case `${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.FAILED}`:
      return 'Update your bank details';
    case `${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.CURRENT}`:
      return 'Pay your upcoming EMI';
    case `${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.OVERDUE}`:
      return 'Pay overdue EMI immediately';
    default:
      return null;
  }
}

// ============================================
// LEGACY STATUS MAPPING (for frontend compatibility)
// ============================================

/**
 * Maps stage + subStatus to a legacy-compatible status string.
 * Used to bridge the gap while frontend is migrated to stage-based system.
 * 
 * @deprecated Use stage + subStatus directly in new code
 */
export function stageToLegacyStatus(stage: REQUEST_STAGE, subStatus: string | null): string {
  const key = subStatus ? `${stage}:${subStatus}` : stage;
  
  const mapping: Record<string, string> = {
    // REVIEW stage
    [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.PENDING}`]: 'PENDING',
    [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.ASSIGNED}`]: 'PENDING',
    [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.IN_REVIEW}`]: 'UNDER_REVIEW',
    [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.INFO_REQUIRED}`]: 'MORE_INFO_REQUIRED',
    [`${REQUEST_STAGE.REVIEW}:${SUB_STATUS.REVIEW.INFO_RECEIVED}`]: 'UNDER_REVIEW',
    
    // OFFER stage
    [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.PENDING}`]: 'UNDER_REVIEW',
    [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.SENT}`]: 'OFFER_SENT',
    [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.ACCEPTED}`]: 'OFFER_ACCEPTED',
    [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.DECLINED}`]: 'OFFER_DECLINED',
    [`${REQUEST_STAGE.OFFER}:${SUB_STATUS.OFFER.EXPIRED}`]: 'OFFER_EXPIRED',
    
    // INSPECTION stage
    [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.PENDING_ASSIGNMENT}`]: 'OFFER_ACCEPTED',
    [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.SCHEDULED}`]: 'INSPECTION_SCHEDULED',
    [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.RESCHEDULE_REQUESTED}`]: 'INSPECTION_RESCHEDULE_REQUESTED',
    [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.IN_PROGRESS}`]: 'INSPECTION_IN_PROGRESS',
    [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.COMPLETED}`]: 'INSPECTION_COMPLETED',
    [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.APPROVED}`]: 'APPROVED',
    [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.CUSTOMER_UNAVAILABLE}`]: 'CUSTOMER_NOT_AVAILABLE',
    [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.AGENT_UNAVAILABLE}`]: 'AGENT_NOT_AVAILABLE',
    [`${REQUEST_STAGE.INSPECTION}:${SUB_STATUS.INSPECTION.ASSET_ISSUE}`]: 'ASSET_MISMATCH',
    
    // DOCUMENTATION stage
    [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_SIGNATURE}`]: 'PENDING_SIGNATURE',
    [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.SIGNED}`]: 'PENDING_BANK_DETAILS',
    [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS}`]: 'PENDING_BANK_DETAILS',
    [`${REQUEST_STAGE.DOCUMENTATION}:${SUB_STATUS.DOCUMENTATION.BANK_DETAILS_SUBMITTED}`]: 'BANK_DETAILS_SUBMITTED',
    
    // DISBURSEMENT stage
    [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.PENDING}`]: 'BANK_DETAILS_SUBMITTED',
    [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.PROCESSING}`]: 'BANK_DETAILS_SUBMITTED',
    [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.COMPLETED}`]: 'AMOUNT_DISBURSED',
    [`${REQUEST_STAGE.DISBURSEMENT}:${SUB_STATUS.DISBURSEMENT.FAILED}`]: 'TRANSFER_FAILED',
    
    // ACTIVE stage
    [`${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.CURRENT}`]: 'ACTIVE',
    [`${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.OVERDUE}`]: 'PAYMENT_OVERDUE',
    [`${REQUEST_STAGE.ACTIVE}:${SUB_STATUS.ACTIVE.DEFAULTED}`]: 'DEFAULTED',
    
    // Terminal stages (no subStatus)
    [REQUEST_STAGE.COMPLETED]: 'COMPLETED',
    [REQUEST_STAGE.REJECTED]: 'REJECTED',
    [REQUEST_STAGE.CANCELLED]: 'CANCELLED',
  };
  
  return mapping[key] || mapping[stage] || stage;
}

/**
 * Maps a legacy status string to stage + subStatus.
 * Used for incoming requests from old clients.
 * 
 * @deprecated Use stage + subStatus directly in new code
 */
export function legacyStatusToStage(legacyStatus: string): { stage: REQUEST_STAGE; subStatus: string | null } {
  const mapping: Record<string, { stage: REQUEST_STAGE; subStatus: string | null }> = {
    'PENDING': { stage: REQUEST_STAGE.REVIEW, subStatus: SUB_STATUS.REVIEW.PENDING },
    'UNDER_REVIEW': { stage: REQUEST_STAGE.REVIEW, subStatus: SUB_STATUS.REVIEW.IN_REVIEW },
    'MORE_INFO_REQUIRED': { stage: REQUEST_STAGE.REVIEW, subStatus: SUB_STATUS.REVIEW.INFO_REQUIRED },
    'OFFER_SENT': { stage: REQUEST_STAGE.OFFER, subStatus: SUB_STATUS.OFFER.SENT },
    'OFFER_ACCEPTED': { stage: REQUEST_STAGE.OFFER, subStatus: SUB_STATUS.OFFER.ACCEPTED },
    'OFFER_DECLINED': { stage: REQUEST_STAGE.OFFER, subStatus: SUB_STATUS.OFFER.DECLINED },
    'OFFER_EXPIRED': { stage: REQUEST_STAGE.OFFER, subStatus: SUB_STATUS.OFFER.EXPIRED },
    'INSPECTION_SCHEDULED': { stage: REQUEST_STAGE.INSPECTION, subStatus: SUB_STATUS.INSPECTION.SCHEDULED },
    'INSPECTION_RESCHEDULE_REQUESTED': { stage: REQUEST_STAGE.INSPECTION, subStatus: SUB_STATUS.INSPECTION.RESCHEDULE_REQUESTED },
    'INSPECTION_IN_PROGRESS': { stage: REQUEST_STAGE.INSPECTION, subStatus: SUB_STATUS.INSPECTION.IN_PROGRESS },
    'INSPECTION_COMPLETED': { stage: REQUEST_STAGE.INSPECTION, subStatus: SUB_STATUS.INSPECTION.COMPLETED },
    'APPROVED': { stage: REQUEST_STAGE.INSPECTION, subStatus: SUB_STATUS.INSPECTION.APPROVED },
    'CUSTOMER_NOT_AVAILABLE': { stage: REQUEST_STAGE.INSPECTION, subStatus: SUB_STATUS.INSPECTION.CUSTOMER_UNAVAILABLE },
    'AGENT_NOT_AVAILABLE': { stage: REQUEST_STAGE.INSPECTION, subStatus: SUB_STATUS.INSPECTION.AGENT_UNAVAILABLE },
    'ASSET_MISMATCH': { stage: REQUEST_STAGE.INSPECTION, subStatus: SUB_STATUS.INSPECTION.ASSET_ISSUE },
    'PENDING_SIGNATURE': { stage: REQUEST_STAGE.DOCUMENTATION, subStatus: SUB_STATUS.DOCUMENTATION.PENDING_SIGNATURE },
    'PENDING_BANK_DETAILS': { stage: REQUEST_STAGE.DOCUMENTATION, subStatus: SUB_STATUS.DOCUMENTATION.PENDING_BANK_DETAILS },
    'BANK_DETAILS_SUBMITTED': { stage: REQUEST_STAGE.DOCUMENTATION, subStatus: SUB_STATUS.DOCUMENTATION.BANK_DETAILS_SUBMITTED },
    'AMOUNT_DISBURSED': { stage: REQUEST_STAGE.DISBURSEMENT, subStatus: SUB_STATUS.DISBURSEMENT.COMPLETED },
    'TRANSFER_FAILED': { stage: REQUEST_STAGE.DISBURSEMENT, subStatus: SUB_STATUS.DISBURSEMENT.FAILED },
    'ACTIVE': { stage: REQUEST_STAGE.ACTIVE, subStatus: SUB_STATUS.ACTIVE.CURRENT },
    'PAYMENT_OVERDUE': { stage: REQUEST_STAGE.ACTIVE, subStatus: SUB_STATUS.ACTIVE.OVERDUE },
    'DEFAULTED': { stage: REQUEST_STAGE.ACTIVE, subStatus: SUB_STATUS.ACTIVE.DEFAULTED },
    'COMPLETED': { stage: REQUEST_STAGE.COMPLETED, subStatus: null },
    'REJECTED': { stage: REQUEST_STAGE.REJECTED, subStatus: null },
    'CANCELLED': { stage: REQUEST_STAGE.CANCELLED, subStatus: null },
  };
  
  return mapping[legacyStatus] || { stage: REQUEST_STAGE.REVIEW, subStatus: SUB_STATUS.REVIEW.PENDING };
}

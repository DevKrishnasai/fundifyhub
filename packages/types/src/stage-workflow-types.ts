/**
 * @fileoverview Workflow Types for Stage-Based System
 * 
 * Defines all workflow events (actions) and transition configurations
 * for the simplified stage-based request lifecycle.
 */

import { REQUEST_STAGE, SUB_STATUS, type ActionFlags } from './stage-constants';

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

// ============================================
// WORKFLOW CONTEXT (data needed for transitions)
// ============================================

export interface WorkflowContext {
  user: {
    id: string;
    roles: string[];          // Array of roles
    districts?: string[];     // Districts the user manages
    districtIds?: string[];   // Alias for districts
  };
  request: {
    id: string;
    stage?: REQUEST_STAGE;     // New stage field
    subStatus?: string | null;
    currentStatus?: string;    // Legacy field for compatibility
    customerId: string;
    districtId?: string;
    assignedAgentId?: string | null;
    assignedAdminId?: string | null;
    activeOfferId?: string | null;
    amount?: number;           // For offer validation
    loan?: {
      id: string;
      status: string;
    } | null;
    [key: string]: unknown;    // Allow spreading request
  };
}

// ============================================
// TRANSITION RESULT
// ============================================

export interface StageTransition {
  stage: REQUEST_STAGE;
  subStatus: string | null;
  actionFlags: ActionFlags;
}

export interface TransitionConfig {
  /** Target stage after transition */
  targetStage: REQUEST_STAGE;
  /** Target sub-status after transition */
  targetSubStatus: string | null;
  /** Guard functions to check if transition is allowed */
  guards?: Array<(context: WorkflowContext) => boolean>;
  /** Input fields required for this action */
  requiredInput?: string[];
  /** Whether this is a system-only action */
  systemOnly?: boolean;
}

// ============================================
// ACTION UI CONFIG
// ============================================

export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';

export interface WorkflowActionConfig {
  /** Button label */
  label: string;
  /** Description for confirmation dialogs */
  description?: string;
  /** Lucide icon name */
  icon?: string;
  /** Button variant */
  variant?: ButtonVariant;
  /** Tooltip text */
  tooltip?: string;
  /** Show confirmation dialog */
  requiresConfirmation?: boolean;
  /** Modal component to render */
  modalComponent?: string;
  /** Action priority (lower = primary) */
  priority?: number;
}

// ============================================
// MODAL COMPONENTS - Re-export from ui.constants
// ============================================

// Import and re-export to maintain compatibility
// Source of truth is in ui/ui.constants.ts
export { MODAL_COMPONENTS } from './ui/ui.constants';

// ============================================
// ISSUE TYPES (for REPORT_ISSUE action)
// ============================================

export enum ISSUE_TYPE {
  CUSTOMER_UNAVAILABLE = 'CUSTOMER_UNAVAILABLE',
  AGENT_UNAVAILABLE = 'AGENT_UNAVAILABLE',
  ASSET_MISMATCH = 'ASSET_MISMATCH',
  ASSET_DAMAGED = 'ASSET_DAMAGED',
  ASSET_NOT_PRESENT = 'ASSET_NOT_PRESENT',
  DOCUMENTS_MISSING = 'DOCUMENTS_MISSING',
  OTHER = 'OTHER',
}

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
// TRANSITION PAYLOADS
// ============================================

export interface MakeOfferPayload {
  amount: number;
  tenureMonths: number;
  interestRate: number;
  processingFee?: number;
  penaltyPercentage?: number;
  lateFeePercentage?: number;
}

export interface AssignAgentPayload {
  agentId: string;
  inspectionDate: string; // ISO date string
  notes?: string;
}

export interface AssignAdminPayload {
  adminId: string;
}

export interface RejectPayload {
  reason: string;
}

export interface CancelPayload {
  reason: string;
}

export interface RequestInfoPayload {
  notes: string;
}

export interface DeclineOfferPayload {
  reason: string;
}

export interface ReportIssuePayload {
  issueType: ISSUE_TYPE;
  description: string;
}

export interface BankDetailsPayload {
  accountNumber: string;
  ifscCode: string;
  accountName: string;
  bankName?: string;
  upiId?: string;
}

export interface DisbursePayload {
  transferMethod: string;
  transactionId: string;
  notes?: string;
}

export interface CompleteInspectionPayload {
  photos?: string[];
  notes?: string;
  assetCondition?: string;
  estimatedValue?: number;
}

export interface RefuseSignaturePayload {
  reason: string;
}

// Union type for all payloads
export type WorkflowPayload = 
  | MakeOfferPayload
  | AssignAgentPayload
  | AssignAdminPayload
  | RejectPayload
  | CancelPayload
  | RequestInfoPayload
  | DeclineOfferPayload
  | ReportIssuePayload
  | BankDetailsPayload
  | DisbursePayload
  | CompleteInspectionPayload
  | RefuseSignaturePayload
  | Record<string, unknown>;

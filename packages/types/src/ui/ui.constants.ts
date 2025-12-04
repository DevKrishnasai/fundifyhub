/**
 * UI-specific constants for frontend display
 * @module ui/ui.constants
 */

import { REQUEST_STATUS } from '../request/request.constants';
import { REQUEST_HISTORY_ACTION, REQUEST_HISTORY_CATEGORY } from '../request/request.constants';
import { DOCUMENT_TYPE, DOCUMENT_CATEGORY, DOCUMENT_UPLOADER_ROLE } from '../document/document.constants';

// ============================================
// CLIENT CONSTANTS
// ============================================

export const CLIENT_CONSTANTS = {
  /** Max length for comments in frontend */
  COMMENT_MAX_LENGTH: 300,
  /** Max length for admin requested info notes */
  MORE_INFO_NOTE_MAX: 500,
  /** Signed URL defaults (in seconds) */
  SIGNED_URL_EXPIRES: 3600, // 1 hour
  SIGNED_URL_EXPIRES_SHORT: 900, // 15 minutes
  /** When remaining expiry is less than this (seconds), client should refresh */
  SIGNED_URL_REFRESH_THRESHOLD_SECONDS: 300, // 5 minutes
  /** Polling interval for background refresh (ms) */
  SIGNED_URL_REFRESH_INTERVAL_MS: 60000, // 60s
} as const;

// ============================================
// POLLING INTERVALS
// ============================================

export const POLL_INTERVAL_MS = 8000; // 8 seconds
export const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// ============================================
// STATUS COLORS
// ============================================

export const REQUEST_STATUS_COLORS: Record<REQUEST_STATUS, { bg: string; text: string; border: string }> = {
  [REQUEST_STATUS.PENDING]: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300' },
  [REQUEST_STATUS.UNDER_REVIEW]: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300' },
  [REQUEST_STATUS.MORE_INFO_REQUIRED]: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300' },
  [REQUEST_STATUS.OFFER_SENT]: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-300' },
  [REQUEST_STATUS.OFFER_ACCEPTED]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300' },
  [REQUEST_STATUS.OFFER_DECLINED]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300' },
  [REQUEST_STATUS.OFFER_EXPIRED]: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-300' },
  [REQUEST_STATUS.INSPECTION_SCHEDULED]: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300' },
  [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300' },
  [REQUEST_STATUS.INSPECTION_IN_PROGRESS]: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-300' },
  [REQUEST_STATUS.INSPECTION_COMPLETED]: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-300' },
  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300' },
  [REQUEST_STATUS.ASSET_MISMATCH]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300' },
  [REQUEST_STATUS.AGENT_NOT_AVAILABLE]: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300' },
  [REQUEST_STATUS.APPROVED]: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300' },
  [REQUEST_STATUS.PENDING_SIGNATURE]: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-300' },
  [REQUEST_STATUS.PENDING_BANK_DETAILS]: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-300' },
  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300' },
  [REQUEST_STATUS.TRANSFER_FAILED]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300' },
  [REQUEST_STATUS.AMOUNT_DISBURSED]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300' },
  [REQUEST_STATUS.ACTIVE]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300' },
  [REQUEST_STATUS.PAYMENT_OVERDUE]: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300' },
  [REQUEST_STATUS.DEFAULTED]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300' },
  [REQUEST_STATUS.COMPLETED]: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300' },
  [REQUEST_STATUS.REJECTED]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300' },
  [REQUEST_STATUS.CANCELLED]: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-300' },
};

// ============================================
// STATUS LABELS
// ============================================

export const REQUEST_STATUS_LABELS: Record<REQUEST_STATUS, string> = {
  [REQUEST_STATUS.PENDING]: 'Pending Review',
  [REQUEST_STATUS.UNDER_REVIEW]: 'Under Review',
  [REQUEST_STATUS.MORE_INFO_REQUIRED]: 'More Info Required',
  [REQUEST_STATUS.OFFER_SENT]: 'Offer Sent',
  [REQUEST_STATUS.OFFER_ACCEPTED]: 'Offer Accepted',
  [REQUEST_STATUS.OFFER_DECLINED]: 'Offer Declined',
  [REQUEST_STATUS.OFFER_EXPIRED]: 'Offer Expired',
  [REQUEST_STATUS.INSPECTION_SCHEDULED]: 'Inspection Scheduled',
  [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: 'Reschedule Requested',
  [REQUEST_STATUS.INSPECTION_IN_PROGRESS]: 'Inspection In Progress',
  [REQUEST_STATUS.INSPECTION_COMPLETED]: 'Inspection Completed',
  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: 'Customer Not Available',
  [REQUEST_STATUS.ASSET_MISMATCH]: 'Asset Mismatch',
  [REQUEST_STATUS.AGENT_NOT_AVAILABLE]: 'Agent Not Available',
  [REQUEST_STATUS.APPROVED]: 'Approved',
  [REQUEST_STATUS.PENDING_SIGNATURE]: 'Pending Signature',
  [REQUEST_STATUS.PENDING_BANK_DETAILS]: 'Pending Bank Details',
  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: 'Bank Details Submitted',
  [REQUEST_STATUS.TRANSFER_FAILED]: 'Transfer Failed',
  [REQUEST_STATUS.AMOUNT_DISBURSED]: 'Amount Disbursed',
  [REQUEST_STATUS.ACTIVE]: 'Active',
  [REQUEST_STATUS.PAYMENT_OVERDUE]: 'Payment Overdue',
  [REQUEST_STATUS.DEFAULTED]: 'Defaulted',
  [REQUEST_STATUS.COMPLETED]: 'Completed',
  [REQUEST_STATUS.REJECTED]: 'Rejected',
  [REQUEST_STATUS.CANCELLED]: 'Cancelled',
};

// ============================================
// STATUS DESCRIPTIONS
// ============================================

export const REQUEST_STATUS_DESCRIPTION: Record<REQUEST_STATUS, string> = {
  [REQUEST_STATUS.PENDING]: 'Your request is waiting for admin review',
  [REQUEST_STATUS.UNDER_REVIEW]: 'Admin is reviewing your request details',
  [REQUEST_STATUS.MORE_INFO_REQUIRED]: 'Please provide additional documents or information',
  [REQUEST_STATUS.OFFER_SENT]: 'Review the loan offer and accept or decline',
  [REQUEST_STATUS.OFFER_ACCEPTED]: 'Great! Waiting for inspection scheduling',
  [REQUEST_STATUS.OFFER_DECLINED]: 'You declined the offer. You can submit a new request',
  [REQUEST_STATUS.OFFER_EXPIRED]: 'The offer has expired. Contact support for assistance',
  [REQUEST_STATUS.INSPECTION_SCHEDULED]: 'An agent will visit for asset inspection',
  [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: 'Reschedule request pending approval',
  [REQUEST_STATUS.INSPECTION_IN_PROGRESS]: 'Agent is inspecting your asset',
  [REQUEST_STATUS.INSPECTION_COMPLETED]: 'Inspection done, awaiting final approval',
  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: 'Agent visit failed. Will be rescheduled',
  [REQUEST_STATUS.ASSET_MISMATCH]: 'Asset does not match description provided',
  [REQUEST_STATUS.AGENT_NOT_AVAILABLE]: 'Agent unavailable. Will be reassigned',
  [REQUEST_STATUS.APPROVED]: 'Congratulations! Your loan is approved',
  [REQUEST_STATUS.PENDING_SIGNATURE]: 'Please sign the loan agreement',
  [REQUEST_STATUS.PENDING_BANK_DETAILS]: 'Provide bank details for disbursement',
  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: 'Bank details received, processing disbursement',
  [REQUEST_STATUS.TRANSFER_FAILED]: 'Transfer failed. Please update bank details',
  [REQUEST_STATUS.AMOUNT_DISBURSED]: 'Loan amount has been transferred to your account',
  [REQUEST_STATUS.ACTIVE]: 'Your loan is active. Keep up with EMI payments',
  [REQUEST_STATUS.PAYMENT_OVERDUE]: 'EMI payment is overdue. Please pay soon',
  [REQUEST_STATUS.DEFAULTED]: 'Multiple payments missed. Contact support immediately',
  [REQUEST_STATUS.COMPLETED]: 'Congratulations! Loan fully repaid',
  [REQUEST_STATUS.REJECTED]: 'Request was rejected. See notes for details',
  [REQUEST_STATUS.CANCELLED]: 'Request was cancelled',
};

// ============================================
// STATUS ICONS
// ============================================

export const REQUEST_STATUS_ICON: Record<REQUEST_STATUS, string> = {
  [REQUEST_STATUS.PENDING]: 'Clock',
  [REQUEST_STATUS.UNDER_REVIEW]: 'Search',
  [REQUEST_STATUS.MORE_INFO_REQUIRED]: 'AlertCircle',
  [REQUEST_STATUS.OFFER_SENT]: 'BadgeDollarSign',
  [REQUEST_STATUS.OFFER_ACCEPTED]: 'CheckCircle',
  [REQUEST_STATUS.OFFER_DECLINED]: 'XCircle',
  [REQUEST_STATUS.OFFER_EXPIRED]: 'Clock',
  [REQUEST_STATUS.INSPECTION_SCHEDULED]: 'Calendar',
  [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: 'CalendarClock',
  [REQUEST_STATUS.INSPECTION_IN_PROGRESS]: 'ClipboardList',
  [REQUEST_STATUS.INSPECTION_COMPLETED]: 'ClipboardCheck',
  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: 'UserX',
  [REQUEST_STATUS.ASSET_MISMATCH]: 'AlertTriangle',
  [REQUEST_STATUS.AGENT_NOT_AVAILABLE]: 'UserMinus',
  [REQUEST_STATUS.APPROVED]: 'ThumbsUp',
  [REQUEST_STATUS.PENDING_SIGNATURE]: 'FileSignature',
  [REQUEST_STATUS.PENDING_BANK_DETAILS]: 'Building2',
  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: 'Building2',
  [REQUEST_STATUS.TRANSFER_FAILED]: 'XCircle',
  [REQUEST_STATUS.AMOUNT_DISBURSED]: 'Banknote',
  [REQUEST_STATUS.ACTIVE]: 'TrendingUp',
  [REQUEST_STATUS.PAYMENT_OVERDUE]: 'AlertTriangle',
  [REQUEST_STATUS.DEFAULTED]: 'Ban',
  [REQUEST_STATUS.COMPLETED]: 'PartyPopper',
  [REQUEST_STATUS.REJECTED]: 'XCircle',
  [REQUEST_STATUS.CANCELLED]: 'XCircle',
};

// ============================================
// REQUEST HISTORY ACTION CONFIG
// ============================================

export const REQUEST_HISTORY_ACTION_CONFIG: Record<
  REQUEST_HISTORY_ACTION,
  {
    label: string;
    icon: string;
    colorClass: string;
    bgClass: string;
    category: REQUEST_HISTORY_CATEGORY;
    isAutomated: boolean;
  }
> = {
  [REQUEST_HISTORY_ACTION.OFFER_CREATED]: {
    label: 'Offer Created',
    icon: 'BadgeDollarSign',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    category: REQUEST_HISTORY_CATEGORY.OFFER,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.OFFER_REVISED]: {
    label: 'Offer Revised',
    icon: 'RefreshCw',
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    category: REQUEST_HISTORY_CATEGORY.OFFER,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.ASSIGNED_AGENT]: {
    label: 'Agent Assigned',
    icon: 'UserCheck',
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    category: REQUEST_HISTORY_CATEGORY.STATUS,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.ADMIN_ASSIGNED]: {
    label: 'Admin Assigned',
    icon: 'UserCog',
    colorClass: 'text-violet-600',
    bgClass: 'bg-violet-100 dark:bg-violet-900/30',
    category: REQUEST_HISTORY_CATEGORY.STATUS,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.LOAN_CREATED]: {
    label: 'Loan Created',
    icon: 'Landmark',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    category: REQUEST_HISTORY_CATEGORY.LOAN,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.STATUS_UPDATED]: {
    label: 'Status Updated',
    icon: 'ArrowRightLeft',
    colorClass: 'text-gray-600',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    category: REQUEST_HISTORY_CATEGORY.STATUS,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.COMMENT_ADDED]: {
    label: 'Comment Added',
    icon: 'MessageSquare',
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    category: REQUEST_HISTORY_CATEGORY.COMMENT,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.DOCUMENT_UPLOADED]: {
    label: 'Document Uploaded',
    icon: 'FileUp',
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    category: REQUEST_HISTORY_CATEGORY.DOCUMENT,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.AGREEMENT_GENERATED]: {
    label: 'Agreement Generated',
    icon: 'FileText',
    colorClass: 'text-cyan-600',
    bgClass: 'bg-cyan-100 dark:bg-cyan-900/30',
    category: REQUEST_HISTORY_CATEGORY.DOCUMENT,
    isAutomated: true,
  },
  [REQUEST_HISTORY_ACTION.SIGNED_AGREEMENT_UPLOADED]: {
    label: 'Agreement Signed',
    icon: 'FileCheck',
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    category: REQUEST_HISTORY_CATEGORY.DOCUMENT,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.INSPECTION_COMPLETED]: {
    label: 'Inspection Completed',
    icon: 'ClipboardCheck',
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-100 dark:bg-teal-900/30',
    category: REQUEST_HISTORY_CATEGORY.INSPECTION,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.PAYMENT_INITIATED]: {
    label: 'Payment Initiated',
    icon: 'CreditCard',
    colorClass: 'text-yellow-600',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    category: REQUEST_HISTORY_CATEGORY.PAYMENT,
    isAutomated: false,
  },
  [REQUEST_HISTORY_ACTION.PAYMENT_SUCCESS]: {
    label: 'Payment Successful',
    icon: 'CheckCircle',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    category: REQUEST_HISTORY_CATEGORY.PAYMENT,
    isAutomated: true,
  },
  [REQUEST_HISTORY_ACTION.PAYMENT_FAILED]: {
    label: 'Payment Failed',
    icon: 'XCircle',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    category: REQUEST_HISTORY_CATEGORY.PAYMENT,
    isAutomated: true,
  },
  [REQUEST_HISTORY_ACTION.PAYMENT_EXPIRED]: {
    label: 'Payment Expired',
    icon: 'Clock',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    category: REQUEST_HISTORY_CATEGORY.PAYMENT,
    isAutomated: true,
  },
  [REQUEST_HISTORY_ACTION.EMI_MARKED_OVERDUE]: {
    label: 'EMI Overdue',
    icon: 'AlertTriangle',
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    category: REQUEST_HISTORY_CATEGORY.PAYMENT,
    isAutomated: true,
  },
  [REQUEST_HISTORY_ACTION.EMI_PENALTY_APPLIED]: {
    label: 'Penalty Applied',
    icon: 'Receipt',
    colorClass: 'text-red-500',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    category: REQUEST_HISTORY_CATEGORY.PAYMENT,
    isAutomated: true,
  },
  [REQUEST_HISTORY_ACTION.LOAN_MARKED_DEFAULTED]: {
    label: 'Loan Defaulted',
    icon: 'Ban',
    colorClass: 'text-red-700',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    category: REQUEST_HISTORY_CATEGORY.LOAN,
    isAutomated: true,
  },
  [REQUEST_HISTORY_ACTION.LOAN_COMPLETED]: {
    label: 'Loan Completed',
    icon: 'PartyPopper',
    colorClass: 'text-green-700',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    category: REQUEST_HISTORY_CATEGORY.LOAN,
    isAutomated: true,
  },
};

/** Get label for unknown actions */
export const getRequestHistoryActionLabel = (action: string): string => {
  const config = REQUEST_HISTORY_ACTION_CONFIG[action as REQUEST_HISTORY_ACTION];
  if (config) return config.label;
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// ============================================
// DOCUMENT LABELS
// ============================================

export const DOCUMENT_CATEGORY_LABELS: Record<DOCUMENT_CATEGORY, string> = {
  [DOCUMENT_CATEGORY.ASSET]: 'Asset Documents',
  [DOCUMENT_CATEGORY.INSPECTION]: 'Inspection Photos',
  [DOCUMENT_CATEGORY.IDENTITY]: 'Identity Proofs',
  [DOCUMENT_CATEGORY.INCOME]: 'Income Documents',
  [DOCUMENT_CATEGORY.LEGAL]: 'Legal Documents',
  [DOCUMENT_CATEGORY.PAYMENT]: 'Payment Receipts',
  [DOCUMENT_CATEGORY.LOAN]: 'Loan Documents',
  [DOCUMENT_CATEGORY.PROFILE]: 'Profile Pictures',
  [DOCUMENT_CATEGORY.TRANSFER_PROOF]: 'Transfer Proofs',
  [DOCUMENT_CATEGORY.OTHER]: 'Other Documents',
};

export const DOCUMENT_TYPE_LABELS: Record<DOCUMENT_TYPE, string> = {
  [DOCUMENT_TYPE.ASSET_PHOTO]: 'Asset Photo',
  [DOCUMENT_TYPE.ASSET_DOCUMENT]: 'Asset Document',
  [DOCUMENT_TYPE.PURCHASE_RECEIPT]: 'Purchase Receipt',
  [DOCUMENT_TYPE.ID_PROOF]: 'ID Proof',
  [DOCUMENT_TYPE.ADDRESS_PROOF]: 'Address Proof',
  [DOCUMENT_TYPE.INSPECTION_PHOTO]: 'Inspection Photo',
  [DOCUMENT_TYPE.EMI_RECEIPT]: 'EMI Receipt',
  [DOCUMENT_TYPE.TRANSFER_PROOF]: 'Transfer Proof',
  [DOCUMENT_TYPE.LOAN_AGREEMENT]: 'Loan Agreement',
  [DOCUMENT_TYPE.PROFILE_PICTURE]: 'Profile Picture',
  [DOCUMENT_TYPE.OTHER]: 'Other Document',
};

export const UPLOADER_ROLE_LABELS: Record<DOCUMENT_UPLOADER_ROLE, string> = {
  [DOCUMENT_UPLOADER_ROLE.USER_SUBMITTED]: 'Customer Uploaded',
  [DOCUMENT_UPLOADER_ROLE.AGENT_SUBMITTED]: 'Agent Uploaded',
  [DOCUMENT_UPLOADER_ROLE.ADMIN_SUBMITTED]: 'Admin Uploaded',
  [DOCUMENT_UPLOADER_ROLE.SYSTEM]: 'System Stamped',
};

// ============================================
// DOCUMENT TYPE CONFIG
// ============================================

export const DOCUMENT_TYPE_CONFIG: Record<
  DOCUMENT_TYPE,
  {
    label: string;
    category: DOCUMENT_CATEGORY;
    isDownloadable: boolean;
    icon: string;
    description: string;
  }
> = {
  [DOCUMENT_TYPE.ASSET_PHOTO]: {
    label: 'Asset Photo',
    category: DOCUMENT_CATEGORY.ASSET,
    isDownloadable: true,
    icon: 'FileImage',
    description: 'Photos of the asset being pledged',
  },
  [DOCUMENT_TYPE.ASSET_DOCUMENT]: {
    label: 'Asset Document',
    category: DOCUMENT_CATEGORY.ASSET,
    isDownloadable: true,
    icon: 'FileText',
    description: 'Warranty cards, bills, receipts related to the asset',
  },
  [DOCUMENT_TYPE.PURCHASE_RECEIPT]: {
    label: 'Purchase Receipt',
    category: DOCUMENT_CATEGORY.ASSET,
    isDownloadable: true,
    icon: 'Receipt',
    description: 'Original purchase receipt or invoice',
  },
  [DOCUMENT_TYPE.ID_PROOF]: {
    label: 'ID Proof',
    category: DOCUMENT_CATEGORY.IDENTITY,
    isDownloadable: false,
    icon: 'CreditCard',
    description: 'Government issued ID proof',
  },
  [DOCUMENT_TYPE.ADDRESS_PROOF]: {
    label: 'Address Proof',
    category: DOCUMENT_CATEGORY.IDENTITY,
    isDownloadable: false,
    icon: 'MapPin',
    description: 'Address verification document',
  },
  [DOCUMENT_TYPE.INSPECTION_PHOTO]: {
    label: 'Inspection Photo',
    category: DOCUMENT_CATEGORY.INSPECTION,
    isDownloadable: true,
    icon: 'Camera',
    description: 'Photos taken during asset inspection',
  },
  [DOCUMENT_TYPE.EMI_RECEIPT]: {
    label: 'EMI Receipt',
    category: DOCUMENT_CATEGORY.PAYMENT,
    isDownloadable: true,
    icon: 'Receipt',
    description: 'EMI payment receipt',
  },
  [DOCUMENT_TYPE.TRANSFER_PROOF]: {
    label: 'Transfer Proof',
    category: DOCUMENT_CATEGORY.TRANSFER_PROOF,
    isDownloadable: true,
    icon: 'ArrowRightLeft',
    description: 'Proof of amount transfer',
  },
  [DOCUMENT_TYPE.LOAN_AGREEMENT]: {
    label: 'Loan Agreement',
    category: DOCUMENT_CATEGORY.LEGAL,
    isDownloadable: true,
    icon: 'FileText',
    description: 'Signed loan agreement document',
  },
  [DOCUMENT_TYPE.PROFILE_PICTURE]: {
    label: 'Profile Picture',
    category: DOCUMENT_CATEGORY.PROFILE,
    isDownloadable: false,
    icon: 'User',
    description: 'User profile picture',
  },
  [DOCUMENT_TYPE.OTHER]: {
    label: 'Other Document',
    category: DOCUMENT_CATEGORY.OTHER,
    isDownloadable: true,
    icon: 'File',
    description: 'Miscellaneous document',
  },
};

// ============================================
// MESSAGES
// ============================================

export const DOCUMENT_MESSAGES = {
  NO_DOCUMENTS: 'No documents uploaded yet',
  UPLOAD_SUCCESS: 'Document uploaded successfully',
  UPLOAD_ERROR: 'Failed to upload document',
  DELETE_SUCCESS: 'Document deleted successfully',
  DELETE_ERROR: 'Failed to delete document',
} as const;

export const ACTION_MESSAGES = {
  SUCCESS: 'Action completed successfully',
  ERROR: 'Failed to perform action',
  CONFIRM: 'Are you sure you want to proceed?',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NETWORK_ERROR: 'Network error. Please try again.',
} as const;

// ============================================
// LOCAL STORAGE KEYS
// ============================================

export const LOCAL_STORAGE_KEYS = {
  INSPECTION_PHOTOS: (requestId: string) => `fundifyhub_inspection_photos_${requestId}`,
} as const;

// ============================================
// MODAL COMPONENTS
// ============================================

export enum MODAL_COMPONENTS {
  // Offer modals
  CREATE_OFFER_MODAL = 'CreateOfferModal',
  
  // Assignment modals
  ASSIGN_AGENT_MODAL = 'AssignAgentModal',
  ASSIGN_ADMIN_MODAL = 'AssignAdminModal',
  
  // Rejection/Cancellation modals
  REJECT_MODAL = 'RejectModal',
  APPROVE_MODAL = 'ApproveModal',
  CANCEL_MODAL = 'CancelModal',
  WITHDRAW_MODAL = 'WithdrawModal',
  CANCEL_WITHDRAW_MODAL = 'CancelWithdrawModal', // Legacy alias
  
  // Disbursement modals
  DISBURSEMENT_MODAL = 'DisbursementModal',
  TRANSFER_FAILED_MODAL = 'TransferFailedModal',
  
  // Offer response modals
  OFFER_DECLINE_MODAL = 'OfferDeclineModal',
  DECLINE_OFFER_MODAL = 'DeclineOfferModal', // Alias
  
  // Info request modals
  REQUEST_INFO_MODAL = 'RequestInfoModal',
  REQUEST_BANK_DETAILS_MODAL = 'RequestBankDetailsModal',
  
  // Bank details modal
  BANK_DETAILS_MODAL = 'BankDetailsModal',
  
  // Inspection modals
  RESCHEDULE_MODAL = 'RescheduleModal',
  COMPLETE_INSPECTION_MODAL = 'CompleteInspectionModal',
  AGENT_ISSUE_MODAL = 'AgentIssueModal',
  REPORT_ISSUE_MODAL = 'ReportIssueModal',
  
  // Documentation modals
  REFUSE_SIGNATURE_MODAL = 'RefuseSignatureModal',
  EXPLANATION_MODAL = 'ExplanationModal',
}

export enum AGENT_ISSUE_TYPES {
  CUSTOMER_NOT_AVAILABLE = 'customer-not-available',
  AGENT_NOT_AVAILABLE = 'agent-not-available',
}

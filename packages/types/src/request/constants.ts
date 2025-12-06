import { REQUEST_STATUS } from './enums';
import { REQUEST_PHASE } from '../workflow/enums';

export const ASSET_TYPE_OPTIONS = [
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'CAMERA', label: 'Camera' },
  { value: 'GAMING CONSOLE', label: 'Gaming Console' },
  { value: 'MOBILE', label: 'Mobile / Phone' },
  { value: 'ELECTRONICS', label: 'Electronics (TV, Audio)' },
  { value: 'TV', label: 'TV' },
  { value: 'HOME_APPLIANCE', label: 'Home Appliance' },
  { value: 'BICYCLE', label: 'Bicycle' },
  { value: 'TRUCK', label: 'Truck' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'CAR', label: 'Car' },
  { value: 'JEWELRY', label: 'Jewelry' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const ASSET_CONDITION_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent - Like new' },
  { value: 'GOOD', label: 'Good - Minor wear' },
  { value: 'FAIR', label: 'Fair - Visible wear' },
  { value: 'POOR', label: 'Poor - Significant wear' },
] as const;

// ============================================
// STATUS GROUPINGS
// ============================================

/** Statuses where customer can still update their request */
export const ALLOWED_UPDATE_STATUSES: REQUEST_STATUS[] = [
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.OFFER_DECLINED,
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.CANCELLED,
];

/** Statuses where the request is still pending/in progress */
export const PENDING_REQUEST_STATUSES: REQUEST_STATUS[] = [
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.UNDER_REVIEW,
  REQUEST_STATUS.MORE_INFO_REQUIRED,
  REQUEST_STATUS.OFFER_SENT,
  REQUEST_STATUS.OFFER_ACCEPTED,
  REQUEST_STATUS.OFFER_DECLINED,
  REQUEST_STATUS.OFFER_EXPIRED,
  REQUEST_STATUS.INSPECTION_SCHEDULED,
  REQUEST_STATUS.INSPECTION_IN_PROGRESS,
  REQUEST_STATUS.INSPECTION_COMPLETED,
  REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE,
  REQUEST_STATUS.ASSET_MISMATCH,
  REQUEST_STATUS.AGENT_NOT_AVAILABLE,
];

/** Statuses where customer action is required */
export const CUSTOMER_ACTION_REQUIRED: REQUEST_STATUS[] = [
  REQUEST_STATUS.MORE_INFO_REQUIRED,
  REQUEST_STATUS.OFFER_SENT,
  REQUEST_STATUS.PENDING_SIGNATURE,
  REQUEST_STATUS.PENDING_BANK_DETAILS,
  REQUEST_STATUS.TRANSFER_FAILED,
];

/** Statuses where admin action is required */
export const ADMIN_ACTION_REQUIRED: REQUEST_STATUS[] = [
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.UNDER_REVIEW,
  REQUEST_STATUS.OFFER_EXPIRED,
  REQUEST_STATUS.INSPECTION_COMPLETED,
  REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
];

/** Statuses where agent action is required */
export const AGENT_ACTION_REQUIRED: REQUEST_STATUS[] = [
  REQUEST_STATUS.INSPECTION_SCHEDULED,
  REQUEST_STATUS.INSPECTION_IN_PROGRESS,
];

/** Statuses where agents should no longer have UI access */
export const AGENT_ACCESS_DENY_STATUSES: REQUEST_STATUS[] = [
  REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
  REQUEST_STATUS.TRANSFER_FAILED,
  REQUEST_STATUS.AMOUNT_DISBURSED,
  REQUEST_STATUS.ACTIVE,
  REQUEST_STATUS.PAYMENT_OVERDUE,
  REQUEST_STATUS.DEFAULTED,
  REQUEST_STATUS.COMPLETED,
];

/** Statuses that allow customer transitions */
export const CUSTOMER_ALLOWED_STATUSES: REQUEST_STATUS[] = [
  REQUEST_STATUS.OFFER_ACCEPTED,
  REQUEST_STATUS.OFFER_DECLINED,
  REQUEST_STATUS.CANCELLED,
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.INSPECTION_SCHEDULED,
  REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED,
  REQUEST_STATUS.PENDING_BANK_DETAILS,
  REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
];

/** Statuses that allow agent transitions */
export const AGENT_ALLOWED_STATUSES: REQUEST_STATUS[] = [
  REQUEST_STATUS.INSPECTION_IN_PROGRESS,
  REQUEST_STATUS.INSPECTION_COMPLETED,
  REQUEST_STATUS.INSPECTION_SCHEDULED,
  REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE,
  REQUEST_STATUS.ASSET_MISMATCH,
  REQUEST_STATUS.AGENT_NOT_AVAILABLE,
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.REJECTED,
];

/** Statuses that allow loan creation */
export const LOAN_CREATION_ALLOWED_STATUSES: REQUEST_STATUS[] = [
  REQUEST_STATUS.OFFER_ACCEPTED,
  REQUEST_STATUS.INSPECTION_COMPLETED,
  REQUEST_STATUS.APPROVED,
];

export const REQUEST_PHASE_LABELS: Record<REQUEST_PHASE, string> = {
  [REQUEST_PHASE.SUBMISSION]: 'Submit',
  [REQUEST_PHASE.OFFER]: 'Offer',
  [REQUEST_PHASE.INSPECTION]: 'Inspect',
  [REQUEST_PHASE.APPROVAL]: 'Approve',
  [REQUEST_PHASE.DISBURSEMENT]: 'Disburse',
  [REQUEST_PHASE.REPAYMENT]: 'Repay',
};

/** Map status to phase */


// ============================================
// OFFER FORM CONSTANTS
// ============================================

export const OFFER_FORM_DEFAULTS = {
  PENALTY_PERCENTAGE: 4,
  LATE_FEE_PERCENTAGE: 0.01,
  PROCESSING_FEE: 0,
} as const;

export const OFFER_FORM_CONSTRAINTS = {
  MAX_TENURE_MONTHS: 60,
  MAX_INTEREST_RATE: 36,
  MIN_AMOUNT: 0,
  MIN_TENURE: 1,
  MIN_INTEREST_RATE: 0,
} as const;



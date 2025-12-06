// ============================================
// REQUEST STATUS ENUM
// ============================================

export enum REQUEST_STATUS {
  // PHASE 1: SUBMISSION & REVIEW
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  MORE_INFO_REQUIRED = 'MORE_INFO_REQUIRED',

  // PHASE 2: OFFER & NEGOTIATION
  OFFER_SENT = 'OFFER_SENT',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_DECLINED = 'OFFER_DECLINED',
  OFFER_EXPIRED = 'OFFER_EXPIRED',

  // PHASE 3: INSPECTION
  INSPECTION_SCHEDULED = 'INSPECTION_SCHEDULED',
  INSPECTION_RESCHEDULE_REQUESTED = 'INSPECTION_RESCHEDULE_REQUESTED',
  INSPECTION_IN_PROGRESS = 'INSPECTION_IN_PROGRESS',
  INSPECTION_COMPLETED = 'INSPECTION_COMPLETED',
  CUSTOMER_NOT_AVAILABLE = 'CUSTOMER_NOT_AVAILABLE',
  ASSET_MISMATCH = 'ASSET_MISMATCH',
  AGENT_NOT_AVAILABLE = 'AGENT_NOT_AVAILABLE',

  // PHASE 4: APPROVAL & DOCUMENTATION
  APPROVED = 'APPROVED',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  PENDING_BANK_DETAILS = 'PENDING_BANK_DETAILS',

  // PHASE 5: LOAN PROCESSING & DISBURSEMENT
  BANK_DETAILS_SUBMITTED = 'BANK_DETAILS_SUBMITTED',
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  AMOUNT_DISBURSED = 'AMOUNT_DISBURSED',

  // PHASE 6: ACTIVE LOAN
  ACTIVE = 'ACTIVE',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  DEFAULTED = 'DEFAULTED',
  COMPLETED = 'COMPLETED',

  // TERMINAL STATES
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

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

// ============================================
// WORKFLOW PHASES
// ============================================

export enum REQUEST_PHASE {
  SUBMISSION = 'SUBMISSION',
  OFFER = 'OFFER',
  INSPECTION = 'INSPECTION',
  APPROVAL = 'APPROVAL',
  DISBURSEMENT = 'DISBURSEMENT',
  REPAYMENT = 'REPAYMENT',
}
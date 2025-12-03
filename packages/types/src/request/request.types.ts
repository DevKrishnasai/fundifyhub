/**
 * Request and inspection types
 * @module request/request.types
 */

import type { UserType } from '../auth/auth.types';
import type { LoanType, EMIScheduleType, PaymentType, PaymentOrderType } from '../loan/loan.types';
import type { DocumentType } from '../document/document.types';

// ============================================
// ASSET TYPE
// ============================================

export interface AssetType {
  id: string;
  requestId: string;
  assetType: string;
  brand: string;
  model: string;
  condition: string;
  purchaseYear: number;
  description: string;
  estimatedValue: number | null;
  inspectedValue: number | null;
  status: string; // AssetStatus enum value
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  request?: RequestType;
}

// ============================================
// BANK DETAILS TYPE
// ============================================

export interface BankDetailsType {
  id: string;
  userId: string;
  accountNumber: string;
  ifscCode: string;
  accountName: string;
  bankName: string | null;
  branchName: string | null;
  upiId: string | null;
  isVerified: boolean;
  verifiedAt: Date | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: UserType;
  requests?: RequestType[];
}

// ============================================
// ADMIN OFFER TYPE
// ============================================

export interface AdminOfferType {
  id: string;
  requestId: string;
  offeredById: string;
  
  // Offer terms
  offeredAmount: number;
  tenureMonths: number;
  interestRate: number;
  processingFee: number;
  
  // EMI calculation snapshot
  emiAmount: number | null;
  totalInterest: number | null;
  totalAmount: number | null;
  emiSchedule: AdminEMISchedulePreview | null;
  
  // Penalty settings
  penaltyPercentage: number;
  lateFeePercentage: number;
  
  // Status and dates
  status: string; // OfferStatus enum value
  expiresAt: Date | null;
  respondedAt: Date | null;
  
  // Revision tracking
  revision: number;
  previousOfferId: string | null;
  notes: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  request?: RequestType;
  offeredBy?: UserType;
  previousOffer?: AdminOfferType | null;
  revisions?: AdminOfferType[];
}

// ============================================
// EMI SCHEDULE PREVIEW (for admin offers)
// ============================================

export interface AdminEMISchedulePreview {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  emiSchedule: Array<{
    installment: number;
    paymentDate: string;
    paymentAmount: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
  /** Optional processing fee applied at disbursement */
  processingFee?: number | null;
}

// ============================================
// REQUEST TYPE
// ============================================

export interface RequestType {
  id: string;
  requestNumber: string;
  customerId: string;
  requestedAmount: number;
  district: string;
  currentStatus: string;

  // Asset (relation - new normalized model)
  asset?: AssetType | null;
  
  // Legacy asset fields (for backward compatibility during migration)
  // These will be removed once migration is complete
  purchaseYear?: number;
  assetType?: string;
  assetBrand?: string;
  assetModel?: string;
  assetCondition?: string;
  AdditionalDescription?: string;

  // Active offer reference
  activeOfferId?: string | null;
  
  // Admin Offer Details (relations - normalized model)
  offers?: AdminOfferType[];  // All offers for this request (history)
  
  // Legacy admin offer fields (for backward compatibility during migration)
  adminOfferedAmount: number | null;
  adminTenureMonths: number | null;
  adminInterestRate: number | null;
  adminEmiSchedule: AdminEMISchedulePreview | null;
  offerMadeDate: Date | null;
  offerResponseDate: Date | null;
  adminProcessingFee: number;
  penaltyPercentage: number | null;
  lateFeePercentage: number | null;
  adminRequestedInfo: string | null;

  // Bank Details (relation - normalized model)
  disbursementAccountId: string | null;
  disbursementAccount?: BankDetailsType | null;
  bankDetailsSubmittedAt: Date | null;
  
  // Legacy bank detail fields (for backward compatibility during migration)
  // These will be removed once migration is complete
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankAccountName?: string | null;
  upiId?: string | null;

  // Assignment
  assignedAgentId: string | null;
  assignedAdminId: string | null;
  inspectionScheduledAt: Date | null;

  submittedDate: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  customer?: UserType;
  assignedAgent?: UserType | null;
  assignedAdmin?: UserType | null;
  loan?: LoanType | null;
  documents?: DocumentType[];
  emisSchedule?: EMIScheduleType[];
  payments?: PaymentType[];
  paymentOrders?: PaymentOrderType[];
  comments?: CommentType[];
  commentsEnabled?: boolean | null;
  inspections?: InspectionType[];
  requestHistory?: RequestHistoryItem[];
}

// ============================================
// COMMENT TYPE
// ============================================

export interface CommentType {
  id: string;
  requestId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  commentType: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  request?: RequestType;
  author?: UserType;
}

// ============================================
// INSPECTION TYPE
// ============================================

export interface InspectionType {
  id: string;
  requestId: string;
  agentId: string | null;
  scheduledDate: Date | null;
  completedDate: Date | null;
  status: string;
  assetCondition: string | null;
  estimatedValue: number | null;
  notes: string | null;
  recommendApprove: boolean | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  request?: RequestType;
  agent?: UserType | null;
}

// ============================================
// REQUEST HISTORY
// ============================================

export interface RequestHistoryItem {
  id: string;
  requestId: string;
  actorId: string;
  action: string;
  metadata:
    | StatusUpdateMetadata
    | AdminRequestedInfoMetadata
    | DocumentUploadedMetadata
    | RescheduleRequestMetadata
    | DisbursementMetadata
    | Record<string, unknown>
    | null;
  createdAt: Date;
  request?: RequestType;
  actor?: UserType | null;
}

// ============================================
// HISTORY METADATA SHAPES
// ============================================

export interface StatusUpdateMetadata {
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
}

export interface AdminRequestedInfoMetadata {
  requestedBy?: string | null;
  requestedByName?: string | null;
  note?: string | null;
  message?: string | null;
}

export interface DocumentUploadedMetadata {
  documentId?: string | null;
  fileKey?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  documentType?: string | null;
  uploaderId?: string | null;
  uploaderRole?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
}

export interface RescheduleRequestMetadata {
  previousInspectionAt?: string | null;
  requestedInspectionAt?: string | null;
  reason?: string | null;
}

export interface DisbursementMetadata {
  loanId?: string | null;
  amount?: number | null;
  transactionRef?: string | null;
  proofDocumentId?: string | null;
}

export interface HistoryEventDescription {
  key: string;
  value: string;
}

import { DistrictType } from '../geography';
import { User } from '../auth/models';
import { Loan, EMISchedule } from '../loan/models';
import { Payment, PaymentOrder } from '../payment/models';
import { AppDocument as DocumentType } from '../document/models'; 
import { REQUEST_STATUS } from './enums';
import { WorkflowAction, WorkflowState } from '../workflow/models';
import { UserRole } from '../auth/enums';

// ============================================
// ASSET TYPE
// ============================================

export interface Asset {
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
  request?: Request;
}

// ============================================
// BANK DETAILS TYPE
// ============================================

export interface BankDetails {
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
  user?: User;
  requests?: Request[];
}

// ============================================
// ADMIN OFFER TYPE
// ============================================

export interface AdminOffer {
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
  request?: Request;
  offeredBy?: User;
  previousOffer?: AdminOffer | null;
  revisions?: AdminOffer[];
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

export interface Request {
  id: string;
  requestNumber: string;
  customerId: string;
  requestedAmount: number;
  /** District ID (string) or hydrated DistrictType when included */
  district: string | DistrictType;
  
  // Stage-based status (new system - 10 stages)
  stage: string;
  subStatus: string | null;
  
  // Action flags for filtering
  requiresCustomerAction: boolean;
  requiresAdminAction: boolean;
  requiresAgentAction: boolean;
  isBlocked: boolean;
  
  // Failure tracking
  failureReason?: string | null;
  failureType?: string | null;
  
  // Computed legacy status for backward compatibility
  currentStatus: string;

  // Asset (relation - new normalized model)
  asset?: Asset | null;
  
  // Legacy asset fields (for backward compatibility during migration)
  purchaseYear?: number;
  assetType?: string;
  assetBrand?: string;
  assetModel?: string;
  assetCondition?: string;
  AdditionalDescription?: string;

  // Active offer reference
  activeOfferId?: string | null;
  
  // Admin Offer Details (relations - normalized model)
  offers?: AdminOffer[];  // All offers for this request (history)
  
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
  disbursementAccount?: BankDetails | null;
  bankDetailsSubmittedAt: Date | null;
  
  // Legacy bank detail fields (for backward compatibility during migration)
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  bankAccountName?: string | null;
  upiId?: string | null;

  // Agreement fields
  agreementUrl?: string | null;
  signedAgreementUrl?: string | null;

  // Assignment
  assignedAgentId: string | null;
  assignedAdminId: string | null;
  inspectionScheduledAt: Date | null;

  submittedDate: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  customer?: User;
  assignedAgent?: User | null;
  assignedAdmin?: User | null;
  loan?: Loan | null;
  documents?: DocumentType[];
  emisSchedule?: EMISchedule[];
  payments?: Payment[];
  paymentOrders?: PaymentOrder[];
  comments?: Comment[];
  commentsEnabled?: boolean | null;
  inspections?: Inspection[];
  requestHistory?: RequestHistoryItem[];
}

// ============================================
// COMMENT TYPE
// ============================================

export interface Comment {
  id: string;
  requestId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  commentType: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  request?: Request;
  author?: User;
}

// ============================================
// INSPECTION TYPE
// ============================================

export interface Inspection {
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
  request?: Request;
  agent?: User | null;
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
  request?: Request;
  actor?: User | null;
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

// Aliases
export type RequestType = Request;
export type AssetType = Asset;
export type InspectionType = Inspection;
export type CommentType = Comment;
export type BankDetailsType = BankDetails;
export type AdminOfferType = AdminOffer;


export interface CommentWithAuthor extends Comment {
  author: User;
}

export interface RequestWithRelations extends Request {
  customer?: User;
  loan?: Loan | null;
}

export interface RequestDetailWithLoan extends Request {
  loan?: Loan | null;
  documents?: DocumentType[];
  comments?: CommentWithAuthor[];
}


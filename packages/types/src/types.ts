import { CONNECTION_STATUS, SERVICE_NAMES, TEMPLATE_NAMES, UserRole } from "./constants";

// Import types that are used in this file
import type {
  CountryType,
  StateType,
  DistrictType,
  WarehouseType,
} from './common/geography.types';

import type {
  UserStateAssignmentType,
  UserDistrictAssignmentType,
} from './auth/auth.types';

// ---------- JSON VALUE TYPE ---------------
// Type-safe replacement for `any` when dealing with JSON data
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// ============================================
// SERVICE CONFIGURATION TYPES (moved to common/service.types.ts)
// Re-exported here for backward compatibility
// ============================================

export type {
  EmailConfigType,
  ServiceConfigType,
  UtilsEnvConfigType,
  CONNECTION_STATUS,
} from './common/service.types';

// ============================================
// GEOGRAPHY TYPES (moved to common/geography.types.ts)
// Re-exported here for backward compatibility
// ============================================

export type {
  CountryType,
  StateType,
  DistrictType,
  WarehouseType,
} from './common/geography.types';

// ============================================
// USER ASSIGNMENT TYPES (moved to auth/auth.types.ts)
// Re-exported here for backward compatibility
// ============================================

export type {
  UserStateAssignmentType,
  UserDistrictAssignmentType,
} from './auth/auth.types';

// ============================================
// USER TYPE (Updated with multiple roles)
// ============================================

export interface UserType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  
  // Multiple roles (users can have multiple roles)
  roles: UserRole[];
  
  // Home district for customers
  homeDistrictId?: string | null;
  
  // Computed district IDs (from districtAssignments, populated by API)
  districts?: string[];
  
  isActive: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  
  // Address
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  
  // Soft delete
  deletedAt?: Date | null;
  deletedBy?: string | null;
  
  createdAt?: Date;
  updatedAt?: Date;
  
  // Relations
  homeDistrict?: DistrictType | null;
  stateAssignments?: UserStateAssignmentType[];
  districtAssignments?: UserDistrictAssignmentType[];
}

export interface JWTPayloadType {
  id: string;
  email: string;
  roles: UserRole[];  // Multiple roles (e.g., [CUSTOMER, AGENT])
  homeDistrictId?: string | null;
  // For geographic scope (array of district IDs)
  districts?: string[];  // User's assigned district IDs
  stateIds?: string[];   // User's assigned state IDs (for STATE_ADMIN)
  iat?: number;
  exp?: number;
}

// ============================================
// ASSET & AUCTION TYPES
// ============================================

export interface AssetType {
  id: string;
  assetType: string;
  brand: string;
  model: string;
  condition: string;  // AssetCondition enum value
  purchaseYear: number;
  description: string;
  
  // Valuation
  estimatedValue: number | null;
  inspectedValue: number | null;
  
  // Depreciation tracking
  depreciationRate: number | null;
  lastValuationDate: Date | null;
  currentMarketValue: number | null;
  
  status: string;  // AssetStatus enum value
  warehouseId: string | null;
  requestId: string;
  
  // Soft delete
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  request?: RequestType;
  warehouse?: WarehouseType | null;
  movements?: AssetMovementType[];
  auctionListings?: AuctionListingType[];
}

export interface AssetMovementType {
  id: string;
  assetId: string;
  movementType: string;  // MovementType enum value
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  movementDate: Date;
  movedBy: string;
  notes: string | null;
  attachments: JsonValue | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  asset?: AssetType;
  fromWarehouse?: WarehouseType | null;
  toWarehouse?: WarehouseType | null;
}

export interface AuctionListingType {
  id: string;
  listingNumber: string;
  assetId: string;
  
  // Timing
  startTime: Date;
  endTime: Date;
  extendedEndTime: Date | null;
  
  // Pricing
  reservePrice: number;
  startingBid: number;
  bidIncrement: number;
  buyNowPrice: number | null;
  
  // State
  status: string;  // AuctionStatus enum value
  currentHighBid: number | null;
  totalBids: number;
  
  // Winner
  winnerId: string | null;
  winningBidId: string | null;
  finalPrice: number | null;
  
  // Description
  title: string;
  description: string;
  mediaUrls: JsonValue | null;
  
  // Terms
  termsAndConditions: string | null;
  pickupLocation: string | null;
  pickupDeadline: Date | null;
  
  // Admin tracking
  createdById: string;
  approvedAt: Date | null;
  approvedBy: string | null;
  
  // Soft delete
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  asset?: AssetType;
  winner?: UserType | null;
  createdBy?: UserType;
  bids?: AuctionBidType[];
}

export interface AuctionBidType {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  status: string;  // BidStatus enum value
  maxAutoBid: number | null;
  isAutoBid: boolean;
  placedAt: Date;
  outbidAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  auction?: AuctionListingType;
  bidder?: UserType;
}

// ---------- EMI & REQUEST RELATED ---------------

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
  // Optional processing fee applied at disbursement (not part of EMI calculation)
  processingFee?: number | null;
}

export interface RequestHistoryItem {
  id: string;
  requestId: string;
  actorId: string; // Required for audit
  action: string;
  // Structured metadata for known events. Keep a fallback of free-form object
  // for legacy or untyped events.
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

// ----- RequestHistory metadata shapes -----
export interface StatusUpdateMetadata {
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
}

export interface AdminRequestedInfoMetadata {
  requestedBy?: string | null; // admin id
  requestedByName?: string | null; // optional human-friendly name
  // Free-form note/message the admin provided (preferred field: note)
  note?: string | null;
  message?: string | null; // legacy field kept for compatibility
  // Keep metadata minimal: who requested and a note/message. Avoid role/fields/dueBy in shared metadata.
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
  // snapshot of request status at time of upload
  fromStatus?: string | null;
  toStatus?: string | null;
}

export interface RescheduleRequestMetadata {
  // Dates are date-only strings in YYYY-MM-DD format (no time component)
  previousInspectionAt?: string | null; // date-only (YYYY-MM-DD)
  requestedInspectionAt?: string | null; // date-only (YYYY-MM-DD)
  reason?: string | null;
}

export interface DisbursementMetadata {
  loanId?: string | null;
  amount?: number | null;
  transactionRef?: string | null;
  proofDocumentId?: string | null;
}

// Payment-related metadata shapes
export interface PaymentInitiatedMetadata {
  paymentOrderId: string;
  razorpayOrderId: string;
  emiId: string;
  emiNumber: number;
  emiAmount: number;
  penalty: number;
  totalAmount: number;
  initiatedBy: string; // customer ID
}

export interface PaymentSuccessMetadata {
  paymentOrderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  emiId: string;
  emiNumber: number;
  amountPaid: number;
  penalty: number;
  paymentMethod?: string | null;
  paidAt: string; // ISO timestamp
}

export interface PaymentFailedMetadata {
  paymentOrderId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  emiId: string;
  emiNumber: number;
  attemptedAmount: number;
  failureReason?: string | null;
  failureCode?: string | null;
  failedAt: string; // ISO timestamp
}

export interface PaymentExpiredMetadata {
  paymentOrderId: string;
  razorpayOrderId: string;
  emiId: string;
  emiNumber: number;
  totalAmount: number;
  expiredAt: string; // ISO timestamp
}

export interface EMIOverdueMetadata {
  emiId: string;
  emiNumber: number;
  emiAmount: number;
  dueDate: string; // ISO date
  daysOverdue: number;
  lateFee: number;
  previousStatus: string;
}

export interface EMIPenaltyAppliedMetadata {
  emiId: string;
  emiNumber: number;
  penaltyAmount: number;
  penaltyType: string; // 'LATE_FEE' or 'OVERDUE_PENALTY'
  daysLate: number;
  calculatedAt: string; // ISO timestamp
}

export interface LoanDefaultedMetadata {
  loanId: string;
  overdueEmiCount: number;
  totalOverdueAmount: number;
  defaultedAt: string; // ISO timestamp
}

export interface LoanCompletedMetadata {
  loanId: string;
  totalPaidAmount: number;
  totalEmisPaid: number;
  completedAt: string; // ISO timestamp
}

export interface HistoryEventDescription {
  key: string;
  value: string;
}

// ============================================
// TEMPLATE RELATED (LEGACY - packages/providers only)
// ============================================
/**
 * @deprecated Legacy template types used by packages/providers.
 * 
 * For NEW code, use the comprehensive template system from `template-types.ts`:
 * - NotificationTemplateDefinition (instead of TemplateDefinitionType)
 * - NotificationTemplateName enum
 * - Template payloads from TemplatePayloadMap
 * 
 * These legacy types are maintained for backward compatibility with
 * the existing provider package templates until full migration.
 */

/**
 * @deprecated Use NotificationTemplateDefinition from template-types.ts
 */
export interface TemplateDefinitionType<T extends TEMPLATE_NAMES> {
  supportedServices: SERVICE_NAMES[];
  defaults?: {
    priority?: number;
    delay?: number;
    attempts?: number;
  };
  getSubject?: (payload: TemplatePayloadMapType[T]) => string;
  renderEmail?: (payload: TemplatePayloadMapType[T]) => Promise<string> | string;
  renderWhatsApp?: (payload: TemplatePayloadMapType[T]) => Promise<string> | string;
}

/**
 * @deprecated Use OTPVerificationPayload from template-types.ts
 */
export interface OTPVerificationPayloadType {
  email: string;
  phoneNumber: string;
  otpCode: string;
  expiresInMinutes: number;
  companyName: string;
  supportUrl: string;
  verifyUrl: string;
  logoUrl: string;
  companyUrl: string;
}

/**
 * @deprecated Use WelcomePayload from template-types.ts
 */
export interface WelcomePayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  supportUrl: string;
  companyUrl: string;
  companyName: string;
  logoUrl: string;
}

/**
 * @deprecated Use LoginAlertPayload from template-types.ts
 */
export interface LoginAlertPayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  device: string;
  location: string;
  time: string;
  supportUrl: string;
  resetPasswordUrl: string;
  companyName: string;
}

/**
 * @deprecated Use PasswordResetPayload from template-types.ts
 */
export interface PasswordResetPayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  resetUrl: string;
  expiresInMinutes: number;
  companyName: string;
  supportUrl: string;
  companyUrl?: string;
  logoUrl?: string;
}

export interface AdminUserCreatedPayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  tempPassword: string;
  loginUrl: string;
  resetPasswordUrl: string;
  companyName: string;
  supportUrl: string;
  companyUrl?: string;
  logoUrl?: string;
  createdByAdmin: string;
  assignedRoles: string[];
  assignedDistricts: string[];
}

export interface RequestStatusNotificationsPayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  // Core dynamic fields
  currentStatus: string;
  link: string;
  // Optional overrides for header/description/footer
  header: string;
  description: string;
  footer: string;
  // Context
  companyName: string;
  supportUrl?: string;
  requestId: string;
  // Optional richer fields
  previousStatus: string;
  updatedBy: string;
  time: string; // ISO or friendly string
  // list of transitions (from -> to) to render a timeline
  transitions?: Array<{
    from: string;
    to: string;
    by?: string;
    time?: string;
  }>;
  // branding
  logoUrl?: string;
  companyUrl?: string;
}

export interface AssetPledgePayloadType {
  customerName: string;
  assetName: string;
  amount: number;
  district: string;
  requestId: string;
  companyName: string;
  timestamp: string;
  additionalDescription?: string;
  recipient?: string;
  email: string;
  phoneNumber: string;
  adminDashboardUrl: string;
  supportUrl?: string;
}
export type EMIReminderPayloadType = {
  customerName: string;
  email: string;
  phoneNumber: string;
  loanNumber: string;
  emiNumber: number;
  emiAmount: number;
  dueDate: string;
  daysUntilDue?: number; // Positive = days until due, negative = days overdue
  totalOutstanding?: number;
  paymentUrl?: string;
  companyName?: string;
};

export type EMIOverduePayloadType = {
  customerName: string;
  email: string;
  phoneNumber: string;
  loanNumber: string;
  emiNumber: number;
  emiAmount: number;
  dueDate: string;
  daysOverdue: number;
  lateFee: number;
  totalDue: number;
  overdueCount: number; // Number of overdue EMIs
  paymentUrl?: string;
  companyName?: string;
};
// Request related payloads
export interface RequestSubmittedPayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  requestId: string;
  assetName: string;
  amount: number;
  district: string;
  submittedAt: string; // ISO timestamp
  companyName: string;
  supportUrl?: string;
  dashboardUrl: string; // link to view the request
}

export interface RequestStatusNotificationsPayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  // Core dynamic fields
  currentStatus: string;
  link: string;
  // Optional overrides for header/description/footer
  header: string;
  description: string;
  footer: string;
  // Context
  companyName: string;
  supportUrl?: string;
  requestId: string;
  // Optional richer fields
  previousStatus: string;
  updatedBy: string;
  time: string; // ISO or friendly string
  transitions?: Array<{ from: string; to: string; by?: string; time?: string; }>;
  logoUrl?: string;
  companyUrl?: string;
}
export interface RequestSubmittedPayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  requestId: string;
  assetName: string;
  amount: number;
  district: string;
  submittedAt: string; // ISO timestamp
  companyName: string;
  supportUrl?: string;
  dashboardUrl: string; // link to view the request
}

/**
 * @deprecated Use TemplatePayloadMap from template-types.ts
 */
export type TemplatePayloadMapType = {
  [TEMPLATE_NAMES.OTP_VERIFICATION]: OTPVerificationPayloadType;
  [TEMPLATE_NAMES.WELCOME]: WelcomePayloadType;
  [TEMPLATE_NAMES.LOGIN_ALERT]: LoginAlertPayloadType;
  [TEMPLATE_NAMES.PASSWORD_RESET]: PasswordResetPayloadType;
  [TEMPLATE_NAMES.ADMIN_USER_CREATED]: AdminUserCreatedPayloadType;
  [TEMPLATE_NAMES.ASSET_PLEDGE]: AssetPledgePayloadType;
  [TEMPLATE_NAMES.EMI_REMINDER]: EMIReminderPayloadType;
  [TEMPLATE_NAMES.EMI_OVERDUE]: EMIOverduePayloadType;
  [TEMPLATE_NAMES.REQUEST_STATUS_NOTIFICATIONS]: RequestStatusNotificationsPayloadType;
  [TEMPLATE_NAMES.REQUEST_SUBMITTED]: RequestSubmittedPayloadType;
};

// -----------TEMPLATE RELATED END-----------

// ------- JOB RELATED --------------

// NOTE: Legacy job types removed. Use NotificationRequest from notification-types.ts instead.

// ------- JOB RELATED END ----------

// ------- REQUEST & LOAN TYPES ----------

export interface RequestType {
  id: string;
  requestNumber: string; // Required for production
  customerId: string;
  requestedAmount: number;
  
  // Geography - FK to District (replaces string district)
  districtId: string;
  
  // Workflow state tracking
  currentStatus: string;
  previousStatus: string | null;  // For rollback/audit - tracks last status before current
  statusChangedAt: Date | null;   // When status was last changed
  statusChangedBy: string | null; // User ID who changed the status
  
  // Asset relation - now separate model
  asset?: AssetType | null;
  
  // Current active offer reference
  activeOfferId: string | null;
  
  // Admin Offer Details (legacy - kept for backward compatibility)
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
  
  // Bank Details reference
  disbursementAccountId: string | null;
  bankDetailsSubmittedAt: Date | null;
  
  // Assignment
  assignedAgentId: string | null;
  assignedAdminId: string | null;
  inspectionScheduledAt: Date | null;
  
  // Comments toggle
  commentsEnabled: boolean;
  
  // Soft delete
  deletedAt: Date | null;
  deletedBy: string | null;
  
  submittedDate: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  customer?: UserType;
  assignedAgent?: UserType | null;
  assignedAdmin?: UserType | null;
  district?: DistrictType;
  disbursementAccount?: BankDetailsType | null;
  offers?: AdminOfferType[];
  loan?: LoanType | null;
  documents?: DocumentType[];
  emiSchedules?: EMIScheduleType[];
  payments?: PaymentType[];
  paymentOrders?: PaymentOrderType[];
  comments?: CommentType[];
  inspections?: InspectionType[];
}

// Bank Details Type
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
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: UserType;
}

// Admin Offer Type
export interface AdminOfferType {
  id: string;
  requestId: string;
  offeredById: string;
  offeredAmount: number;
  tenureMonths: number;
  interestRate: number;
  processingFee: number;
  emiAmount: number | null;
  totalInterest: number | null;
  totalAmount: number | null;
  emiSchedule: JsonValue | null;
  penaltyPercentage: number;
  lateFeePercentage: number;
  status: string;  // OfferStatus enum value
  expiresAt: Date | null;
  respondedAt: Date | null;
  revision: number;
  previousOfferId: string | null;
  notes: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  request?: RequestType;
  offeredBy?: UserType;
  previousOffer?: AdminOfferType | null;
}

export interface LoanType {
  id: string;
  loanNumber: string; // Required for production
  requestId: string;
  
  // Fixed Loan Terms
  approvedAmount: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  
  // Calculated Totals
  totalInterest: number;
  totalAmount: number;
  
  // Loan Status & Dates
  status: string;
  approvedDate: Date; // Required for active loans
  disbursedDate: Date | null;
  firstEMIDate: Date; // Required for active loans
  lastEMIDate: Date; // Required for active loans
  
  // Payment Tracking
  totalPaidAmount: number;
  remainingAmount: number; // Required for active loans
  paidEMIs: number;
  remainingEMIs: number; // Required for active loans
  overdueEMIs: number;
  
  // Transfer Details
  transferMethod: string | null;
  transferReference: string | null;
  transferProof: string | null;
  
  // Closure Details
  closedDate: Date | null;
  closureType: string | null;
  
  // Soft delete
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  request?: RequestType;
  emisSchedule?: EMIScheduleType[];
  payments?: PaymentType[];
  paymentOrders?: PaymentOrderType[];
}

export interface EMIScheduleType {
  id: string;
  loanId: string;
  requestId: string;
  emiNumber: number;
  dueDate: Date;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  status: string;
  paidDate: Date | null;
  paidAmount: number | null;
  lateFee: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  loan?: LoanType;
  request?: RequestType;
  payments?: PaymentType[];
  paymentOrders?: PaymentOrderType[];
}

export interface PaymentType {
  id: string;
  loanId: string;
  requestId: string;
  emiScheduleId: string | null;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  paymentReference: string; // Required for audit
  paidDate: Date;
  processedBy: string; // Required for audit
  remarks: string | null;
  receiptPath: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  loan?: LoanType;
  request?: RequestType;
  emiSchedule?: EMIScheduleType | null;
}

// PaymentOrder - Tracks Razorpay order lifecycle
export interface PaymentOrderType {
  id: string;
  razorpayOrderId: string;
  loanId: string;
  requestId: string;
  emiScheduleId: string;
  customerId: string;
  
  // Amount breakdown (in INR)
  emiAmount: number;
  penalty: number;
  totalAmount: number;
  
  // Status tracking
  status: string; // PAYMENT_ORDER_STATUS
  attempts: number;
  lastAttemptAt: Date | null;
  
  // Payment details (populated after success)
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  paymentMethod: string | null;
  paidAt: Date | null;
  
  // Failure tracking
  failureReason: string | null;
  failureCode: string | null;
  
  // Metadata
  notes: Record<string, unknown> | null;
  expiresAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  loan?: LoanType;
  request?: RequestType;
  emiSchedule?: EMIScheduleType;
}

export interface CommentType {
  id: string;
  requestId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  commentType: string;
  
  // Soft delete
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  request?: RequestType;
  author?: UserType;
}

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
  
  // Soft delete
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  request?: RequestType;
  agent?: UserType | null;
}

export interface DocumentType {
  id: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  documentType: string;
  documentCategory: string;
  requestId: string | null;
  uploadedBy: string;
  uploaderRole?: string | null;
  isPublic: boolean;
  status: string;
  description: string | null;
  displayOrder: number | null;
  metadata: JsonValue | null;
  
  // Soft delete
  deletedAt: Date | null;
  deletedBy: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Runtime fields (not stored in DB)
  url?: string | null;
  urlExpiresAt?: string | null;
  
  // Relations
  request?: RequestType | null;
}

// ------- REQUEST & LOAN TYPES END ----------
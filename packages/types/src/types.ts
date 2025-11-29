import { CONNECTION_STATUS, SERVICE_CONTROL_ACTIONS, SERVICE_NAMES, TEMPLATE_NAMES } from "./constants";

export interface UtilsEnvConfigType {
  redis: {
    host: string;
    port: number;
    url?: string;
  };
}

export interface UserType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  // Districts assigned to the user. Always an array.
  districts: string[];
  isActive: boolean;
}

export interface JWTPayloadType extends UserType {}

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
  actorId: string | null;
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

export interface HistoryEventDescription {
  key: string;
  value: string;
}

// ---------- TEMPLATE RELATED ---------------

// TODO [P-3]: Fix any type usage below
export interface TemplateDefinitionType<T extends TEMPLATE_NAMES> {
  supportedServices: SERVICE_NAMES[];
  defaults?: JobOptionsType;
  getSubject?: (payload: TemplatePayloadMapType[T]) => string;
  renderEmail?: (payload: TemplatePayloadMapType[T]) => Promise<string> | string;
  renderWhatsApp?: (payload: TemplatePayloadMapType[T]) => Promise<string> | string;
}

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

export interface WelcomePayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  supportUrl: string;
  companyUrl: string;
  companyName: string;
  logoUrl: string;
}

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

export type TemplatePayloadMapType = {
  [TEMPLATE_NAMES.OTP_VERIFICATION]: OTPVerificationPayloadType;
  [TEMPLATE_NAMES.WELCOME]: WelcomePayloadType;
  [TEMPLATE_NAMES.LOGIN_ALERT]: LoginAlertPayloadType;
  [TEMPLATE_NAMES.ASSET_PLEDGE]: AssetPledgePayloadType;
  [TEMPLATE_NAMES.EMI_REMINDER]: EMIReminderPayloadType;
  [TEMPLATE_NAMES.EMI_OVERDUE]: EMIOverduePayloadType;
  [TEMPLATE_NAMES.REQUEST_STATUS_NOTIFICATIONS]: RequestStatusNotificationsPayloadType;
  [TEMPLATE_NAMES.REQUEST_SUBMITTED]: RequestSubmittedPayloadType;
};

// -----------TEMPLATE RELATED END-----------

// ------- JOB RELATED --------------
export interface JobOptionsType {
  services?: SERVICE_NAMES[];
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {type: 'fixed' | 'exponential'; delay: number;};
}

export interface AddJobResultType {
  jobId: string | number;
  error?: string;
}

export interface AddJobType<T extends TEMPLATE_NAMES> {
  templateName: T;
  variables: TemplatePayloadMapType[T];
  options?: JobOptionsType;
}

export interface AddServiceControlJobType {
  action: SERVICE_CONTROL_ACTIONS;
  serviceName: SERVICE_NAMES;
  reason?: string;
  triggeredBy?: string;
}

export interface AddServiceStatusJobResultType extends AddJobResultType {}

export interface ServiceStatusJobDataType {
  serviceName: SERVICE_NAMES;
  isActive: boolean;
  connectionStatus: CONNECTION_STATUS;
  lastError?: string;
  timestamp: Date;
}


// ------- JOB RELATED END ----------

// ------- REQUEST & LOAN TYPES ----------

export interface RequestType {
  id: string;
  requestNumber: string | null;
  customerId: string;
  requestedAmount: number;
  district: string;
  currentStatus: string;
  
  // Asset details
  purchaseYear: number | null;
  assetType: string;
  assetBrand: string;
  assetModel: string;
  assetCondition: string;
  AdditionalDescription: string | null;
  
  // Admin Offer Details
  adminOfferedAmount: number | null;
  adminTenureMonths: number | null;
  adminInterestRate: number | null;
  adminEmiSchedule: AdminEMISchedulePreview | null;
  offerMadeDate: Date | null;
  offerResponseDate: Date | null;
  // Processing fee that will be deducted from disbursed amount when loan is disbursed.
  // This does NOT change EMI calculation (EMIs are calculated on adminOfferedAmount).
  adminProcessingFee?: number | null;
  penaltyPercentage: number | null;
  lateFeePercentage: number | null;
  adminRequestedInfo: string | null;
  
  // Bank Details
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  bankAccountName: string | null;
  upiId: string | null;
  bankDetailsSubmittedAt: Date | null;
  
  // Assignment
  assignedAgentId: string | null;
  inspectionScheduledAt: Date | null;
  
  submittedDate: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  customer?: UserType;
  assignedAgent?: UserType | null;
  loan?: LoanType | null;
  documents?: DocumentType[];
  emisSchedule?: EMIScheduleType[];
  payments?: PaymentType[];
  comments?: CommentType[];
  // Whether customers are allowed to post comments on this request. Admins can
  // toggle this at any time; frontend/backend business logic may decide when
  // this is applicable (for example after rejection).
  commentsEnabled?: boolean | null;
  inspections?: InspectionType[];
}

export interface LoanType {
  id: string;
  loanNumber: string | null;
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
  approvedDate: Date | null;
  disbursedDate: Date | null;
  firstEMIDate: Date | null;
  lastEMIDate: Date | null;
  
  // Payment Tracking
  totalPaidAmount: number;
  remainingAmount: number | null;
  paidEMIs: number;
  remainingEMIs: number | null;
  overdueEMIs: number;
  
  // Transfer Details
  transferMethod: string | null;
  transferReference: string | null;
  transferProof: string | null;
  
  // Closure Details
  closedDate: Date | null;
  closureType: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  request?: RequestType;
  emisSchedule?: EMIScheduleType[];
  payments?: PaymentType[];
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
}

export interface PaymentType {
  id: string;
  loanId: string;
  requestId: string;
  emiScheduleId: string | null;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  paymentReference: string | null;
  paidDate: Date;
  processedBy: string | null;
  remarks: string | null;
  receiptPath: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  loan?: LoanType;
  request?: RequestType;
  emiSchedule?: EMIScheduleType | null;
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
  uploaderRole?: string | null; // DOCUMENT_UPLOADER_ROLE enum
  isPublic: boolean;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  status: string;
  description: string | null;
  displayOrder: number | null;
  metadata: any | null; // JSON
  createdAt: Date;
  updatedAt: Date;
  // Optional signed URL (runtime) for direct access to the file. Not stored in DB.
  url?: string | null;
  // When `url` is present this indicates the signed URL expiry timestamp (ISO string)
  urlExpiresAt?: string | null;
  
  // Relations
  request?: RequestType | null;
}

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

// ------- REQUEST & LOAN TYPES END ----------
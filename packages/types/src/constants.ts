
export const ROLES = {
  CUSTOMER: "CUSTOMER",
  DISTRICT_ADMIN: "DISTRICT_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  AGENT: "AGENT",
};

export enum SERVICE_NAMES {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export enum TEMPLATE_NAMES {
  WELCOME = 'WELCOME',
  OTP_VERIFICATION = 'OTP_VERIFICATION',
  LOGIN_ALERT = 'LOGIN_ALERT',
  ASSET_PLEDGE = 'ASSET_PLEDGE',
  EMI_REMINDER = 'EMI_REMINDER',
  EMI_OVERDUE = 'EMI_OVERDUE',
  REQUEST_STATUS_NOTIFICATIONS = 'REQUEST_STATUS_NOTIFICATIONS',
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
};

export enum QUEUE_NAMES {
  EMAIL_QUEUE = 'EMAIL_QUEUE',
  WHATSAPP_QUEUE = 'WHATSAPP_QUEUE',
  EMI_CRON_QUEUE = 'EMI_CRON_QUEUE',
};

export enum JOB_TYPES {
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_WHATSAPP = 'SEND_WHATSAPP',
  SERVICE_CONTROL = 'SERVICE_CONTROL',
}

export enum SERVICE_CONTROL_ACTIONS {
  START = 'START',
  STOP = 'STOP',
  RESTART = 'RESTART',
  DISCONNECT = 'DISCONNECT'
}


export enum CONNECTION_STATUS {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  CONNECTING = 'CONNECTING',
  WAITING_FOR_QR_SCAN = 'WAITING_FOR_QR_SCAN',
  AUTHENTICATED = 'AUTHENTICATED',
  INITIALIZING = 'INITIALIZING',
}

// ----------- REQUEST RELATED -----------

export enum REQUEST_STATUS {
  // ============================================
  // PHASE 1: SUBMISSION & REVIEW
  // ============================================
  PENDING = "PENDING",                      // Customer submitted, waiting for admin
  UNDER_REVIEW = "UNDER_REVIEW",           // Admin reviewing request
  MORE_INFO_REQUIRED = "MORE_INFO_REQUIRED", // Admin needs additional documents
  
  // ============================================
  // PHASE 2: OFFER & NEGOTIATION
  // ============================================
  OFFER_SENT = "OFFER_SENT",               // Admin sent offer to customer
  OFFER_ACCEPTED = "OFFER_ACCEPTED",       // Customer accepted offer
  OFFER_DECLINED = "OFFER_DECLINED",       // Customer declined offer
  OFFER_EXPIRED = "OFFER_EXPIRED",         // Customer didn't respond in time
  
  // ============================================
  // PHASE 3: INSPECTION
  // ============================================
  INSPECTION_SCHEDULED = "INSPECTION_SCHEDULED",     // Agent assigned with date/time
  INSPECTION_RESCHEDULE_REQUESTED = "INSPECTION_RESCHEDULE_REQUESTED", // Customer requested reschedule
  INSPECTION_IN_PROGRESS = "INSPECTION_IN_PROGRESS", // Agent conducting inspection
  INSPECTION_COMPLETED = "INSPECTION_COMPLETED",     // Agent finished inspection
  CUSTOMER_NOT_AVAILABLE = "CUSTOMER_NOT_AVAILABLE", // Customer wasn't at location
  ASSET_MISMATCH = "ASSET_MISMATCH",                 // Asset doesn't match description
  AGENT_NOT_AVAILABLE = "AGENT_NOT_AVAILABLE",       // Agent couldn't make it
  
  // ============================================
  // PHASE 4: APPROVAL & DOCUMENTATION
  // ============================================
  APPROVED = "APPROVED",                         // Agent approved request
  PENDING_SIGNATURE = "PENDING_SIGNATURE",       // Waiting for customer signature
  PENDING_BANK_DETAILS = "PENDING_BANK_DETAILS", // Waiting for UPI/bank details
  
  // ============================================
  // PHASE 5: LOAN PROCESSING & DISBURSEMENT
  // ============================================
  BANK_DETAILS_SUBMITTED = "BANK_DETAILS_SUBMITTED", // Customer submitted, admin will disburse
  TRANSFER_FAILED = "TRANSFER_FAILED",               // Transfer failed, need new details
  AMOUNT_DISBURSED = "AMOUNT_DISBURSED",             // Money successfully sent
  
  // ============================================
  // PHASE 6: ACTIVE LOAN
  // ============================================
  ACTIVE = "ACTIVE",                       // Loan active, customer paying EMIs
  PAYMENT_OVERDUE = "PAYMENT_OVERDUE",     // Customer missed EMI payment
  DEFAULTED = "DEFAULTED",                 // Multiple missed payments
  COMPLETED = "COMPLETED",                 // All EMIs paid successfully
  
  // ============================================
  // TERMINAL STATES
  // ============================================
  REJECTED = "REJECTED",                   // Request rejected
  CANCELLED = "CANCELLED",                 // Request cancelled
}


export enum ASSET_TYPE {
  LAPTOP = "LAPTOP",
  TABLET = "TABLET",
  CAMERA = "CAMERA",
  "GAMING CONSOLE" = "GAMING CONSOLE",
  MOBILE = "MOBILE",
  ELECTRONICS = "ELECTRONICS",
  TV = "TV",
  HOME_APPLIANCE = "HOME_APPLIANCE",
  BICYCLE = "BICYCLE",
  TRUCK = "TRUCK",
  MOTORCYCLE = "MOTORCYCLE",
  CAR = "CAR",
  JEWELRY = "JEWELRY",
  OTHER = "OTHER"
}

export enum ASSET_CONDITION {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR"
}

// Client / frontend shared constants
export const CLIENT_CONSTANTS = {
  // Max length for comments in frontend (also enforce on backend if desired)
  COMMENT_MAX_LENGTH: 300,

  // Max length for admin requested info notes
  MORE_INFO_NOTE_MAX: 500,

  // Signed URL defaults (in seconds)
  SIGNED_URL_EXPIRES: 3600, // 1 hour
  SIGNED_URL_EXPIRES_SHORT: 900, // 15 minutes

  // When remaining expiry is less than this (seconds), client should refresh
  SIGNED_URL_REFRESH_THRESHOLD_SECONDS: 300, // 5 minutes

  // Polling interval for background refresh (ms)
  SIGNED_URL_REFRESH_INTERVAL_MS: 60000, // 60s
};

export const ASSET_TYPE_OPTIONS = [
  { value: "LAPTOP", label: "Laptop" },
  { value: "TABLET", label: "Tablet" },
  { value: "CAMERA", label: "Camera" },
  { value: "GAMING CONSOLE", label: "Gaming Console" },
  { value: "MOBILE", label: "Mobile / Phone" },
  { value: "ELECTRONICS", label: "Electronics (TV, Audio)" },
  { value: "TV", label: "TV" },
  { value: "HOME_APPLIANCE", label: "Home Appliance" },
  { value: "BICYCLE", label: "Bicycle" },
  { value: "TRUCK", label: "Truck" },
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "CAR", label: "Car" },
  { value: "JEWELRY", label: "Jewelry" },
  { value: "OTHER", label: "Other" },
]

export const ASSET_CONDITION_OPTIONS = [
  { value: "EXCELLENT", label: "Excellent - Like new" },
  { value: "GOOD", label: "Good - Minor wear" },
  { value: "FAIR", label: "Fair - Visible wear" },
  { value: "POOR", label: "Poor - Significant wear" },
]

export const DISTRICTS = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Pimpri-Chinchwad",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Faridabad",
]

export const ADMIN_AGENT_ROLES = [ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT];

export const ALLOWED_UPDATE_STATUSES = [
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.OFFER_DECLINED,
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.CANCELLED
];

export const PENDING_REQUEST_STATUSES = [
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

// Statuses where customer action is required
export const CUSTOMER_ACTION_REQUIRED = [
  REQUEST_STATUS.MORE_INFO_REQUIRED,
  REQUEST_STATUS.OFFER_SENT,
  REQUEST_STATUS.PENDING_SIGNATURE,
  REQUEST_STATUS.PENDING_BANK_DETAILS,
  REQUEST_STATUS.TRANSFER_FAILED,
];

// Statuses where admin action is required
export const ADMIN_ACTION_REQUIRED = [
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.UNDER_REVIEW,
  REQUEST_STATUS.OFFER_EXPIRED,
  REQUEST_STATUS.INSPECTION_COMPLETED,
  REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
];

// Statuses where agent action is required
export const AGENT_ACTION_REQUIRED = [
  REQUEST_STATUS.INSPECTION_SCHEDULED,
  REQUEST_STATUS.INSPECTION_IN_PROGRESS,
];

// Statuses where agents should no longer have UI access to the request
// (their responsibility for the request is completed and further steps are admin/customer flows)
export const AGENT_ACCESS_DENY_STATUSES = [
  REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
  REQUEST_STATUS.TRANSFER_FAILED,
  REQUEST_STATUS.AMOUNT_DISBURSED,
  REQUEST_STATUS.ACTIVE,
  REQUEST_STATUS.PAYMENT_OVERDUE,
  REQUEST_STATUS.DEFAULTED,
  REQUEST_STATUS.COMPLETED,
];

// Role-based status transition permissions
export const CUSTOMER_ALLOWED_STATUSES = [
  REQUEST_STATUS.OFFER_ACCEPTED,
  REQUEST_STATUS.OFFER_DECLINED,
  REQUEST_STATUS.CANCELLED,
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.INSPECTION_SCHEDULED,
  REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED,
  REQUEST_STATUS.PENDING_BANK_DETAILS,
  REQUEST_STATUS.BANK_DETAILS_SUBMITTED,
];

export const AGENT_ALLOWED_STATUSES = [
  REQUEST_STATUS.INSPECTION_IN_PROGRESS,
  REQUEST_STATUS.INSPECTION_COMPLETED,
  REQUEST_STATUS.INSPECTION_SCHEDULED,
  REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE,
  REQUEST_STATUS.ASSET_MISMATCH,
  REQUEST_STATUS.AGENT_NOT_AVAILABLE,
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.REJECTED,
];

// Statuses that allow loan creation
export const LOAN_CREATION_ALLOWED_STATUSES = [
  REQUEST_STATUS.OFFER_ACCEPTED,
  REQUEST_STATUS.INSPECTION_COMPLETED,
  REQUEST_STATUS.APPROVED,
];

// Request History Action Types
export enum REQUEST_HISTORY_ACTION {
  OFFER_CREATED = 'OFFER_CREATED',
  OFFER_REVISED = 'OFFER_REVISED',
  ASSIGNED_AGENT = 'ASSIGNED_AGENT',
  LOAN_CREATED = 'LOAN_CREATED',
  STATUS_UPDATED = 'STATUS_UPDATED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  AGREEMENT_GENERATED = 'AGREEMENT_GENERATED',
  SIGNED_AGREEMENT_UPLOADED = 'SIGNED_AGREEMENT_UPLOADED',
  INSPECTION_COMPLETED = 'INSPECTION_COMPLETED',
}

export enum DOCUMENT_CATEGORY {
  ASSET = "ASSET",                    // Asset photos, receipts
  INSPECTION = "INSPECTION",          // Inspection photos taken by agent
  IDENTITY = "IDENTITY",              // ID proofs, address proofs
  INCOME = "INCOME",                  // Salary slips, bank statements
  LEGAL = "LEGAL",                    // Agreements, policies
  PAYMENT = "PAYMENT",                // EMI receipts, payment proofs
  LOAN = "LOAN",                      // Loan agreements, documents
  PROFILE = "PROFILE",                // User profile pictures
  TRANSFER_PROOF = "TRANSFER_PROOF",  // Amount transfer proofs
  OTHER = "OTHER"                     // Miscellaneous
}

export enum DOCUMENT_TYPE {
  ASSET_PHOTO = "ASSET_PHOTO",
  PURCHASE_RECEIPT = "PURCHASE_RECEIPT",
  ID_PROOF = "ID_PROOF",
  ADDRESS_PROOF = "ADDRESS_PROOF",
  INSPECTION_PHOTO = "INSPECTION_PHOTO",
  EMI_RECEIPT = "EMI_RECEIPT",
  TRANSFER_PROOF = "TRANSFER_PROOF",
  LOAN_AGREEMENT = "LOAN_AGREEMENT",
  PROFILE_PICTURE = "PROFILE_PICTURE",
  OTHER = "OTHER"
}

export enum DOCUMENT_STATUS {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED"
}

// Document uploader role categorization (includes system role for stamped uploads)
export enum DOCUMENT_UPLOADER_ROLE {
  USER_SUBMITTED = "USER_SUBMITTED",
  AGENT_SUBMITTED = "AGENT_SUBMITTED",
  ADMIN_SUBMITTED = "ADMIN_SUBMITTED",
  SYSTEM = "SYSTEM"
}

export enum LOAN_STATUS {
  ACTIVE = "ACTIVE",          // Money disbursed, customer paying EMIs
  COMPLETED = "COMPLETED",    // All EMIs paid successfully
  DEFAULTED = "DEFAULTED"     // Customer failed to pay, loan defaulted
}

export enum EMI_STATUS {
  PENDING = "PENDING",
  PAID = "PAID", 
  OVERDUE = "OVERDUE",
  DEFAULTED = "DEFAULTED"
}

// Late fee starts from day 1 (no grace period for daily charges)
export const LATE_FEE_GRACE_PERIOD_DAYS = 0;

export enum INSPECTION_STATUS {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export enum PAYMENT_METHOD {
  RAZORPAY = "RAZORPAY",
  UPI = "UPI",
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
  CARD = "CARD"
}

export enum PAYMENT_STATUS {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED"
}

export enum PAYMENT_TYPE {
  EMI = "EMI",               // Regular EMI payment
  ADVANCE = "ADVANCE",       // Advance payment
  LATE_FEE = "LATE_FEE"     // Late fee/penalty payment (PARTIAL removed)
}

// Penalty Configuration
export const OVERDUE_GRACE_PERIOD_DAYS = 30;
export const DEFAULT_PENALTY_PERCENTAGE = 4;
export const DEFAULT_LATE_FEE_PERCENTAGE = 0.01;

// ----------- REQUEST RELATED END-----------

// ----------- VALIDATION PATTERNS -----------

export const VALIDATION_PATTERNS = {
  // Indian banking validation patterns
  ACCOUNT_NUMBER: /^\d{9,18}$/, // 9-18 digits for Indian bank accounts
  IFSC_CODE: /^[A-Z]{4}0[A-Z0-9]{6}$/, // IFSC format: 4 letters, 0, then 6 alphanumeric
  ACCOUNT_NAME: /^[a-zA-Z\s.]+$/, // Letters, spaces, and periods only
  UPI_ID: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/, // Email-like format for UPI
  PHONE_NUMBER: /^\d{10}$/, // Exactly 10 digits
} as const;

// ----------- VALIDATION PATTERNS END -----------

// ----------- UI CONSTANTS -----------

export const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024; // 4MB in bytes
export const MAX_DOCUMENT_COUNT = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
export const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

export const POLL_INTERVAL_MS = 8000; // 8 seconds
export const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// (Status template defaults were intentionally inlined in the template files)

// Document display messages
export const DOCUMENT_MESSAGES = {
  NO_DOCUMENTS: 'No documents uploaded yet',
  UPLOAD_SUCCESS: 'Document uploaded successfully',
  UPLOAD_ERROR: 'Failed to upload document',
  DELETE_SUCCESS: 'Document deleted successfully',
  DELETE_ERROR: 'Failed to delete document',
} as const;

// Action messages
export const ACTION_MESSAGES = {
  SUCCESS: 'Action completed successfully',
  ERROR: 'Failed to perform action',
  CONFIRM: 'Are you sure you want to proceed?',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NETWORK_ERROR: 'Network error. Please try again.',
} as const;

// Document Type to Category Mapping
export const DOCUMENT_TYPE_TO_CATEGORY: Record<DOCUMENT_TYPE, DOCUMENT_CATEGORY> = {
  [DOCUMENT_TYPE.ASSET_PHOTO]: DOCUMENT_CATEGORY.ASSET,
  [DOCUMENT_TYPE.PURCHASE_RECEIPT]: DOCUMENT_CATEGORY.ASSET,
  [DOCUMENT_TYPE.ID_PROOF]: DOCUMENT_CATEGORY.IDENTITY,
  [DOCUMENT_TYPE.ADDRESS_PROOF]: DOCUMENT_CATEGORY.IDENTITY,
  [DOCUMENT_TYPE.INSPECTION_PHOTO]: DOCUMENT_CATEGORY.INSPECTION,
  [DOCUMENT_TYPE.EMI_RECEIPT]: DOCUMENT_CATEGORY.PAYMENT,
  [DOCUMENT_TYPE.TRANSFER_PROOF]: DOCUMENT_CATEGORY.TRANSFER_PROOF,
  [DOCUMENT_TYPE.LOAN_AGREEMENT]: DOCUMENT_CATEGORY.LEGAL,
  [DOCUMENT_TYPE.PROFILE_PICTURE]: DOCUMENT_CATEGORY.PROFILE,
  [DOCUMENT_TYPE.OTHER]: DOCUMENT_CATEGORY.OTHER,
};

// Category Display Labels
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

// Document Type Display Labels
export const DOCUMENT_TYPE_LABELS: Record<DOCUMENT_TYPE, string> = {
  [DOCUMENT_TYPE.ASSET_PHOTO]: 'Asset Photo',
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

// Document Type Configuration (downloadable flags, icons, etc.)
export const DOCUMENT_TYPE_CONFIG: Record<
  DOCUMENT_TYPE,
  {
    label: string;
    category: DOCUMENT_CATEGORY;
    isDownloadable: boolean;
    icon: string; // lucide icon name
    description: string;
  }
> = {
  [DOCUMENT_TYPE.ASSET_PHOTO]: {
    label: 'Asset Photo',
    category: DOCUMENT_CATEGORY.ASSET,
    isDownloadable: true,
    icon: 'FileImage',
    description: 'Photos of the asset being pledged'
  },
  [DOCUMENT_TYPE.PURCHASE_RECEIPT]: {
    label: 'Purchase Receipt',
    category: DOCUMENT_CATEGORY.ASSET,
    isDownloadable: true,
    icon: 'Receipt',
    description: 'Original purchase receipt or invoice'
  },
  [DOCUMENT_TYPE.ID_PROOF]: {
    label: 'ID Proof',
    category: DOCUMENT_CATEGORY.IDENTITY,
    isDownloadable: false, // Sensitive document
    icon: 'CreditCard',
    description: 'Government issued ID proof'
  },
  [DOCUMENT_TYPE.ADDRESS_PROOF]: {
    label: 'Address Proof',
    category: DOCUMENT_CATEGORY.IDENTITY,
    isDownloadable: false, // Sensitive document
    icon: 'MapPin',
    description: 'Address verification document'
  },
  [DOCUMENT_TYPE.INSPECTION_PHOTO]: {
    label: 'Inspection Photo',
    category: DOCUMENT_CATEGORY.INSPECTION,
    isDownloadable: true,
    icon: 'Camera',
    description: 'Photos taken during asset inspection'
  },
  [DOCUMENT_TYPE.EMI_RECEIPT]: {
    label: 'EMI Receipt',
    category: DOCUMENT_CATEGORY.PAYMENT,
    isDownloadable: true,
    icon: 'Receipt',
    description: 'EMI payment receipt'
  },
  [DOCUMENT_TYPE.TRANSFER_PROOF]: {
    label: 'Transfer Proof',
    category: DOCUMENT_CATEGORY.TRANSFER_PROOF,
    isDownloadable: true,
    icon: 'ArrowRightLeft',
    description: 'Proof of amount transfer'
  },
  [DOCUMENT_TYPE.LOAN_AGREEMENT]: {
    label: 'Loan Agreement',
    category: DOCUMENT_CATEGORY.LEGAL,
    isDownloadable: true,
    icon: 'FileText',
    description: 'Signed loan agreement document'
  },
  [DOCUMENT_TYPE.PROFILE_PICTURE]: {
    label: 'Profile Picture',
    category: DOCUMENT_CATEGORY.PROFILE,
    isDownloadable: false,
    icon: 'User',
    description: 'User profile picture'
  },
  [DOCUMENT_TYPE.OTHER]: {
    label: 'Other Document',
    category: DOCUMENT_CATEGORY.OTHER,
    isDownloadable: true,
    icon: 'File',
    description: 'Miscellaneous document'
  },
};

// Uploader Role Display Labels
export const UPLOADER_ROLE_LABELS: Record<DOCUMENT_UPLOADER_ROLE, string> = {
  [DOCUMENT_UPLOADER_ROLE.USER_SUBMITTED]: 'Customer Uploaded',
  [DOCUMENT_UPLOADER_ROLE.AGENT_SUBMITTED]: 'Agent Uploaded',
  [DOCUMENT_UPLOADER_ROLE.ADMIN_SUBMITTED]: 'Admin Uploaded',
  [DOCUMENT_UPLOADER_ROLE.SYSTEM]: 'System Stamped',
};

// ----------- UI CONSTANTS END -----------
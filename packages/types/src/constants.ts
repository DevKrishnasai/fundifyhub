
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
};

export enum QUEUE_NAMES {
  EMAIL_QUEUE = 'EMAIL_QUEUE',
  WHATSAPP_QUEUE = 'WHATSAPP_QUEUE',
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

export const ASSET_TYPE_OPTIONS = [
  { value: "LAPTOP", label: "Laptop" },
  { value: "TABLET", label: "Tablet" },
  { value: "CAMERA", label: "Camera" },
  { value: "GAMING CONSOLE", label: "Gaming Console" },
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

export enum INSPECTION_STATUS {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

// ----------- REQUEST RELATED END-----------

// ----------- UI CONSTANTS -----------

export const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024; // 4MB in bytes
export const MAX_DOCUMENT_COUNT = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
export const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

export const POLL_INTERVAL_MS = 8000; // 8 seconds
export const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

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

// ----------- UI CONSTANTS END -----------
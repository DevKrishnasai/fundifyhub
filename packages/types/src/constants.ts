
// ============================================
// USER ROLES - Single role per user
// ============================================

export const ROLES = {
  CUSTOMER: "CUSTOMER",
  AGENT: "AGENT",
  DISTRICT_ADMIN: "DISTRICT_ADMIN",
  STATE_ADMIN: "STATE_ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

// Type for role values
export type UserRole = typeof ROLES[keyof typeof ROLES];

// Role hierarchy levels (higher = more access)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [ROLES.CUSTOMER]: 1,
  [ROLES.AGENT]: 2,
  [ROLES.DISTRICT_ADMIN]: 3,
  [ROLES.STATE_ADMIN]: 4,
  [ROLES.SUPER_ADMIN]: 5,
};

// Role display labels
export const ROLE_LABELS: Record<UserRole, string> = {
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.AGENT]: 'Agent',
  [ROLES.DISTRICT_ADMIN]: 'District Admin',
  [ROLES.STATE_ADMIN]: 'State Admin',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
};

// Roles that have admin capabilities
export const ADMIN_ROLES = [ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN] as const;

// Roles that can manage requests
export const REQUEST_MANAGER_ROLES = [ROLES.AGENT, ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN] as const;

export enum SERVICE_NAMES {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export enum TEMPLATE_NAMES {
  WELCOME = 'WELCOME',
  OTP_VERIFICATION = 'OTP_VERIFICATION',
  LOGIN_ALERT = 'LOGIN_ALERT',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ADMIN_USER_CREATED = 'ADMIN_USER_CREATED',
  ASSET_PLEDGE = 'ASSET_PLEDGE',
  EMI_REMINDER = 'EMI_REMINDER',
  EMI_OVERDUE = 'EMI_OVERDUE',
  REQUEST_STATUS_NOTIFICATIONS = 'REQUEST_STATUS_NOTIFICATIONS',
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
};

export enum QUEUE_NAMES {
  EMI_CRON_QUEUE = 'EMI_CRON_QUEUE',
  NOTIFICATION_QUEUE = 'NOTIFICATION_QUEUE',
  SERVICE_CONTROL_QUEUE = 'SERVICE_CONTROL_QUEUE',
}

export enum JOB_TYPES {
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  UPDATE_OVERDUE_EMIS = 'UPDATE_OVERDUE_EMIS',
  SERVICE_CONTROL = 'SERVICE_CONTROL',
}

export enum SERVICE_CONTROL_ACTIONS {
  START = 'START',
  STOP = 'STOP',
  RESTART = 'RESTART',
  DISCONNECT = 'DISCONNECT',
  TEST = 'TEST'
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
  POOR = "POOR",
  DAMAGED = "DAMAGED"
}

// ============================================
// AUCTION ENUMS
// ============================================

export enum AUCTION_STATUS {
  DRAFT = "DRAFT",           // Listing being prepared
  SCHEDULED = "SCHEDULED",   // Auction scheduled for future
  ACTIVE = "ACTIVE",         // Bidding is open
  EXTENDED = "EXTENDED",     // Bidding extended due to last-minute activity
  ENDED = "ENDED",           // Bidding closed, winner determined
  SOLD = "SOLD",             // Payment received, asset transferred
  UNSOLD = "UNSOLD",         // No valid bids received
  CANCELLED = "CANCELLED"    // Auction cancelled by admin
}

export enum BID_STATUS {
  ACTIVE = "ACTIVE",         // Valid, active bid
  OUTBID = "OUTBID",         // Superseded by higher bid
  WINNING = "WINNING",       // Currently the highest bid
  WON = "WON",               // Won the auction
  WITHDRAWN = "WITHDRAWN",   // Bidder withdrew the bid
  REJECTED = "REJECTED",     // Bid rejected by admin (suspicious activity)
  CANCELLED = "CANCELLED"    // Bid cancelled when auction is cancelled
}

export enum MOVEMENT_TYPE {
  INTAKE = "INTAKE",         // Asset received from customer
  TRANSFER = "TRANSFER",     // Moved between warehouses
  AUCTION = "AUCTION",       // Moved for auction
  RELEASE = "RELEASE",       // Returned to customer
  DISPOSAL = "DISPOSAL"      // Asset disposed/scrapped
}

// Auction status display labels
export const AUCTION_STATUS_LABELS: Record<AUCTION_STATUS, string> = {
  [AUCTION_STATUS.DRAFT]: 'Draft',
  [AUCTION_STATUS.SCHEDULED]: 'Scheduled',
  [AUCTION_STATUS.ACTIVE]: 'Active',
  [AUCTION_STATUS.EXTENDED]: 'Extended',
  [AUCTION_STATUS.ENDED]: 'Ended',
  [AUCTION_STATUS.SOLD]: 'Sold',
  [AUCTION_STATUS.UNSOLD]: 'Unsold',
  [AUCTION_STATUS.CANCELLED]: 'Cancelled',
};

// Auction status colors for UI
export const AUCTION_STATUS_COLORS: Record<AUCTION_STATUS, { bg: string; text: string; border: string }> = {
  [AUCTION_STATUS.DRAFT]: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-300' },
  [AUCTION_STATUS.SCHEDULED]: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300' },
  [AUCTION_STATUS.ACTIVE]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-300' },
  [AUCTION_STATUS.EXTENDED]: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300' },
  [AUCTION_STATUS.ENDED]: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300' },
  [AUCTION_STATUS.SOLD]: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300' },
  [AUCTION_STATUS.UNSOLD]: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-300' },
  [AUCTION_STATUS.CANCELLED]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-300' },
};

// Bid status labels
export const BID_STATUS_LABELS: Record<BID_STATUS, string> = {
  [BID_STATUS.ACTIVE]: 'Active',
  [BID_STATUS.OUTBID]: 'Outbid',
  [BID_STATUS.WINNING]: 'Winning',
  [BID_STATUS.WON]: 'Won',
  [BID_STATUS.WITHDRAWN]: 'Withdrawn',
  [BID_STATUS.REJECTED]: 'Rejected',
  [BID_STATUS.CANCELLED]: 'Cancelled',
};

// Movement type labels
export const MOVEMENT_TYPE_LABELS: Record<MOVEMENT_TYPE, string> = {
  [MOVEMENT_TYPE.INTAKE]: 'Received from Customer',
  [MOVEMENT_TYPE.TRANSFER]: 'Warehouse Transfer',
  [MOVEMENT_TYPE.AUCTION]: 'Moved to Auction',
  [MOVEMENT_TYPE.RELEASE]: 'Released to Customer',
  [MOVEMENT_TYPE.DISPOSAL]: 'Disposed',
};

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

/**
 * @deprecated Use geography hierarchy from database (Country → State → District)
 * This is kept for backward compatibility during migration.
 */
export const DISTRICTS = [
  "Hyderabad",
  "Warangal",
  "Nizamabad",
  "Karimnagar",
  "Khammam",
  "Mahbubnagar",
  "Nalgonda",
  "Adilabad",
  "Medak",
  "Rangareddy",
  "Sangareddy",
  "Siddipet",
  "Jagtial",
  "Peddapalli",
  "Mancherial",
  "Kamareddy",
  "Nirmal",
  "Kumuram Bheem",
  "Rajanna Sircilla",
  "Medchal-Malkajgiri",
  "Wanaparthy",
  "Nagarkurnool",
  "Jogulamba Gadwal",
  "Suryapet",
  "Yadadri Bhuvanagiri",
  "Mahabubabad",
  "Bhadradri Kothagudem",
  "Jangaon",
  "Jayashankar Bhupalpally",
  "Mulugu",
  "Narayanpet",
  "Vikarabad",
];

export const ADMIN_AGENT_ROLES = [ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.AGENT] as const;

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
  ADMIN_ASSIGNED = 'ADMIN_ASSIGNED',
  LOAN_CREATED = 'LOAN_CREATED',
  STATUS_UPDATED = 'STATUS_UPDATED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  AGREEMENT_GENERATED = 'AGREEMENT_GENERATED',
  SIGNED_AGREEMENT_UPLOADED = 'SIGNED_AGREEMENT_UPLOADED',
  INSPECTION_COMPLETED = 'INSPECTION_COMPLETED',
  // Payment-related actions
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',
  // EMI status changes (system automated)
  EMI_MARKED_OVERDUE = 'EMI_MARKED_OVERDUE',
  EMI_PENALTY_APPLIED = 'EMI_PENALTY_APPLIED',
  LOAN_MARKED_DEFAULTED = 'LOAN_MARKED_DEFAULTED',
  LOAN_COMPLETED = 'LOAN_COMPLETED',
}

// Request History Action Categories for UI grouping
export enum REQUEST_HISTORY_CATEGORY {
  STATUS = 'STATUS',
  OFFER = 'OFFER',
  DOCUMENT = 'DOCUMENT',
  PAYMENT = 'PAYMENT',
  INSPECTION = 'INSPECTION',
  LOAN = 'LOAN',
  COMMENT = 'COMMENT',
}

// UI Configuration for Request History Actions
// Maps each action to its display properties (icon name from lucide-react, color class, label, category)
export const REQUEST_HISTORY_ACTION_CONFIG: Record<
  REQUEST_HISTORY_ACTION,
  {
    label: string;
    icon: string;
    colorClass: string; // Tailwind color classes
    bgClass: string; // Background color for icon container
    category: REQUEST_HISTORY_CATEGORY;
    isAutomated: boolean; // Whether this action is system-automated
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

// Helper to get label for unknown actions
export const getRequestHistoryActionLabel = (action: string): string => {
  const config = REQUEST_HISTORY_ACTION_CONFIG[action as REQUEST_HISTORY_ACTION];
  if (config) return config.label;
  // Fallback: convert SNAKE_CASE to Title Case
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

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
  ASSET_DOCUMENT = "ASSET_DOCUMENT",     // Warranty cards, bills, receipts, etc.
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

// Payment Order Status - Tracks Razorpay order lifecycle
export enum PAYMENT_ORDER_STATUS {
  CREATED = "CREATED",       // Order created, awaiting payment attempt
  ATTEMPTED = "ATTEMPTED",   // Customer opened Razorpay checkout
  PAID = "PAID",             // Payment successful
  FAILED = "FAILED",         // Payment failed
  EXPIRED = "EXPIRED"        // Order expired (not paid within ~30 min)
}

// Asset Status - Collateral lifecycle
export enum ASSET_STATUS {
  PLEDGED = "PLEDGED",           // Asset is currently pledged against a loan
  RELEASED = "RELEASED",         // Asset returned to customer after loan completion
  IN_AUCTION = "IN_AUCTION",     // Asset is in auction process
  FORFEITED = "FORFEITED",       // Asset forfeited due to loan default
  AUCTIONED = "AUCTIONED",       // Asset sold through auction
  SOLD = "SOLD"                  // Asset was sold in auction
}

// Offer Status - Admin offer lifecycle
export enum OFFER_STATUS {
  PENDING = "PENDING",           // Offer sent, awaiting customer response
  ACCEPTED = "ACCEPTED",         // Customer accepted the offer
  DECLINED = "DECLINED",         // Customer declined the offer
  EXPIRED = "EXPIRED",           // Offer expired without response
  REVISED = "REVISED",           // Offer was superseded by a new offer
  CANCELLED = "CANCELLED"        // Admin cancelled the offer
}

// Razorpay order expiry time in minutes
export const RAZORPAY_ORDER_EXPIRY_MINUTES = 30;

// Penalty Configuration
export const OVERDUE_GRACE_PERIOD_DAYS = 30;
export const DEFAULT_PENALTY_PERCENTAGE = 4;
export const DEFAULT_LATE_FEE_PERCENTAGE = 0.01;

// Payment Processing Configuration
export const PAYMENT_PROCESSING_CONFIG = {
  /** Maximum retry attempts for webhook processing */
  MAX_WEBHOOK_RETRIES: 5,
  /** Webhook retry delay in milliseconds (exponential backoff base) */
  WEBHOOK_RETRY_BASE_DELAY_MS: 1000,
  /** Order expiry check buffer in minutes */
  ORDER_EXPIRY_BUFFER_MINUTES: 5,
} as const;

// Razorpay Webhook Event Types (for type-safe event handling)
export enum RAZORPAY_WEBHOOK_EVENT {
  PAYMENT_CAPTURED = 'payment.captured',
  PAYMENT_AUTHORIZED = 'payment.authorized',
  PAYMENT_FAILED = 'payment.failed',
  ORDER_PAID = 'order.paid',
  REFUND_CREATED = 'refund.created',
}

// EMI Payment Info - Status indicators for UI
export enum EMI_PAYMENT_AVAILABILITY {
  /** EMI can be paid normally */
  AVAILABLE = 'AVAILABLE',
  /** EMI already paid */
  PAID = 'PAID',
  /** EMI has penalties accumulated (can still be paid) */
  AVAILABLE_WITH_PENALTY = 'AVAILABLE_WITH_PENALTY',
}

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
  [DOCUMENT_TYPE.ASSET_DOCUMENT]: DOCUMENT_CATEGORY.ASSET,
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
  [DOCUMENT_TYPE.ASSET_DOCUMENT]: {
    label: 'Asset Document',
    category: DOCUMENT_CATEGORY.ASSET,
    isDownloadable: true,
    icon: 'FileText',
    description: 'Warranty cards, bills, receipts related to the asset'
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

// ----------- RBAC PERMISSIONS -----------

// Permission definitions for role-based access control
export enum PERMISSION {
  // Request permissions
  VIEW_OWN_REQUESTS = 'VIEW_OWN_REQUESTS',
  VIEW_ALL_REQUESTS = 'VIEW_ALL_REQUESTS',
  VIEW_DISTRICT_REQUESTS = 'VIEW_DISTRICT_REQUESTS',
  CREATE_REQUEST = 'CREATE_REQUEST',
  UPDATE_REQUEST_STATUS = 'UPDATE_REQUEST_STATUS',
  ASSIGN_AGENT = 'ASSIGN_AGENT',
  CREATE_OFFER = 'CREATE_OFFER',
  
  // User permissions
  VIEW_OWN_PROFILE = 'VIEW_OWN_PROFILE',
  UPDATE_OWN_PROFILE = 'UPDATE_OWN_PROFILE',
  VIEW_ALL_USERS = 'VIEW_ALL_USERS',
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  MANAGE_USER_ROLES = 'MANAGE_USER_ROLES',
  
  // Document permissions
  UPLOAD_DOCUMENT = 'UPLOAD_DOCUMENT',
  VIEW_DOCUMENT = 'VIEW_DOCUMENT',
  DELETE_DOCUMENT = 'DELETE_DOCUMENT',
  VERIFY_DOCUMENT = 'VERIFY_DOCUMENT',
  
  // Loan permissions
  VIEW_OWN_LOANS = 'VIEW_OWN_LOANS',
  VIEW_ALL_LOANS = 'VIEW_ALL_LOANS',
  CREATE_LOAN = 'CREATE_LOAN',
  DISBURSE_LOAN = 'DISBURSE_LOAN',
  
  // Payment permissions
  MAKE_PAYMENT = 'MAKE_PAYMENT',
  VIEW_ALL_PAYMENTS = 'VIEW_ALL_PAYMENTS',
  RECORD_PAYMENT = 'RECORD_PAYMENT',
  
  // Inspection permissions
  VIEW_ASSIGNED_INSPECTIONS = 'VIEW_ASSIGNED_INSPECTIONS',
  COMPLETE_INSPECTION = 'COMPLETE_INSPECTION',
  
  // Admin permissions
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  MANAGE_SERVICES = 'MANAGE_SERVICES',
  
  // Comment permissions
  ADD_COMMENT = 'ADD_COMMENT',
  VIEW_INTERNAL_COMMENTS = 'VIEW_INTERNAL_COMMENTS',
}

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<string, PERMISSION[]> = {
  [ROLES.CUSTOMER]: [
    PERMISSION.VIEW_OWN_REQUESTS,
    PERMISSION.CREATE_REQUEST,
    PERMISSION.VIEW_OWN_PROFILE,
    PERMISSION.UPDATE_OWN_PROFILE,
    PERMISSION.UPLOAD_DOCUMENT,
    PERMISSION.VIEW_DOCUMENT,
    PERMISSION.VIEW_OWN_LOANS,
    PERMISSION.MAKE_PAYMENT,
    PERMISSION.ADD_COMMENT,
  ],
  [ROLES.AGENT]: [
    PERMISSION.VIEW_ASSIGNED_INSPECTIONS,
    PERMISSION.COMPLETE_INSPECTION,
    PERMISSION.VIEW_OWN_PROFILE,
    PERMISSION.UPDATE_OWN_PROFILE,
    PERMISSION.UPLOAD_DOCUMENT,
    PERMISSION.VIEW_DOCUMENT,
    PERMISSION.UPDATE_REQUEST_STATUS,
    PERMISSION.ADD_COMMENT,
    PERMISSION.VIEW_INTERNAL_COMMENTS,
  ],
  [ROLES.DISTRICT_ADMIN]: [
    PERMISSION.VIEW_DISTRICT_REQUESTS,
    PERMISSION.UPDATE_REQUEST_STATUS,
    PERMISSION.ASSIGN_AGENT,
    PERMISSION.CREATE_OFFER,
    PERMISSION.VIEW_OWN_PROFILE,
    PERMISSION.UPDATE_OWN_PROFILE,
    PERMISSION.VIEW_ALL_USERS,
    PERMISSION.UPLOAD_DOCUMENT,
    PERMISSION.VIEW_DOCUMENT,
    PERMISSION.VERIFY_DOCUMENT,
    PERMISSION.VIEW_ALL_LOANS,
    PERMISSION.CREATE_LOAN,
    PERMISSION.DISBURSE_LOAN,
    PERMISSION.VIEW_ALL_PAYMENTS,
    PERMISSION.RECORD_PAYMENT,
    PERMISSION.VIEW_ANALYTICS,
    PERMISSION.ADD_COMMENT,
    PERMISSION.VIEW_INTERNAL_COMMENTS,
  ],
  [ROLES.STATE_ADMIN]: [
    // State admin has all district admin permissions plus state-level management
    PERMISSION.VIEW_DISTRICT_REQUESTS,
    PERMISSION.VIEW_ALL_REQUESTS,
    PERMISSION.UPDATE_REQUEST_STATUS,
    PERMISSION.ASSIGN_AGENT,
    PERMISSION.CREATE_OFFER,
    PERMISSION.VIEW_OWN_PROFILE,
    PERMISSION.UPDATE_OWN_PROFILE,
    PERMISSION.VIEW_ALL_USERS,
    PERMISSION.CREATE_USER,
    PERMISSION.UPDATE_USER,
    PERMISSION.UPLOAD_DOCUMENT,
    PERMISSION.VIEW_DOCUMENT,
    PERMISSION.VERIFY_DOCUMENT,
    PERMISSION.VIEW_ALL_LOANS,
    PERMISSION.CREATE_LOAN,
    PERMISSION.DISBURSE_LOAN,
    PERMISSION.VIEW_ALL_PAYMENTS,
    PERMISSION.RECORD_PAYMENT,
    PERMISSION.VIEW_ANALYTICS,
    PERMISSION.VIEW_AUDIT_LOGS,
    PERMISSION.ADD_COMMENT,
    PERMISSION.VIEW_INTERNAL_COMMENTS,
  ],
  [ROLES.SUPER_ADMIN]: [
    // Super admin has all permissions
    ...Object.values(PERMISSION),
  ],
};

// Helper to check if role has permission
export const hasPermission = (role: string | string[], permission: PERMISSION): boolean => {
  const roles = Array.isArray(role) ? role : [role];
  return roles.some(r => ROLE_PERMISSIONS[r]?.includes(permission));
};

// Helper to get all permissions for roles
export const getPermissionsForRoles = (roles: string[]): PERMISSION[] => {
  const permissions = new Set<PERMISSION>();
  roles.forEach(role => {
    ROLE_PERMISSIONS[role]?.forEach(p => permissions.add(p));
  });
  return Array.from(permissions);
};

// ----------- RBAC PERMISSIONS END -----------

// ----------- NAVIGATION CONSTANTS -----------

// Navigation menu items configuration
export interface NavMenuItem {
  label: string;
  href: string;
  icon: string; // lucide-react icon name
  permissions?: PERMISSION[]; // Required permissions (any of these)
  roles?: string[]; // Required roles (any of these)
  badge?: string; // Optional badge text
}

// Unified navigation - items shown based on user role
export const NAV_ITEMS: NavMenuItem[] = [
  { 
    label: 'Dashboard', 
    href: '/dashboard', 
    icon: 'LayoutDashboard',
  },
  { 
    label: 'Requests', 
    href: '/requests', 
    icon: 'FileText',
  },
  { 
    label: 'Upload Asset', 
    href: '/submit-request', 
    icon: 'Upload',
    roles: [ROLES.CUSTOMER],
  },
  { 
    label: 'Users', 
    href: '/users', 
    icon: 'Users',
    roles: [ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN, ROLES.DISTRICT_ADMIN],
    permissions: [PERMISSION.VIEW_ALL_USERS],
  },
  { 
    label: 'Geography', 
    href: '/geography', 
    icon: 'MapPin',
    roles: [ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN],
  },
  { 
    label: 'Assets', 
    href: '/assets', 
    icon: 'Package',
    roles: [ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN, ROLES.DISTRICT_ADMIN],
  },
  { 
    label: 'Auctions', 
    href: '/auctions', 
    icon: 'Gavel',
    // Visible to all roles - customers can bid, admins can manage
  },
  { 
    label: 'Analytics', 
    href: '/analytics', 
    icon: 'BarChart3',
    roles: [ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN, ROLES.DISTRICT_ADMIN],
    permissions: [PERMISSION.VIEW_ANALYTICS],
  },
  { 
    label: 'Audit Logs', 
    href: '/audit-logs', 
    icon: 'ScrollText',
    roles: [ROLES.SUPER_ADMIN, ROLES.STATE_ADMIN],
    permissions: [PERMISSION.VIEW_AUDIT_LOGS],
  },
  { 
    label: 'Settings', 
    href: '/settings', 
    icon: 'Settings',
  },
  { 
    label: 'Notifications', 
    href: '/notifications', 
    icon: 'Bell',
  },
];

// ----------- NAVIGATION CONSTANTS END -----------

// ----------- STATUS DISPLAY CONSTANTS -----------

// Status badge color mapping for consistent UI
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

// Status display labels (user-friendly names)
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

// Status descriptions for tooltips
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

// Status icons (lucide-react icon names)
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

// Workflow phases for progress tracking
export enum REQUEST_PHASE {
  SUBMISSION = 'SUBMISSION',
  OFFER = 'OFFER',
  INSPECTION = 'INSPECTION',
  APPROVAL = 'APPROVAL',
  DISBURSEMENT = 'DISBURSEMENT',
  REPAYMENT = 'REPAYMENT',
}

// Phase display labels
export const REQUEST_PHASE_LABELS: Record<REQUEST_PHASE, string> = {
  [REQUEST_PHASE.SUBMISSION]: 'Submit',
  [REQUEST_PHASE.OFFER]: 'Offer',
  [REQUEST_PHASE.INSPECTION]: 'Inspect',
  [REQUEST_PHASE.APPROVAL]: 'Approve',
  [REQUEST_PHASE.DISBURSEMENT]: 'Disburse',
  [REQUEST_PHASE.REPAYMENT]: 'Repay',
};

// Map status to phase
export const REQUEST_STATUS_PHASE: Record<REQUEST_STATUS, REQUEST_PHASE> = {
  [REQUEST_STATUS.PENDING]: REQUEST_PHASE.SUBMISSION,
  [REQUEST_STATUS.UNDER_REVIEW]: REQUEST_PHASE.SUBMISSION,
  [REQUEST_STATUS.MORE_INFO_REQUIRED]: REQUEST_PHASE.SUBMISSION,
  [REQUEST_STATUS.OFFER_SENT]: REQUEST_PHASE.OFFER,
  [REQUEST_STATUS.OFFER_ACCEPTED]: REQUEST_PHASE.OFFER,
  [REQUEST_STATUS.OFFER_DECLINED]: REQUEST_PHASE.OFFER,
  [REQUEST_STATUS.OFFER_EXPIRED]: REQUEST_PHASE.OFFER,
  [REQUEST_STATUS.INSPECTION_SCHEDULED]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.INSPECTION_RESCHEDULE_REQUESTED]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.INSPECTION_IN_PROGRESS]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.INSPECTION_COMPLETED]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.CUSTOMER_NOT_AVAILABLE]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.ASSET_MISMATCH]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.AGENT_NOT_AVAILABLE]: REQUEST_PHASE.INSPECTION,
  [REQUEST_STATUS.APPROVED]: REQUEST_PHASE.APPROVAL,
  [REQUEST_STATUS.PENDING_SIGNATURE]: REQUEST_PHASE.APPROVAL,
  [REQUEST_STATUS.PENDING_BANK_DETAILS]: REQUEST_PHASE.DISBURSEMENT,
  [REQUEST_STATUS.BANK_DETAILS_SUBMITTED]: REQUEST_PHASE.DISBURSEMENT,
  [REQUEST_STATUS.TRANSFER_FAILED]: REQUEST_PHASE.DISBURSEMENT,
  [REQUEST_STATUS.AMOUNT_DISBURSED]: REQUEST_PHASE.DISBURSEMENT,
  [REQUEST_STATUS.ACTIVE]: REQUEST_PHASE.REPAYMENT,
  [REQUEST_STATUS.PAYMENT_OVERDUE]: REQUEST_PHASE.REPAYMENT,
  [REQUEST_STATUS.DEFAULTED]: REQUEST_PHASE.REPAYMENT,
  [REQUEST_STATUS.COMPLETED]: REQUEST_PHASE.REPAYMENT,
  [REQUEST_STATUS.REJECTED]: REQUEST_PHASE.SUBMISSION,
  [REQUEST_STATUS.CANCELLED]: REQUEST_PHASE.SUBMISSION,
};

// Get phase number (1-6) for progress bar
export const getPhaseNumber = (status: REQUEST_STATUS): number => {
  const phaseOrder: REQUEST_PHASE[] = [
    REQUEST_PHASE.SUBMISSION,
    REQUEST_PHASE.OFFER,
    REQUEST_PHASE.INSPECTION,
    REQUEST_PHASE.APPROVAL,
    REQUEST_PHASE.DISBURSEMENT,
    REQUEST_PHASE.REPAYMENT,
  ];
  const phase = REQUEST_STATUS_PHASE[status];
  return phaseOrder.indexOf(phase) + 1;
};

// ----------- STATUS DISPLAY CONSTANTS END -----------

// ----------- AUDIT LOGGING CONSTANTS -----------

// Audit action types for tracking system operations
export enum AUDIT_ACTION {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  
  // User management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  
  // Request operations
  REQUEST_CREATED = 'REQUEST_CREATED',
  REQUEST_UPDATED = 'REQUEST_UPDATED',
  REQUEST_STATUS_CHANGED = 'REQUEST_STATUS_CHANGED',
  REQUEST_DELETED = 'REQUEST_DELETED',
  
  // Offer operations
  OFFER_CREATED = 'OFFER_CREATED',
  OFFER_UPDATED = 'OFFER_UPDATED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_DECLINED = 'OFFER_DECLINED',
  
  // Inspection operations
  AGENT_ASSIGNED = 'AGENT_ASSIGNED',
  ADMIN_ASSIGNED = 'ADMIN_ASSIGNED',
  INSPECTION_SCHEDULED = 'INSPECTION_SCHEDULED',
  INSPECTION_STARTED = 'INSPECTION_STARTED',
  INSPECTION_COMPLETED = 'INSPECTION_COMPLETED',
  
  // Loan operations
  LOAN_CREATED = 'LOAN_CREATED',
  LOAN_DISBURSED = 'LOAN_DISBURSED',
  LOAN_STATUS_CHANGED = 'LOAN_STATUS_CHANGED',
  LOAN_COMPLETED = 'LOAN_COMPLETED',
  LOAN_DEFAULTED = 'LOAN_DEFAULTED',
  
  // Payment operations
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  
  // Document operations
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  
  // System operations
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  SERVICE_STARTED = 'SERVICE_STARTED',
  SERVICE_STOPPED = 'SERVICE_STOPPED',
  
  // Comments
  COMMENT_ADDED = 'COMMENT_ADDED',
  COMMENT_DELETED = 'COMMENT_DELETED',
}

// Entity types for audit logs
export enum AUDIT_ENTITY_TYPE {
  USER = 'USER',
  REQUEST = 'REQUEST',
  LOAN = 'LOAN',
  PAYMENT = 'PAYMENT',
  EMI = 'EMI',
  DOCUMENT = 'DOCUMENT',
  OFFER = 'OFFER',
  INSPECTION = 'INSPECTION',
  COMMENT = 'COMMENT',
  SETTINGS = 'SETTINGS',
  SERVICE = 'SERVICE',
  SESSION = 'SESSION',
}

// Audit log status
export enum AUDIT_STATUS {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
}

// Audit action severity levels for filtering/display
export const AUDIT_ACTION_SEVERITY: Record<AUDIT_ACTION, 'info' | 'warning' | 'error' | 'success'> = {
  // Authentication - info/warning
  [AUDIT_ACTION.LOGIN]: 'info',
  [AUDIT_ACTION.LOGOUT]: 'info',
  [AUDIT_ACTION.LOGIN_FAILED]: 'warning',
  [AUDIT_ACTION.PASSWORD_CHANGED]: 'info',
  [AUDIT_ACTION.PASSWORD_RESET_REQUESTED]: 'info',
  [AUDIT_ACTION.PASSWORD_RESET_COMPLETED]: 'info',
  
  // User management
  [AUDIT_ACTION.USER_CREATED]: 'success',
  [AUDIT_ACTION.USER_UPDATED]: 'info',
  [AUDIT_ACTION.USER_DELETED]: 'warning',
  [AUDIT_ACTION.USER_ROLE_CHANGED]: 'warning',
  [AUDIT_ACTION.USER_ACTIVATED]: 'success',
  [AUDIT_ACTION.USER_DEACTIVATED]: 'warning',
  
  // Request operations
  [AUDIT_ACTION.REQUEST_CREATED]: 'success',
  [AUDIT_ACTION.REQUEST_UPDATED]: 'info',
  [AUDIT_ACTION.REQUEST_STATUS_CHANGED]: 'info',
  [AUDIT_ACTION.REQUEST_DELETED]: 'warning',
  
  // Offer operations
  [AUDIT_ACTION.OFFER_CREATED]: 'info',
  [AUDIT_ACTION.OFFER_UPDATED]: 'info',
  [AUDIT_ACTION.OFFER_ACCEPTED]: 'success',
  [AUDIT_ACTION.OFFER_DECLINED]: 'warning',
  
  // Inspection
  [AUDIT_ACTION.AGENT_ASSIGNED]: 'info',
  [AUDIT_ACTION.ADMIN_ASSIGNED]: 'info',
  [AUDIT_ACTION.INSPECTION_SCHEDULED]: 'info',
  [AUDIT_ACTION.INSPECTION_STARTED]: 'info',
  [AUDIT_ACTION.INSPECTION_COMPLETED]: 'success',
  
  // Loan operations
  [AUDIT_ACTION.LOAN_CREATED]: 'success',
  [AUDIT_ACTION.LOAN_DISBURSED]: 'success',
  [AUDIT_ACTION.LOAN_STATUS_CHANGED]: 'info',
  [AUDIT_ACTION.LOAN_COMPLETED]: 'success',
  [AUDIT_ACTION.LOAN_DEFAULTED]: 'error',
  
  // Payments
  [AUDIT_ACTION.PAYMENT_INITIATED]: 'info',
  [AUDIT_ACTION.PAYMENT_COMPLETED]: 'success',
  [AUDIT_ACTION.PAYMENT_FAILED]: 'error',
  [AUDIT_ACTION.PAYMENT_REFUNDED]: 'warning',
  
  // Documents
  [AUDIT_ACTION.DOCUMENT_UPLOADED]: 'info',
  [AUDIT_ACTION.DOCUMENT_DELETED]: 'warning',
  [AUDIT_ACTION.DOCUMENT_VERIFIED]: 'success',
  
  // System
  [AUDIT_ACTION.SETTINGS_UPDATED]: 'warning',
  [AUDIT_ACTION.SERVICE_STARTED]: 'success',
  [AUDIT_ACTION.SERVICE_STOPPED]: 'warning',
  
  // Comments
  [AUDIT_ACTION.COMMENT_ADDED]: 'info',
  [AUDIT_ACTION.COMMENT_DELETED]: 'warning',
};

// ----------- AUDIT LOGGING CONSTANTS END -----------

// ----------- MODAL CONSTANTS -----------

// Modal component names for ActionModalManager
export enum MODAL_COMPONENTS {
  CREATE_OFFER_MODAL = 'CreateOfferModal',
  ASSIGN_AGENT_MODAL = 'AssignAgentModal',
  ASSIGN_ADMIN_MODAL = 'AssignAdminModal',
  REJECT_MODAL = 'RejectModal',
  APPROVE_MODAL = 'ApproveModal',
  DISBURSEMENT_MODAL = 'DisbursementModal',
  OFFER_DECLINE_MODAL = 'OfferDeclineModal',
  CANCEL_WITHDRAW_MODAL = 'CancelWithdrawModal',
  REQUEST_INFO_MODAL = 'RequestInfoModal',
  REQUEST_BANK_DETAILS_MODAL = 'RequestBankDetailsModal',
  BANK_DETAILS_MODAL = 'BankDetailsModal',
  RESCHEDULE_MODAL = 'RescheduleModal',
  COMPLETE_INSPECTION_MODAL = 'CompleteInspectionModal',
  AGENT_ISSUE_MODAL = 'AgentIssueModal',
  REFUSE_SIGNATURE_MODAL = 'RefuseSignatureModal',
  EXPLANATION_MODAL = 'ExplanationModal',
}

// Agent issue types for AgentIssueModal
export enum AGENT_ISSUE_TYPES {
  CUSTOMER_NOT_AVAILABLE = 'customer-not-available',
  AGENT_NOT_AVAILABLE = 'agent-not-available',
}

// ----------- MODAL CONSTANTS END -----------

// ----------- LOCAL STORAGE CONSTANTS -----------

// Local storage keys
export const LOCAL_STORAGE_KEYS = {
  INSPECTION_PHOTOS: (requestId: string) => `fundifyhub_inspection_photos_${requestId}`,
} as const;

// ----------- LOCAL STORAGE CONSTANTS END -----------

// ----------- OFFER FORM CONSTANTS -----------

// Default values for offer form
export const OFFER_FORM_DEFAULTS = {
  PENALTY_PERCENTAGE: 4,
  LATE_FEE_PERCENTAGE: 0.01,
  PROCESSING_FEE: 0,
} as const;

// Constraints for offer form
export const OFFER_FORM_CONSTRAINTS = {
  MAX_TENURE_MONTHS: 60,
  MAX_INTEREST_RATE: 36,
  MIN_AMOUNT: 0,
  MIN_TENURE: 1,
  MIN_INTEREST_RATE: 0,
} as const;

// ----------- OFFER FORM CONSTANTS END -----------

// ----------- RATE LIMITING CONSTANTS -----------

// Rate limiting configurations (milliseconds and request counts)
export const RATE_LIMIT_CONFIG = {
  // General API rate limits
  GENERAL: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 100,         // 100 requests per minute
  },
  
  // Authentication endpoints (stricter)
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,          // 10 attempts per 15 minutes
  },
  
  // OTP/verification endpoints (very strict)
  OTP: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 3,           // 3 requests per minute
  },
  
  // File upload endpoints
  UPLOAD: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 10,          // 10 uploads per minute
  },
  
  // Payment endpoints
  PAYMENT: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 20,          // 20 payment requests per minute
  },
  
  // Admin endpoints (more lenient)
  ADMIN: {
    windowMs: 60 * 1000,      // 1 minute
    maxRequests: 200,         // 200 requests per minute
  },
} as const;

// ----------- RATE LIMITING CONSTANTS END -----------

// ----------- CACHING CONSTANTS -----------

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  /** Short-lived cache (60 seconds) - frequently changing data */
  SHORT: 60,
  
  /** Medium cache (5 minutes) - moderately changing data */
  MEDIUM: 300,
  
  /** Long cache (30 minutes) - rarely changing data */
  LONG: 1800,
  
  /** Dashboard stats cache (2 minutes) */
  DASHBOARD: 120,
  
  /** User session data cache (15 minutes) */
  SESSION: 900,
  
  /** Static data cache (1 hour) */
  STATIC: 3600,
} as const;

// Cache key prefixes for organized cache management
export const CACHE_KEY_PREFIX = {
  DASHBOARD: 'dashboard:',
  USER: 'user:',
  REQUEST: 'request:',
  LOAN: 'loan:',
  STATS: 'stats:',
  SESSION: 'session:',
} as const;

// Rate limit key prefix
export const RATE_LIMIT_PREFIX = 'fundifyhub:ratelimit:';

// ----------- CACHING CONSTANTS END -----------

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
  PENDING = "PENDING",                      // Submitted, waiting for admin review
  UNDER_REVIEW = "UNDER_REVIEW",           // Admin is reviewing
  OFFER_MADE = "OFFER_MADE",               // Admin made an offer, waiting for customer response
  OFFER_ACCEPTED = "OFFER_ACCEPTED",       // Customer accepted the offer
  OFFER_REJECTED = "OFFER_REJECTED",       // Customer rejected, request closed
  INSPECTION_SCHEDULED = "INSPECTION_SCHEDULED", // Inspection scheduled, agent assigned
  INSPECTION_IN_PROGRESS = "INSPECTION_IN_PROGRESS", // Agent conducting inspection
  INSPECTION_COMPLETED = "INSPECTION_COMPLETED",     // Inspection done, waiting for agent decision
  APPROVED = "APPROVED",                   // Agent approved after inspection
  REJECTED = "REJECTED",                   // Agent rejected after inspection
  LOAN_PROCESSING = "LOAN_PROCESSING",     // Processing loan sanction
  AMOUNT_TRANSFERRED = "AMOUNT_TRANSFERRED", // Amount transferred to customer
  COMPLETED = "COMPLETED",                 // Process completed
  CANCELLED = "CANCELLED"                  // Request cancelled
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

export enum DOCUMENT_CATEGORY {
  ASSET = "ASSET",                    // Asset photos, receipts
  INSPECTION = "INSPECTION",          // Inspection photos taken by agent
  IDENTITY = "IDENTITY",              // ID proofs, address proofs
  INCOME = "INCOME",                  // Salary slips, bank statements
  LEGAL = "LEGAL",                    // Agreements, policies
  TRANSFER_PROOF = "TRANSFER_PROOF",  // Amount transfer proofs
  OTHER = "OTHER"                     // Miscellaneous
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
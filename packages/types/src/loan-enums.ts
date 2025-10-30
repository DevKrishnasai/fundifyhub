// Loan Application System Enums
// These enums are used across the entire monorepo

export enum UserRole {
  CUSTOMER = "CUSTOMER",
  DISTRICT_ADMIN = "DISTRICT_ADMIN", 
  AGENT = "AGENT",
  SUPER_ADMIN = "SUPER_ADMIN"
}

export enum RequestStatus {
  DRAFT = "DRAFT",                          // Customer is still filling details
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

export enum AssetType {
  VEHICLE = "VEHICLE",
  PROPERTY = "PROPERTY",
  MACHINERY = "MACHINERY", 
  JEWELRY = "JEWELRY",
  ELECTRONICS = "ELECTRONICS",
  OTHER = "OTHER"
}

export enum AssetCondition {
  EXCELLENT = "EXCELLENT",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR"
}

export enum DocumentCategory {
  ASSET = "ASSET",                    // Asset photos, receipts
  INSPECTION = "INSPECTION",          // Inspection photos taken by agent
  IDENTITY = "IDENTITY",              // ID proofs, address proofs
  INCOME = "INCOME",                  // Salary slips, bank statements
  LEGAL = "LEGAL",                    // Agreements, policies
  TRANSFER_PROOF = "TRANSFER_PROOF",  // Amount transfer proofs
  OTHER = "OTHER"                     // Miscellaneous
}

export enum LoanStatus {
  PENDING = "PENDING",        // Loan application pending
  APPROVED = "APPROVED",      // Loan approved, ready for disbursal
  ACTIVE = "ACTIVE",          // Money disbursed, customer paying EMIs
  COMPLETED = "COMPLETED",    // All EMIs paid successfully
  DEFAULTED = "DEFAULTED"     // Customer failed to pay, loan defaulted
}

export enum EMIStatus {
  PENDING = "PENDING",
  PAID = "PAID", 
  OVERDUE = "OVERDUE",
  DEFAULTED = "DEFAULTED"
}

export enum InspectionStatus {
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}


// Type helpers for validation and type safety
export type UserRoleType = keyof typeof UserRole;
export type RequestStatusType = keyof typeof RequestStatus;
export type AssetTypeType = keyof typeof AssetType;
export type AssetConditionType = keyof typeof AssetCondition;
export type DocumentCategoryType = keyof typeof DocumentCategory;
export type LoanStatusType = keyof typeof LoanStatus;
export type EMIStatusType = keyof typeof EMIStatus;
export type InspectionStatusType = keyof typeof InspectionStatus;

// Utility functions for enum validation
export const isValidUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

export const isValidRequestStatus = (status: string): status is RequestStatus => {
  return Object.values(RequestStatus).includes(status as RequestStatus);
};

export const isValidAssetType = (type: string): type is AssetType => {
  return Object.values(AssetType).includes(type as AssetType);
};

export const isValidAssetCondition = (condition: string): condition is AssetCondition => {
  return Object.values(AssetCondition).includes(condition as AssetCondition);
};

export const isValidDocumentCategory = (category: string): category is DocumentCategory => {
  return Object.values(DocumentCategory).includes(category as DocumentCategory);
};

export const isValidLoanStatus = (status: string): status is LoanStatus => {
  return Object.values(LoanStatus).includes(status as LoanStatus);
};

export const isValidEMIStatus = (status: string): status is EMIStatus => {
  return Object.values(EMIStatus).includes(status as EMIStatus);
};

export const isValidInspectionStatus = (status: string): status is InspectionStatus => {
  return Object.values(InspectionStatus).includes(status as InspectionStatus);
};

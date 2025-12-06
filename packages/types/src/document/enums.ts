// ============================================
// DOCUMENT CATEGORY
// ============================================

export enum DOCUMENT_CATEGORY {
  ASSET = 'ASSET',
  INSPECTION = 'INSPECTION',
  IDENTITY = 'IDENTITY',
  INCOME = 'INCOME',
  LEGAL = 'LEGAL',
  PAYMENT = 'PAYMENT',
  LOAN = 'LOAN',
  PROFILE = 'PROFILE',
  TRANSFER_PROOF = 'TRANSFER_PROOF',
  OTHER = 'OTHER',
}

// ============================================
// DOCUMENT TYPE
// ============================================

export enum DOCUMENT_TYPE {
  ASSET_PHOTO = 'ASSET_PHOTO',
  ASSET_DOCUMENT = 'ASSET_DOCUMENT',
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  ID_PROOF = 'ID_PROOF',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
  INSPECTION_PHOTO = 'INSPECTION_PHOTO',
  EMI_RECEIPT = 'EMI_RECEIPT',
  TRANSFER_PROOF = 'TRANSFER_PROOF',
  LOAN_AGREEMENT = 'LOAN_AGREEMENT',
  PROFILE_PICTURE = 'PROFILE_PICTURE',
  OTHER = 'OTHER',
}

// ============================================
// DOCUMENT STATUS
// ============================================

export enum DOCUMENT_STATUS {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

// ============================================
// DOCUMENT UPLOADER ROLE
// ============================================

export enum DOCUMENT_UPLOADER_ROLE {
  USER_SUBMITTED = 'USER_SUBMITTED',
  AGENT_SUBMITTED = 'AGENT_SUBMITTED',
  ADMIN_SUBMITTED = 'ADMIN_SUBMITTED',
  SYSTEM = 'SYSTEM',
}

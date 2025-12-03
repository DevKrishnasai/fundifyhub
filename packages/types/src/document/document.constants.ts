/**
 * Document constants
 * @module document/document.constants
 */

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

// ============================================
// DOCUMENT CONSTRAINTS
// ============================================

/** Maximum document size in bytes (4MB) */
export const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024;

/** Maximum number of documents per upload */
export const MAX_DOCUMENT_COUNT = 5;

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES: string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
];

/** Allowed document MIME types (including PDFs) */
export const ALLOWED_DOCUMENT_TYPES: string[] = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
];

// ============================================
// DOCUMENT TYPE TO CATEGORY MAPPING
// ============================================

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

// ============================================
// CACHE PROVIDER ENUMS
// ============================================

/**
 * Supported cache provider types
 */
export enum CacheProviderType {
  REDIS = 'REDIS',
  MEMORY = 'MEMORY',     // For development/testing
  NONE = 'NONE',         // No-op cache (disabled)
}

// ============================================
// PAYMENT PROVIDER ENUMS
// ============================================

/**
 * Supported payment provider types
 */
export enum PaymentProviderType {
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',       // Future
  MANUAL = 'MANUAL',       // Cash, Cheque, Bank Transfer
}

/**
 * Manual payment methods
 */
export enum ManualPaymentMethod {
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
}

// ============================================
// STORAGE PROVIDER ENUMS
// ============================================

/**
 * Supported storage provider types
 */
export enum StorageProviderType {
  UPLOADTHING = 'UPLOADTHING',
  S3 = 'S3',           // Future
  GCS = 'GCS',         // Future (Google Cloud Storage)
  LOCAL = 'LOCAL',     // For development
}

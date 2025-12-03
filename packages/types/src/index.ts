/**
 * FundifyHub Types Package - Domain-Driven Exports
 *
 * This package provides all shared types, constants, and schemas
 * organized by domain for the FundifyHub application.
 *
 * MIGRATION IN PROGRESS:
 * - New code should import from domain modules (common/, auth/, request/, etc.)
 * - Legacy exports maintained for backward compatibility with templates package
 *
 * @packageDocumentation
 */

// ============================================
// DOMAIN EXPORTS (NEW STRUCTURE)
// These are the primary exports for new code
// ============================================

// Common utilities and base types
export * from './common';

// Authentication & Authorization
export * from './auth';

// Loan Request management
export * from './request';

// Loan lifecycle
export * from './loan';

// Document management
export * from './document';

// Payment processing
export * from './payment';

// Notifications
export * from './notification';

// UI-specific constants (frontend only)
export * from './ui';

// ============================================
// SUPPLEMENTARY EXPORTS
// Additional types needed by other packages
// ============================================

// UploadThing file upload types
export * from './uploadthing-types';

// Document API types (request/response types for document operations)
export * from './document-types';

// Full notification channel/request types (detailed notification system)
export * from './notification-types';

// Email/WhatsApp template types
export * from './template-types';

// WebSocket event types
export * from './socket-types';

// ============================================
// LEGACY EXPORTS (backward compatibility)
// These will be migrated to domain modules over time
// ============================================

// Template-related enums (used by templates package)
export { TEMPLATE_NAMES, SERVICE_NAMES } from './constants';

// Template-related types (used by templates package)
export type {
  TemplateDefinitionType,
  TemplatePayloadMapType,
  OTPVerificationPayloadType,
  WelcomePayloadType,
  LoginAlertPayloadType,
  PasswordResetPayloadType,
  AdminUserCreatedPayloadType,
  RequestStatusNotificationsPayloadType,
  AssetPledgePayloadType,
  EMIReminderPayloadType,
  EMIOverduePayloadType,
  RequestSubmittedPayloadType,
  // Settings page types
  EmailConfigType,
  ServiceConfigType,
} from './types';

// Document-related types
export type { AssetPhotoData } from './document-types';

// RBAC and Permissions (used by frontend and backend)
export {
  PERMISSION,
  ROLE_PERMISSIONS,
  hasPermission,
  NAV_ITEMS,
} from './constants';

// Audit-related types (used by backend)
export {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  AUDIT_STATUS,
  AUDIT_ACTION_SEVERITY,
} from './constants';

// Rate limiting (used by backend)
export {
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_PREFIX,
} from './constants';

// Navigation types
export type { NavMenuItem } from './constants';

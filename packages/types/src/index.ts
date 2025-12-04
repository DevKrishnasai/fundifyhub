/**
 * FundifyHub Types Package - Domain-Driven Exports
 *
 * This package provides all shared types, constants, and schemas
 * organized by domain for the FundifyHub application.
 *
 * STATUS SYSTEM v2: Stage-Based Architecture
 * - 10 stages replace 28 statuses for simplicity
 * - Sub-status provides granular detail within each stage
 * - Action flags enable fast filtering queries
 *
 * @packageDocumentation
 */

// ============================================
// STAGE-BASED STATUS SYSTEM (v2)
// Primary exports for the new simplified status architecture
// ============================================

// Stage constants, sub-statuses, display config
export * from './stage-constants';

// Workflow events, transition types, payloads
export * from './stage-workflow-types';

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

// Asset management (used by frontend and backend)
export {
  ASSET_STATUS,
  ASSET_CONDITION,
  ASSET_CONDITION_OPTIONS,
  MOVEMENT_TYPE,
  MOVEMENT_TYPE_LABELS,
} from './constants';

// Auction system (used by frontend and backend)
export {
  AUCTION_STATUS,
  BID_STATUS,
  AUCTION_STATUS_LABELS,
  AUCTION_STATUS_COLORS,
  BID_STATUS_LABELS,
} from './constants';

// Navigation types
export type { NavMenuItem } from './constants';

// ============================================
// BACKWARDS COMPATIBILITY EXPORTS
// These are temporary to support the migration from
// currentStatus/REQUEST_STATUS to stage/REQUEST_STAGE
// TODO: Remove after full migration to stage-based system
// ============================================

// Legacy REQUEST_STATUS enum - for files not yet migrated
export { REQUEST_STATUS, PENDING_REQUEST_STATUSES, AGENT_ACCESS_DENY_STATUSES } from './constants';

// Role-related exports
export { ROLE_HIERARCHY, ROLE_LABELS, ADMIN_ROLES, REQUEST_MANAGER_ROLES, ADMIN_AGENT_ROLES } from './constants';

// Queue and job types
export { QUEUE_NAMES, JOB_TYPES, SERVICE_CONTROL_ACTIONS, CONNECTION_STATUS } from './constants';

// EMI-related constants
export { 
  EMI_STATUS, 
  LOAN_STATUS, 
  OVERDUE_GRACE_PERIOD_DAYS,
  DEFAULT_PENALTY_PERCENTAGE,
  DEFAULT_LATE_FEE_PERCENTAGE,
} from './constants';

// UserRole type alias (for backwards compatibility)
export type UserRole = import('./auth').Role;

/**
 * Types barrel export
 * Re-exports all domain types
 */

// Domain-specific types (NEW structure)
export * from './common';
export * from './user';
export * from './geo';
export * from './request';
export * from './loan';
export * from './emi';
export * from './payment';
export * from './asset';
export * from './auction';
export * from './notification';
export * from './audit';
export * from './socket';
export * from './document';

// ============================================
// LEGACY TYPES (selective exports to avoid duplicates)
// ============================================

// Service configuration types
export type {
  JsonPrimitive,
  JsonArray,
  JsonObject,
  JsonValue,
  EmailConfigType,
  ServiceConfigType,
  UtilsEnvConfigType,
} from '../types';

// Geography types (avoiding duplicates with types/geo.ts)
export type {
  CountryType,
  StateType,
  DistrictType,
  WarehouseType,
} from '../types';

// User types (avoiding duplicates)
export type {
  UserType,
  JWTPayloadType,
} from '../types';

// Additional types from legacy types.ts file
export type {
  RequestType,
  InspectionType,
  BankDetailsType,
  LoanType,
  EMIScheduleType,
  PaymentType,
  PaymentOrderType,
  AssetType,
  AssetMovementType,
  AuctionListingType,
  RequestHistoryItem,
} from '../types';

// Document types - AssetPhotoData is now in types/document.ts (exported above)
// Note: UploadedFile, DocumentMetadata, CreateDocumentRequest were removed (not in root types.ts)

// UploadThing types - Note: These were in legacy, removed for now
// APIResponseType is now exported from types/common.ts (exported above)

// ============================================
// NOTIFICATION & TEMPLATE TYPES  
// Note: May have duplicate exports with socket.ts (EMIReminderPayload, EMIOverduePayload)
// TypeScript will use the first export encountered
// ============================================

// Export notification types (enums and types)
export {
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationCategory,
  DeliveryMode,
  type NotificationRecipient,
  type RenderedContent,
  type NotificationRequest,
  type NotificationResult,
  type TypedNotificationRequest,
  type NotificationJobData,
} from '../notification-types';

// Export template types - Note: NotificationTemplateName doesn't exist
// notification-types.ts has NotificationTemplate (interface) not NotificationTemplateName (enum)

// Re-export workflow-related types (from stage-workflow-types.ts)
export type {
  WorkflowContext,
  WorkflowActionConfig,
  TransitionConfig,
} from '../stage-workflow-types';

// ============================================
// WORKFLOW TYPES - Now in types/workflow.ts
// ============================================

export type {
  WorkflowAction,
  WorkflowState,
  UserContext,
  RequestContext,
  UserRole,
} from './workflow';

export {
  WORKFLOW_MATRIX,
  canViewRequestDetail,
  getActionsForUser,
  getAvailableActions,
  getPrimaryActions,
  getSecondaryActions,
  isValidTransition,
  getStatusDescription,
} from './workflow';

/**
 * FundifyHub Types Package - Centralized Type Exports
 *
 * This package provides all shared types, constants, and schemas
 * organized by domain for the FundifyHub application.
 *
 * ⚠️ STRUCTURE: This file ONLY re-exports from subdirectories.
 * - constants/ → All enums and constant values
 * - types/ → All TypeScript interfaces and type aliases  
 * - schemas/ → All Zod validation schemas
 *
 * @packageDocumentation
 */

// ============================================
// PRIMARY EXPORTS - Domain-Organized Structure
// ============================================

export * from './constants';
export * from './types';
export * from './schemas';
export * from './stage-workflow-types';
export * from './notification-types';
export * from './stage-constants';

// ============================================
// EXPLICIT SOCKET TYPE EXPORTS (for TypeScript resolution)
// ============================================
export {
  ServerEvent,
  ClientEvent,
  type RequestUpdatePayload,
  type RequestUpdatedPayload,
  type StatusChangePayload,
  type RequestStatusChangedPayload,
  type RequestCommentPayload,
  type CommentAddedPayload,
  type DocumentUploadedPayload,
  type InAppNotification,
  type NotificationCountPayload,
  type AdminStatsPayload,
  type AgentAssignedPayload,
  type PaymentReceivedPayload,
  type EMIReminderPayload,
  type EMIOverduePayload,
  type AuctionBidPlacedPayload,
  type AuctionBidPayload,
  type AuctionOutbidPayload,
  type AuctionExtendedPayload,
  type AuctionEndedPayload,
  type SocketConnectionInfo,
  type SocketAuthPayload,
  type SocketErrorPayload,
  getRequestRoom,
  getUserRoom,
  getAdminRoom,
  getAuctionRoom,
  DEFAULT_SOCKET_OPTIONS,
} from './types/socket';

// ============================================
// WORKFLOW HELPERS - State Machine & Permission Checks
// ============================================
export {
  WORKFLOW_MATRIX,
  canViewRequestDetail,
  getActionsForUser,
  getAvailableActions,
  getPrimaryActions,
  getSecondaryActions,
  isValidTransition,
  getStatusDescription,
  type WorkflowAction,
  type WorkflowState,
  type UserContext,
  type RequestContext,
  type UserRole,
} from './types/workflow';

// ============================================
// LEGACY COMPATIBILITY - To be phased out
// ============================================
// APIResponseType is now an alias for ApiResponse<T> in types/common.ts
// AssetPhotoData is available from types/document.ts
export { type APIResponseType } from './types/common';
export { type AssetPhotoData } from './types/document';
/**
 * Request domain module - Loan request types and constants
 * @module request
 * 
 * NOTE: Workflow types have been migrated to stage-based system.
 * Import from '@fundifyhub/types' directly for:
 * - REQUEST_STAGE, SUB_STATUS, WORKFLOW_EVENTS
 * - Stage-based workflow configuration
 */

export * from './request.constants';
export * from './request.types';
export * from './request.schemas';

// Legacy workflow types - DEPRECATED
// These are kept for backward compatibility during migration
// New code should use stage-based types from '@fundifyhub/types'
export {
  // Only export types that don't conflict with stage-based system
  WORKFLOW_MATRIX,
  getAvailableActions as getLegacyAvailableActions,
  getActionsForUser,
  canViewRequestDetail,
  getPrimaryActions,
  getSecondaryActions,
  isValidTransition,
  getStatusDescription,
  type WorkflowAction,
  type WorkflowState,
  type RequestContext,
  type UserContext,
} from './workflow.types';

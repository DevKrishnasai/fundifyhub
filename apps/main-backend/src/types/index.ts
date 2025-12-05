/**
 * Backend-specific type extensions and re-exports
 *
 * This file re-exports types from @fundifyhub/types for convenience
 * and adds backend-specific types (e.g. Express extensions).
 */

export type {
  APIResponse as APIResponseType,
  AdminEmiScheduleSnapshot,
  NormalizedEmiData,
  isAdminEmiScheduleSnapshot,
  CreateDocumentRequest,
  CommentWithAuthor,
  DocumentWithUrl,
} from '@fundifyhub/types';

export type {
  RequestWithRelations,
  RequestDetailWithLoan,
  EMIScheduleItem,
} from '@fundifyhub/types';

// Express request extension
declare global {
  namespace Express {
    interface Request {
      user?: import('@fundifyhub/types').UserType;
      /** Raw body string for webhook signature verification */
      rawBody?: string;
    }
  }
}

// Keep helper functions for backwards compatibility
export { normalizeAdminSnapshot, normalizeEmiCalcResult } from './helpers';
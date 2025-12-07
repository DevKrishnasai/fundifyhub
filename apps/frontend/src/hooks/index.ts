/**
 * Frontend Hooks Index
 *
 * Re-export all hooks for convenient imports
 */

// Socket & Real-time
export { useSocket, useSocketEvent } from './useSocket';
export { useRequestSocket } from './useRequestSocket';

// UI & Feedback
export { useToast } from './use-toast';
export { useRazorpay } from './use-razorpay';

// Debounce
export { useDebounce, useDebouncedState } from './useDebounce';

// Request Actions & Detail
export { useRequestActions } from './useRequestActions';
export {
  useRequestDetail,
  getLatestStatusNote,
  getLatestStatusActorType,
  getLatestAdminRequestedInfo,
  getLatestRequestedInspectionDate,
} from './useRequestDetail';
export type {
  RequestDetailData,
  RequestPermissions,
  ModalState,
} from './useRequestDetail';

// Resilience & State Management
export { useActionLock } from './useActionLock';
export { useOptimisticUpdate } from './useOptimisticUpdate';
export { useStaleDetection } from './useStaleDetection';
export { useRetry } from './useRetry';
export { useFormPersistence, useHasDraft, clearAllDrafts } from './useFormPersistence';

// Document Upload
export { useDocumentUpload } from './useDocumentUpload';
export type { StagedFile, UploadResult, UseDocumentUploadOptions } from './useDocumentUpload';

// React Query hooks - all data fetching
export * from './queries';

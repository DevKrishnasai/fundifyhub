/**
 * Request Components Index
 * 
 * Centralized exports for all request-related components
 */

// ============================================
// MAIN COMPONENTS
// ============================================

// Main orchestrator and container
export { RequestDetailPageContainer } from './RequestDetailPageContainer';

// ============================================
// LAYOUT COMPONENTS
// ============================================

export { RequestPageLayout } from './layout/RequestPageLayout';
export { RequestSkeleton } from './layout/RequestSkeleton';

// ============================================
// GUARD COMPONENTS
// ============================================

export { PermissionGate } from './guards/PermissionGate';
export { SectionErrorBoundary } from './guards/SectionErrorBoundary';
export { StaleDataBanner } from './guards/StaleDataBanner';

// ============================================
// STATUS COMPONENTS
// ============================================

export { 
  StatusBanner, 
  PhaseProgressBar, 
  CompactStatusIndicator,
  ActionRequiredIndicator,
} from './status/StatusBanner';

// ============================================
// SECTION COMPONENTS
// ============================================

export { SectionCard, SectionRow, SectionGrid, SectionDivider, EmptyState } from './sections/SectionCard';
export { AssetSection, AssetSummaryCard } from './sections/AssetSection';
export { OfferSection, OfferCompactCard } from './sections/OfferSection';
export { InspectionSection, InspectionTimelineItem } from './sections/InspectionSection';
export { DocumentsSection } from './sections/DocumentsSection';
export { LoanSection, LoanCompactCard } from './sections/LoanSection';
export { CommentsSection, CommentBubble } from './sections/CommentsSection';
export { BankDetailsSection } from './sections/BankDetailsSection';
export { SignatureSection } from './sections/SignatureSection';
export { PaymentSection } from './sections/PaymentSection';

// ============================================
// SIDEBAR COMPONENTS
// ============================================

export { PeopleSidebar, PersonCard, QuickInfo } from './sidebar/PeopleSidebar';
export { TimelineSidebar, TimelineItem } from './sidebar/TimelineSidebar';

// ============================================
// WORKFLOW COMPONENTS
// ============================================

export { WorkflowActionBar, FloatingActionButton } from './workflow/WorkflowActionBar';
export { ActionConfirmDialog, useConfirmDialog } from './workflow/ActionConfirmDialog';

// ============================================
// MODALS
// ============================================

export {
  BankDetailsModal,
  RejectModal,
  ApproveModal,
  DisbursementModal,
  AgentIssueModal,
  OfferDeclineModal,
  CancelWithdrawModal,
  RequestInfoModal,
  RequestBankDetailsModal,
  RescheduleModal,
  CompleteInspectionModal,
  ConfirmActionModal,
  UploadDocumentModal,
  DocumentPreviewModal,
} from './modals';
export { default as AssignAgentModal } from './AssignAgentModal';

// Shared utilities placeholder (none exported currently)

/**
 * Request Controllers - Barrel Export
 * 
 * This module re-exports all request-related controllers organized by domain.
 * Controllers are split into domain-specific files for better maintainability.
 * 
 * Controller Files:
 * - request.controller.ts - Core request operations
 * - assignment.controller.ts - Agent/Admin assignment and workflow
 * - offer.controller.ts - Offer management
 * - loan.controller.ts - Loan creation
 * - agreement.controller.ts - Agreement generation/signing
 * - inspection.controller.ts - Inspection and bank details
 * - comment.controller.ts - Comments management
 * - document.controller.ts - Document upload
 */

// ============================================
// CRUD Operations
// ============================================
export { getRequestDetailController } from './request.controller';

// ============================================
// Assignment & Workflow Controllers
// ============================================
export { 
  assignAgentController,
  selfAssignAdminController,
  assignAdminController,
  getAvailableAdminsController,
  getAvailableAgentsController,
  updateRequestStatusController,
} from './assignment.controller';

// ============================================
// Offer Controllers
// ============================================
export {
  createOfferController,
  getCurrentOfferController,
  offerPreviewController,
  confirmOfferController,
} from './offer.controller';

// ============================================
// Loan Controllers
// ============================================
export { createLoanController } from './loan.controller';

// ============================================
// Agreement Controllers
// ============================================
export {
  generateAgreementController,
  signAgreementController,
  uploadSignedAgreementController,
} from './agreement.controller';

// ============================================
// Inspection & Bank Details Controllers
// ============================================
export { 
  completeInspectionController,
  updateBankDetailsController,
  getAgentAssignedRequestsController,
} from './inspection.controller';

// ============================================
// Comment Controllers
// ============================================
export {
  updateCommentsEnabledController,
  addCommentController,
} from './comment.controller';

// ============================================
// Document Controllers
// ============================================
export { addDocumentController } from './document.controller';


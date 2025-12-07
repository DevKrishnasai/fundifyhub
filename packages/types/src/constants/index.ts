/**
 * Constants barrel export
 * Re-exports all domain constants
 */

// Domain-specific constants (NEW structure)
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

// ============================================
// LEGACY CONSTANTS (selective exports to avoid duplicates)
// ============================================

// Service/Template/Queue/Job types (not in domain files yet)
export {
  SERVICE_NAMES,
  TEMPLATE_NAMES,
  QUEUE_NAMES,
  JOB_TYPES,
  SERVICE_CONTROL_ACTIONS,
  CONNECTION_STATUS,
} from '../constants';

// Request-related legacy constants (avoiding duplicates with constants/request.ts)
export {
  ASSET_TYPE,
  ASSET_TYPE_OPTIONS,
  ASSET_CONDITION,
  REQUEST_STATUS, // Legacy 28-status system
  PENDING_REQUEST_STATUSES,
  AGENT_ACCESS_DENY_STATUSES,
  ALLOWED_UPDATE_STATUSES,
  CUSTOMER_ACTION_REQUIRED,
  ADMIN_ACTION_REQUIRED,
  AGENT_ACTION_REQUIRED,
  CUSTOMER_ALLOWED_STATUSES,
  AGENT_ALLOWED_STATUSES,
  LOAN_CREATION_ALLOWED_STATUSES,
  REQUEST_HISTORY_ACTION,
  REQUEST_HISTORY_CATEGORY,
  REQUEST_HISTORY_ACTION_CONFIG,
  getRequestHistoryActionLabel,
} from '../constants';

// Document constants
export {
  DOCUMENT_CATEGORY,
  DOCUMENT_TYPE,
  DOCUMENT_STATUS,
  DOCUMENT_UPLOADER_ROLE,
  DOCUMENT_TYPE_TO_CATEGORY,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_CONFIG,
  UPLOADER_ROLE_LABELS,
} from '../constants';

// Asset/Auction constants (non-duplicate)
export {
  MOVEMENT_TYPE,
  MOVEMENT_TYPE_LABELS,
  AUCTION_STATUS,
  AUCTION_STATUS_LABELS,
  AUCTION_STATUS_COLORS,
  BID_STATUS,
  BID_STATUS_LABELS,
} from '../constants';

// User/Role constants (avoiding duplicates)
export {
  ROLES,
  ROLE_LABELS,
  ADMIN_ROLES,
  REQUEST_MANAGER_ROLES,
  ADMIN_AGENT_ROLES,
} from '../constants';

// Loan/EMI constants (non-duplicate)
export {
  LOAN_STATUS,
  EMI_STATUS,
  LATE_FEE_GRACE_PERIOD_DAYS,
  INSPECTION_STATUS,
} from '../constants';

// Payment constants (non-duplicate)
export {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  PAYMENT_ORDER_STATUS,
  ASSET_STATUS,
  OFFER_STATUS,
  RAZORPAY_ORDER_EXPIRY_MINUTES,
  OVERDUE_GRACE_PERIOD_DAYS,
  DEFAULT_PENALTY_PERCENTAGE,
  DEFAULT_LATE_FEE_PERCENTAGE,
  PAYMENT_PROCESSING_CONFIG,
  RAZORPAY_WEBHOOK_EVENT,
  EMI_PAYMENT_AVAILABILITY,
} from '../constants';

// Validation patterns
export {
  VALIDATION_PATTERNS,
} from '../constants';

// UI constants
export {
  MAX_DOCUMENT_SIZE,
  MAX_DOCUMENT_COUNT,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  POLL_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  DOCUMENT_MESSAGES,
  ACTION_MESSAGES,
  CLIENT_CONSTANTS,
  ASSET_CONDITION_OPTIONS,
  DISTRICTS,
} from '../constants';

// RBAC constants
export {
  PERMISSION,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissionsForRoles,
  NAV_ITEMS,
  type NavMenuItem,
} from '../constants';

// Status display constants
export {
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_DESCRIPTION,
  REQUEST_STATUS_ICON,
  REQUEST_PHASE,
  REQUEST_PHASE_LABELS,
  REQUEST_STATUS_PHASE,
  getPhaseNumber,
} from '../constants';

// Audit constants (avoiding AUDIT_STATUS duplicate)
export {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  AUDIT_ACTION_SEVERITY,
} from '../constants';

// Modal constants
export {
  MODAL_COMPONENTS,
  AGENT_ISSUE_TYPES,
} from '../constants';

// Local storage constants
export {
  LOCAL_STORAGE_KEYS,
} from '../constants';

// Offer form constants
export {
  OFFER_FORM_DEFAULTS,
  OFFER_FORM_CONSTRAINTS,
} from '../constants';

// Rate limiting & caching
export {
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_PREFIX,
  CACHE_TTL,
  CACHE_KEY_PREFIX,
} from '../constants';

// ============================================
// STAGE-BASED WORKFLOW CONSTANTS
// ============================================

export {
  REQUEST_STAGE,
  SUB_STATUS,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  STAGE_ICONS,
  STAGE_COLORS,
  SUB_STATUS_DISPLAY,
  getStatusDisplay,
  getStageNumber,
  isTerminalStage,
  calculateActionFlags,
  PENDING_STAGES,
  stageToLegacyStatus,
  ALLOWED_UPDATE_STAGES,
  AGENT_WORK_STAGES,
  type ActionFlags,
} from '../stage-constants';

export * from '../stage-workflow-types';

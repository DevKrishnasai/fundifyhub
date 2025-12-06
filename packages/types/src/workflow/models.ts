import { REQUEST_STAGE, ISSUE_TYPE } from './enums';

// ============================================
// WORKFLOW CONTEXT (data needed for transitions)
// ============================================

export interface WorkflowContext {
  user: {
    id: string;
    roles: string[];          // Array of roles
    districts?: string[];     // Districts the user manages
    districtIds?: string[];   // Alias for districts
  };
  request: {
    id: string;
    stage?: REQUEST_STAGE;     // New stage field
    subStatus?: string | null;
    currentStatus?: string;    // Legacy field for compatibility
    customerId: string;
    districtId?: string;
    assignedAgentId?: string | null;
    assignedAdminId?: string | null;
    activeOfferId?: string | null;
    amount?: number;           // For offer validation
    loan?: {
      id: string;
      status: string;
    } | null;
    [key: string]: unknown;    // Allow spreading request
  };
}

// ============================================
// ACTION FLAGS
// ============================================

export interface ActionFlags {
  requiresCustomerAction: boolean;
  requiresAdminAction: boolean;
  requiresAgentAction: boolean;
  isBlocked: boolean;
}

// ============================================
// WORKFLOW ACTION TYPES
// ============================================

export interface WorkflowAction {
  /** Unique action identifier */
  id: string;
  /** Display label for UI button */
  label: string;
  /** Tooltip or help text */
  description?: string;
  /** Icon name (lucide-react) */
  icon?: string;
  /** Button style */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  /** Status after action */
  targetStatus: string; // Should be REQUEST_STATUS or REQUEST_STAGE depending on context
  /** Opens modal/form for input */
  requiresInput?: boolean;
  /** Shows confirmation dialog */
  requiresConfirmation?: boolean;
  /** Admin must have access to request's district */
  districtCheck?: boolean;
  /** Must be request owner */
  requiresCustomerOwnership?: boolean;
  /** Must be assigned agent */
  requiresAgentAssignment?: boolean;
  /** Lower number = higher priority for display */
  priority?: number;
  /** Modal component name to render */
  modalComponent?: string;
  /** Tooltip text for the action button */
  tooltip?: string;
}

export interface WorkflowState {
  /** Human-readable description of status */
  description: string;
  customerActions: WorkflowAction[];
  adminActions: WorkflowAction[];
  agentActions: WorkflowAction[];
  /** Automated system actions */
  systemActions?: WorkflowAction[];
}

// ============================================
// PERMISSION CONTEXT TYPES
// ============================================

/**
 * Request context for permission checks
 */
export interface RequestContext {
  customerId: string;
  districtId: string;  // District ID (FK to District model)
  agentId?: string | null;
  adminId?: string | null;
}

/**
 * User context for multi-role permission checks
 */
export interface UserContext {
  id: string;
  roles: string[]; // Keeping strict typing flexible here as string[] to match typical JWT payloads
  districts?: string[];
}

// ============================================
// TRANSITION RESULT
// ============================================

export interface StageTransition {
  stage: REQUEST_STAGE;
  subStatus: string | null;
  actionFlags: ActionFlags;
}

export interface TransitionConfig {
  /** Target stage after transition */
  targetStage: REQUEST_STAGE;
  /** Target sub-status after transition */
  targetSubStatus: string | null;
  /** Guard functions to check if transition is allowed */
  guards?: Array<(context: WorkflowContext) => boolean>;
  /** Input fields required for this action */
  requiredInput?: string[];
  /** Whether this is a system-only action */
  systemOnly?: boolean;
}

// ============================================
// ACTION UI CONFIG
// ============================================

export type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';

export interface WorkflowActionConfig {
  /** Button label */
  label: string;
  /** Description for confirmation dialogs */
  description?: string;
  /** Lucide icon name */
  icon?: string;
  /** Button variant */
  variant?: ButtonVariant;
  /** Tooltip text */
  tooltip?: string;
  /** Show confirmation dialog */
  requiresConfirmation?: boolean;
  /** Modal component to render */
  modalComponent?: string;
  /** Action priority (lower = primary) */
  priority?: number;
}

// ============================================
// SUB-STATUS DISPLAY CONFIGURATION
// ============================================

export interface SubStatusDisplayConfig {
  label: string;
  description: string;
  icon: string;
  isBlocking?: boolean; // Indicates an issue that blocks progress
  requiresAction?: 'customer' | 'admin' | 'agent' | 'system';
}

// ============================================
// TRANSITION PAYLOADS
// ============================================

export interface MakeOfferPayload {
  amount: number;
  tenureMonths: number;
  interestRate: number;
  processingFee?: number;
  penaltyPercentage?: number;
  lateFeePercentage?: number;
}

export interface AssignAgentPayload {
  agentId: string;
  inspectionDate: string; // ISO date string
  notes?: string;
}

export interface AssignAdminPayload {
  adminId: string;
}

export interface RejectPayload {
  reason: string;
}

export interface CancelPayload {
  reason: string;
}

export interface RequestInfoPayload {
  notes: string;
}

export interface DeclineOfferPayload {
  reason: string;
}

export interface ReportIssuePayload {
  issueType: ISSUE_TYPE;
  description: string;
}

export interface BankDetailsPayload {
  accountNumber: string;
  ifscCode: string;
  accountName: string;
  bankName?: string;
  upiId?: string;
}

export interface DisbursePayload {
  transferMethod: string;
  transactionId: string;
  notes?: string;
}

export interface CompleteInspectionPayload {
  photos?: string[];
  notes?: string;
  assetCondition?: string;
  estimatedValue?: number;
}

export interface RefuseSignaturePayload {
  reason: string;
}

// Union type for all payloads
export type WorkflowPayload = 
  | MakeOfferPayload
  | AssignAgentPayload
  | AssignAdminPayload
  | RejectPayload
  | CancelPayload
  | RequestInfoPayload
  | DeclineOfferPayload
  | ReportIssuePayload
  | BankDetailsPayload
  | DisbursePayload
  | CompleteInspectionPayload
  | RefuseSignaturePayload
  | Record<string, unknown>;
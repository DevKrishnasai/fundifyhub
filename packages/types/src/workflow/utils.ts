import { REQUEST_STAGE, REQUEST_STATUS, REQUEST_PHASE } from './enums';
import { 
  PROGRESS_STAGES, 
  TERMINAL_STAGES, 
  SUB_STATUS_DISPLAY, 
  STAGE_LABELS, 
  STAGE_DESCRIPTIONS, 
  STAGE_ICONS 
} from './constants';
import { SubStatusDisplayConfig, ActionFlags } from './models';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the progress percentage for a given stage
 */
export function getStageProgress(stage: REQUEST_STAGE): number {
  const index = PROGRESS_STAGES.indexOf(stage as typeof PROGRESS_STAGES[number]);
  if (index === -1) {
    // Terminal states
    if (stage === REQUEST_STAGE.COMPLETED) return 100;
    if (stage === REQUEST_STAGE.REJECTED || stage === REQUEST_STAGE.CANCELLED) return 0;
    return 0;
  }
  return Math.round(((index + 1) / PROGRESS_STAGES.length) * 100);
}

/**
 * Get the step number for a given stage (1-based)
 */
export function getStageNumber(stage: REQUEST_STAGE): number {
  const index = PROGRESS_STAGES.indexOf(stage as typeof PROGRESS_STAGES[number]);
  return index === -1 ? 0 : index + 1;
}

/**
 * Get display config for a stage + subStatus combination
 */
export function getStatusDisplay(stage: REQUEST_STAGE, subStatus: string | null): SubStatusDisplayConfig {
  const key = subStatus ? `${stage}:${subStatus}` : null;
  
  if (key && SUB_STATUS_DISPLAY[key]) {
    return SUB_STATUS_DISPLAY[key];
  }
  
  // Fallback to stage-level display
  return {
    label: STAGE_LABELS[stage],
    description: STAGE_DESCRIPTIONS[stage],
    icon: STAGE_ICONS[stage],
    requiresAction: undefined,
  };
}

/**
 * Check if a stage is a terminal state
 */
export function isTerminalStage(stage: REQUEST_STAGE): boolean {
  return TERMINAL_STAGES.includes(stage as typeof TERMINAL_STAGES[number]);
}

/**
 * Check if request is in active loan phase
 */
export function isActiveLoan(stage: REQUEST_STAGE): boolean {
  return stage === REQUEST_STAGE.ACTIVE;
}

/**
 * Check if request can proceed to next stage
 */
export function canProceed(stage: REQUEST_STAGE, subStatus: string | null): boolean {
  const key = subStatus ? `${stage}:${subStatus}` : null;
  const display = key ? SUB_STATUS_DISPLAY[key] : null;
  return display ? !display.isBlocking : true;
}

// ============================================
// ACTION FLAGS HELPERS
// ============================================

/**
 * Calculate action flags based on stage and subStatus
 */
export function calculateActionFlags(stage: REQUEST_STAGE, subStatus: string | null): ActionFlags {
  const key = subStatus ? `${stage}:${subStatus}` : null;
  const display = key ? SUB_STATUS_DISPLAY[key] : null;
  
  const flags: ActionFlags = {
    requiresCustomerAction: false,
    requiresAdminAction: false,
    requiresAgentAction: false,
    isBlocked: display?.isBlocking ?? false,
  };
  
  if (display?.requiresAction) {
    switch (display.requiresAction) {
      case 'customer':
        flags.requiresCustomerAction = true;
        break;
      case 'admin':
        flags.requiresAdminAction = true;
        break;
      case 'agent':
        flags.requiresAgentAction = true;
        break;
    }
  }
  
  return flags;
}
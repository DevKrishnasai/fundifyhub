/**
 * Stage-Based Workflow System (v2)
 * 
 * This module exports the new simplified workflow system based on
 * 10 stages + sub-statuses instead of the legacy 28 statuses.
 */

// New stage-based workflow configuration
export * from './stage-config';
export * from './stage-guards';

// Re-export Guards from stage-guards for convenience
export { Guards } from './stage-guards';

// Re-export as WorkflowEngine for backward compatibility
import {
  getAvailableTransitions,
  getAvailableEvents,
  getAvailableActions as _getAvailableActions,
  canTransition,
  executeTransition,
  ACTION_CONFIG,
  TRANSITIONS,
} from './stage-config';

import type { WorkflowContext, WorkflowActionConfig } from '@fundifyhub/types';
import { REQUEST_STAGE } from '@fundifyhub/types';

/**
 * WorkflowEngine - Static class for workflow operations
 * 
 * Provides a consistent API for workflow operations from the frontend.
 */
export const WorkflowEngine = {
  /**
   * Get available actions for a request based on its current state and user context
   */
  getAvailableActions(context: WorkflowContext): Array<WorkflowActionConfig & { id: string }> {
    const request = context.request;
    if (!request) return [];

    // Get stage from request - handle both stage and currentStatus for compatibility
    const stage = (request.stage || (request as Record<string, unknown>).currentStatus) as REQUEST_STAGE | undefined;
    const subStatus = request.subStatus ?? null;

    if (!stage) return [];

    const actions = _getAvailableActions(stage, subStatus, context);
    
    // Map to expected format with id
    return actions.map(({ event, config }) => ({
      ...config,
      id: event,
    }));
  },

  /**
   * Check if a specific transition is allowed
   */
  canTransition(
    stage: REQUEST_STAGE,
    subStatus: string | null,
    event: string,
    context: WorkflowContext
  ): { allowed: boolean; reason?: string } {
    return canTransition(stage, subStatus, event, context);
  },

  /**
   * Execute a transition and return the new state
   */
  executeTransition(
    stage: REQUEST_STAGE,
    subStatus: string | null,
    event: string
  ) {
    return executeTransition(stage, subStatus, event);
  },

  /**
   * Get all available events for a state
   */
  getAvailableEvents(
    stage: REQUEST_STAGE,
    subStatus: string | null,
    context: WorkflowContext
  ): string[] {
    return getAvailableEvents(stage, subStatus, context);
  },

  /**
   * Get transition configuration
   */
  getTransitions: getAvailableTransitions,

  /**
   * Access raw action config
   */
  ACTION_CONFIG,
  TRANSITIONS,
} as const;
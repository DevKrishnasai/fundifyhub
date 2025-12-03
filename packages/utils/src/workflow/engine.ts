import { REQUEST_STATUS } from '@fundifyhub/types';
import type { WorkflowContext, WorkflowActionConfig } from '@fundifyhub/types';
import { TRANSITIONS } from './config';
import { ACTION_CONFIG } from './config';

export class WorkflowEngine {
  /**
   * Get all available actions for the current user and request state
   */
  static getAvailableActions(context: WorkflowContext): Array<WorkflowActionConfig & { id: string }> {
    const currentStatus = context.request.id ? (context.request as any).currentStatus : REQUEST_STATUS.PENDING;
    const transitions = TRANSITIONS[currentStatus];

    if (!transitions) return [];

    const availableActions: Array<WorkflowActionConfig & { id: string }> = [];

    for (const [eventId, config] of Object.entries(transitions)) {
      // Check all guards
      const isAllowed = config.guards ? config.guards.every(guard => guard(context)) : true;

      if (isAllowed) {
        const uiConfig = ACTION_CONFIG[eventId];
        if (uiConfig) {
          availableActions.push({
            id: eventId,
            ...uiConfig
          });
        }
      }
    }

    return availableActions;
  }

  /**
   * Validate if a transition is allowed
   */
  static validateTransition(
    eventId: string,
    context: WorkflowContext
  ): { allowed: boolean; error?: string; targetStatus?: REQUEST_STATUS } {
    const currentStatus = (context.request as any).currentStatus;
    const transitions = TRANSITIONS[currentStatus];

    if (!transitions || !transitions[eventId]) {
      return { allowed: false, error: 'Invalid action for current status' };
    }

    const config = transitions[eventId];
    const isAllowed = config.guards ? config.guards.every(guard => guard(context)) : true;

    if (!isAllowed) {
      return { allowed: false, error: 'You are not authorized to perform this action' };
    }

    return { allowed: true, targetStatus: config.targetStatus };
  }

  /**
   * Get target status for an action
   */
  static getTargetStatus(currentStatus: string, eventId: string): REQUEST_STATUS | null {
    return TRANSITIONS[currentStatus]?.[eventId]?.targetStatus || null;
  }
}

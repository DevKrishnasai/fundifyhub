/**
 * Request Event Handlers
 * 
 * Respond to request domain events and trigger side effects:
 * - Send notifications to customer/agent/admin
 * - Update related entities
 * - Trigger workflows
 * 
 * @module domain/events/handlers
 */

import { eventBus } from '../bus';
import type { RequestCreatedEvent, RequestSubmittedEvent, RequestAssignedEvent } from '../../requests/requests.events';
import { notificationAdapter, realtimeAdapter } from '../../../infra-adapters';
import { ServerEvent } from '@fundifyhub/types';
import logger from '../../../utils/logger';

/**
 * Handle: Request created
 * 
 * Send verification email to customer
 * Notify district admins of new request
 */
export function setupRequestCreatedHandler(): void {
  eventBus.onEvent<RequestCreatedEvent>('request.created', async (event) => {
    try {
      logger.info('[RequestHandler] Request created event received', {
        requestId: event.aggregateId,
        customerId: event.data.customerId,
      });

      // Send confirmation email to customer
      await notificationAdapter.sendEmail(
        event.data.customerEmail,
        'request-created',
        {
          customerName: event.data.customerName,
          requestId: event.aggregateId,
          assetDescription: event.data.assetDescription,
          requestedAmount: event.data.requestedAmount,
        }
      );

      // Publish event for job-worker to notify district admins
      await notificationAdapter.publishEvent({
        eventType: 'request.created',
        userId: event.data.customerId,
        metadata: {
          requestId: event.aggregateId,
          districtId: event.data.districtId,
          amount: event.data.requestedAmount,
        },
      });

      // Audit logging will be added later via separate audit system

      // Emit realtime update to customer
      await realtimeAdapter.emitToUser(event.data.customerId, ServerEvent.REQUEST_UPDATED, {
        requestId: event.aggregateId,
        status: 'DRAFT',
        message: 'Your loan request has been created successfully',
      });

      logger.info('[RequestHandler] Request created notifications sent', { requestId: event.aggregateId });
    } catch (err) {
      logger.error('[RequestHandler] Error handling request.created', { error: err, requestId: event.aggregateId });
    }
  });
}

/**
 * Handle: Request submitted for review
 * 
 * Notify district admins and available agents
 * Update request stage
 */
export function setupRequestSubmittedHandler(): void {
  eventBus.onEvent<RequestSubmittedEvent>('request.submitted', async (event) => {
    try {
      logger.info('[RequestHandler] Request submitted event received', {
        requestId: event.aggregateId,
      });

      // Publish event for job-worker to notify district admins and agents
      await notificationAdapter.publishEvent({
        eventType: 'request.submitted',
        userId: event.data.customerId,
        metadata: {
          requestId: event.aggregateId,
          districtId: event.data.districtId,
          amount: event.data.requestedAmount,
          assetType: event.data.assetType,
        },
      });

      // Audit logging will be added later via separate audit system

      logger.info('[RequestHandler] Request submitted notifications queued', { requestId: event.aggregateId });
    } catch (err) {
      logger.error('[RequestHandler] Error handling request.submitted', { error: err, requestId: event.aggregateId });
    }
  });
}

/**
 * Handle: Request assigned to agent
 * 
 * Notify agent and customer
 * Update assignment tracking
 */
export function setupRequestAssignedHandler(): void {
  eventBus.onEvent<RequestAssignedEvent>('request.assigned', async (event) => {
    try {
      logger.info('[RequestHandler] Request assigned event received', {
        requestId: event.aggregateId,
        agentId: event.data.agentId,
      });

      // Notify agent
      await notificationAdapter.sendEmail(
        event.data.agentEmail,
        'request-assigned-agent',
        {
          agentName: event.data.agentName,
          requestId: event.aggregateId,
          customerName: event.data.customerName,
          assetDescription: event.data.assetDescription,
          requestedAmount: event.data.requestedAmount,
        }
      );

      // Notify customer
      await notificationAdapter.sendEmail(
        event.data.customerEmail,
        'request-assigned-customer',
        {
          customerName: event.data.customerName,
          requestId: event.aggregateId,
          agentName: event.data.agentName,
          agentPhone: event.data.agentPhone,
        }
      );

      // Audit log
      // Audit logging will be added later via separate audit system

      // Emit realtime update to customer and agent
      await realtimeAdapter.emitToUser(event.data.customerId, ServerEvent.REQUEST_UPDATED, {
        requestId: event.aggregateId,
        status: 'ASSIGNED',
        message: `Your request has been assigned to ${event.data.agentName}`,
        agentName: event.data.agentName,
      });

      await realtimeAdapter.emitToUser(event.data.agentId, ServerEvent.REQUEST_UPDATED, {
        requestId: event.aggregateId,
        status: 'ASSIGNED',
        message: `New request assigned to you`,
        customerName: event.data.customerName,
      });

      logger.info('[RequestHandler] Request assignment notifications sent', { requestId: event.aggregateId, agentId: event.data.agentId });
    } catch (err) {
      console.error('[RequestHandler] Error handling request.assigned:', err);
    }
  });
}

/**
 * Initialize all request event handlers
 */
export function initializeRequestHandlers(): void {
  setupRequestCreatedHandler();
  setupRequestSubmittedHandler();
  setupRequestAssignedHandler();
  console.log('[EventHandlers] Request event handlers initialized');
}

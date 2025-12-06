/**
 * Notification Orchestrator
 *
 * Receives domain events and decides which notifications to send.
 * Maps domain events to notification templates and channels.
 *
 * @module domain/notifications
 */
import { eventBus } from '../events';
import { notificationAdapter } from '../../infra-adapters';
import logger from '../../utils/logger';

/**
 * Map domain event type to notification template
 * This determines which template to use for each event
 */
const EVENT_TO_TEMPLATE_MAP: Record<string, string> = {
  // Request lifecycle
  'request.created': 'request-created',
  'request.submitted': 'request-submitted',
  'request.assigned': 'request-assigned',
  'offer.created': 'offer-sent',
  'offer.accepted': 'offer-accepted',
  'offer.rejected': 'offer-declined',
  
  // Loan lifecycle
  'loan.disbursed': 'loan-disbursed',
  'loan.emi.due': 'emi-reminder',
  'loan.emi.overdue': 'emi-overdue',
  'loan.emi.paid': 'payment-success',
  'loan.completed': 'loan-completed',
  
  // Payments
  'payment.recorded': 'payment-success',
  'payment.failed': 'payment-failed',
  
  // Auctions
  'auction.created': 'auction-created',
  'bid.placed': 'bid-placed',
  'auction.ended': 'auction-ended',
  
  // Auth
  'user.registered': 'welcome',
  'user.login': 'login-alert',
  'password.reset.requested': 'password-reset',
};

/**
 * Initialize notification orchestrator
 * Sets up event listeners for all domain events that require notifications
 */
export function initializeNotificationOrchestrator() {
  logger.info('[NotificationOrchestrator] Initializing notification event listeners');
  
  // Note: Individual event handlers in handlers/ folder handle the actual notification logic
  // The orchestrator provides a fallback/generic handler for events not specifically handled
  
  // This is intentionally kept minimal since specific handlers provide better control
  // over notification content and targeting
  
  logger.info('[NotificationOrchestrator] Notification orchestrator initialized');
}
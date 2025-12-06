/**
 * Payment Event Handlers
 * 
 * Respond to payment domain events:
 * - Send payment confirmations
 * - Update EMI status
 * - Send reminders for failed payments
 * 
 * @module domain/events/handlers
 */

import { eventBus } from '../bus';
import type { PaymentRecordedEvent, PaymentFailedEvent } from '../../payments/payments.events';
import { notificationAdapter } from '../../../infra-adapters';
import logger from '../../../utils/logger';

/**
 * Handle: Payment recorded
 * 
 * Send confirmation to customer
 * Update EMI status
 * Check if loan is now complete
 */
export function setupPaymentRecordedHandler(): void {
  eventBus.onEvent<PaymentRecordedEvent>('payment.recorded', async (event) => {
    try {
      logger.info('[PaymentHandler] Payment recorded event received', {
        paymentId: event.aggregateId,
        loanId: event.data.loanId,
      });

      // Send payment confirmation email
      await notificationAdapter.sendEmail(
        event.data.customerEmail,
        'payment-received',
        {
          customerName: event.data.customerName,
          paymentId: event.aggregateId,
          loanId: event.data.loanId,
          amount: event.data.amount,
          paymentDate: event.data.paymentDate,
          remainingBalance: event.data.remainingBalance,
          nextEMIDate: event.data.nextEMIDate,
        }
      );

      // SMS confirmation will be sent by job-worker processing the payment.recorded event

      // Publish event for job-worker to update dashboards and check loan closure
      await notificationAdapter.publishEvent({
        eventType: 'payment.recorded',
        userId: event.data.customerId,
        metadata: {
          paymentId: event.aggregateId,
          loanId: event.data.loanId,
          amount: event.data.amount,
          remainingBalance: event.data.remainingBalance,
        },
      });

      // Audit logging will be added later via separate audit system

      logger.info('[PaymentHandler] Payment confirmation sent', { paymentId: event.aggregateId });
    } catch (err) {
      logger.error('[PaymentHandler] Error handling payment.recorded', { error: err, paymentId: event.aggregateId });
    }
  });
}

/**
 * Handle: Payment failed
 * 
 * Send failure notification to customer
 * Suggest retry options
 */
export function setupPaymentFailedHandler(): void {
  eventBus.onEvent<PaymentFailedEvent>('payment.failed', async (event) => {
    try {
      logger.warn('[PaymentHandler] Payment failed event received', {
        paymentId: event.aggregateId,
        error: event.data.errorCode,
      });

      // Send failure notification with retry options
      await notificationAdapter.sendEmail(
        event.data.customerEmail,
        'payment-failed',
        {
          customerName: event.data.customerName,
          loanId: event.data.loanId,
          amount: event.data.amount,
          errorMessage: event.data.errorMessage,
          retryLink: event.data.retryLink,
        }
      );

      // SMS alert will be sent by job-worker processing the payment.failed event

      // Publish event for job-worker to track failures and alert admin if needed
      await notificationAdapter.publishEvent({
        eventType: 'payment.failed',
        userId: event.data.customerId,
        metadata: {
          paymentId: event.aggregateId,
          loanId: event.data.loanId,
          errorCode: event.data.errorCode,
          attemptCount: event.data.attemptCount,
        },
      });

      // Audit logging will be added later via separate audit system

      logger.info('[PaymentHandler] Payment failure notification sent', { paymentId: event.aggregateId });
    } catch (err) {
      logger.error('[PaymentHandler] Error handling payment.failed', { error: err, paymentId: event.aggregateId });
    }
  });
}

/**
 * Initialize all payment event handlers
 */
export function initializePaymentHandlers(): void {
  setupPaymentRecordedHandler();
  setupPaymentFailedHandler();
  logger.info('[EventHandlers] Payment event handlers initialized');
}

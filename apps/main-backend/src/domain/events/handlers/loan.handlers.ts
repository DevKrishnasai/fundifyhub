/**
 * Loan Event Handlers
 * 
 * Respond to loan domain events:
 * - Send disbursement notifications
 * - Send EMI reminders
 * - Update metrics
 * 
 * @module domain/events/handlers
 */

import { eventBus } from '../bus';
import type { LoanDisbursedEvent } from '../../requests/requests.events';
import { notificationAdapter } from '../../../infra-adapters';
import logger from '../../../utils/logger';

/**
 * Handle: Loan disbursed
 * 
 * Send confirmation to customer
 * Update statistics
 * Log for audit trail
 */
export function setupLoanDisbursedHandler(): void {
  eventBus.onEvent<LoanDisbursedEvent>('loan.disbursed', async (event) => {
    try {
      logger.info('[LoanHandler] Loan disbursed event received', {
        loanId: event.aggregateId,
        customerId: event.data.customerId,
      });

      // Send disbursement confirmation email with EMI schedule
      await notificationAdapter.sendEmail(
        event.data.customerEmail,
        'loan-disbursed',
        {
          customerName: event.data.customerName,
          loanId: event.aggregateId,
          disbursedAmount: event.data.disbursedAmount,
          tenureMonths: event.data.tenureMonths,
          emiAmount: event.data.emiAmount,
          firstEMIDate: event.data.firstEMIDate,
        }
      );

      // WhatsApp notification will be sent by job-worker processing the loan.disbursed event

      // Publish event for job-worker to generate PDF and update dashboards
      await notificationAdapter.publishEvent({
        eventType: 'loan.disbursed',
        userId: event.data.customerId,
        metadata: {
          loanId: event.aggregateId,
          requestId: event.data.requestId,
          amount: event.data.disbursedAmount,
          tenureMonths: event.data.tenureMonths,
        },
      });

      // Audit logging will be added later via separate audit system

      logger.info('[LoanHandler] Loan disbursement notifications sent', { loanId: event.aggregateId });
    } catch (err) {
      logger.error('[LoanHandler] Error handling loan.disbursed', { error: err, loanId: event.aggregateId });
    }
  });
}

/**
 * Initialize all loan event handlers
 */
export function initializeLoanHandlers(): void {
  setupLoanDisbursedHandler();
  logger.info('[EventHandlers] Loan event handlers initialized');
}

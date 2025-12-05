/**
 * Event Handlers Initialization
 * 
 * Central export for all event handlers
 * Call this during app startup to register handlers
 */

export { initializeRequestHandlers } from './request.handlers';
export { initializeLoanHandlers } from './loan.handlers';
export { initializePaymentHandlers } from './payment.handlers';
export { initializeAuctionHandlers } from './auction.handlers';

/**
 * Initialize all event handlers
 * 
 * Call this in server.ts during app startup
 */
export function initializeAllHandlers(): void {
  const { initializeRequestHandlers } = require('./request.handlers');
  const { initializeLoanHandlers } = require('./loan.handlers');
  const { initializePaymentHandlers } = require('./payment.handlers');
  const { initializeAuctionHandlers } = require('./auction.handlers');

  initializeRequestHandlers();
  initializeLoanHandlers();
  initializePaymentHandlers();
  initializeAuctionHandlers();

  console.log('[EventHandlers] All event handlers initialized');
}

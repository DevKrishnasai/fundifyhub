import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { createPhonePeOrderController, verifyPhonePePaymentController } from './phonepe';
import { phonePeWebhookController } from './webhook';
import { getLoanTotalDueController } from './controllers';
import { authMiddleware } from '../../utils/jwt';

const router: ExpressRouter = Router();

/**
 * GET /api/v1/payments/loan/:loanId/total-due
 * Get total due amount for a loan
 */
router.get('/loan/:loanId/total-due', authMiddleware, getLoanTotalDueController);

/**
 * POST /api/v1/payments/phonepe/create-order
 * Create a PhonePe payment order
 */
router.post('/phonepe/create-order', authMiddleware, createPhonePeOrderController);

/**
 * POST /api/v1/payments/phonepe/verify
 * Verify PhonePe payment after redirect
 */
router.post('/phonepe/verify', authMiddleware, verifyPhonePePaymentController);

/**
 * POST /api/v1/payments/phonepe/webhook
 * PhonePe webhook endpoint for async notifications
 * Note: Webhook should have raw body parsing for signature verification
 */
router.post('/phonepe/webhook', phonePeWebhookController);

export default router;

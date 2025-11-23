import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { createRazorpayOrderController, verifyRazorpayPaymentController, razorpayWebhookController } from './razorpay';
import { getLoanTotalDueController, payEmiController } from './controllers';
import { authMiddleware } from '../../utils/jwt';

const router: ExpressRouter = Router();

/**
 * GET /api/v1/payments/loan/:loanId/total-due
 * Get total due amount for a loan
 */
router.get('/loan/:loanId/total-due', authMiddleware, getLoanTotalDueController);

/**
 * POST /api/v1/payments/emi/pay
 * Pay a specific EMI with sequential validation
 */
router.post('/emi/pay', authMiddleware, payEmiController);

/**
 * POST /api/v1/payments/razorpay/create-order
 * Create a Razorpay payment order for EMI payment
 */
router.post('/razorpay/create-order', authMiddleware, createRazorpayOrderController);

/**
 * POST /api/v1/payments/razorpay/verify
 * Verify Razorpay payment after completion
 */
router.post('/razorpay/verify', authMiddleware, verifyRazorpayPaymentController);

/**
 * POST /api/v1/payments/razorpay/webhook
 * Razorpay webhook endpoint (NO AUTH - signature verified)
 * Handles payment.captured and payment.failed events
 */
router.post('/razorpay/webhook', razorpayWebhookController);

export default router;

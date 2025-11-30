import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
  createRazorpayOrderController,
  verifyRazorpayPaymentController,
  razorpayWebhookController,
  getEMIPaymentHistoryController,
  getPaymentOrderStatusController,
} from './razorpay';
import { getLoanTotalDueController, payEmiController, getEmiBreakdownController } from './controllers';
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
 * Verify Razorpay payment after completion (fallback for webhook)
 */
router.post('/razorpay/verify', authMiddleware, verifyRazorpayPaymentController);

/**
 * GET /api/v1/payments/razorpay/order/:orderId/status
 * Get payment order status for polling
 */
router.get('/razorpay/order/:orderId/status', authMiddleware, getPaymentOrderStatusController);

// NOTE: The Razorpay webhook route is mounted in server.ts with
// express.raw() middleware so the raw body can be used for signature
// verification. We intentionally do NOT add the webhook route here to
// avoid double mounting and to ensure the raw body remains intact.

/**
 * GET /api/v1/payments/emi/:emiId/history
 * Get payment attempt history for an EMI
 */
router.get('/emi/:emiId/history', authMiddleware, getEMIPaymentHistoryController);

/**
 * GET /api/v1/payments/emi/:emiId/breakdown
 * Get breakdown of an EMI payment
 */
router.get('/emi/:emiId/breakdown', authMiddleware, getEmiBreakdownController);

export default router;

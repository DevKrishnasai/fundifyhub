/**
 * Payments Routes
 *
 * POST /payments/orders - Create a payment order (e.g., with Razorpay)
 * POST /payments/verify - Verify a payment after completion
 *
 * @module api/http/routes/payments
 */

import { Router } from 'express';
import {
  authenticateUser,
  requireAuthentication,
  asyncHandler,
} from '../middlewares';
import { paymentsController } from '../controllers';

const router: Router = Router();

/**
 * POST /payments/orders
 * Create a payment order
 */
router.post(
  '/orders',
  authenticateUser,
  requireAuthentication,
  asyncHandler(paymentsController.createPaymentOrder)
);

/**
 * POST /payments/verify
 * Verify a payment
 */
router.post(
  '/verify',
  authenticateUser,
  requireAuthentication,
  asyncHandler(paymentsController.verifyPayment)
);

export default router;

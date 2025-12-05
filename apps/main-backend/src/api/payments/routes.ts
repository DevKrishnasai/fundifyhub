/**
 * Payment Routes
 *
 * Endpoints for payment processing, EMI management, and admin payment operations
 */

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
import {
  recordManualPaymentController,
  listPaymentsController,
  getPaymentDetailsController,
  listLoansWithPaymentSummaryController,
  listOverdueEmisController,
} from './manual';
import { authMiddleware } from '../../utils/jwt';

const router: ExpressRouter = Router();

// ============================================
// ADMIN MANUAL PAYMENT ROUTES
// ============================================

/**
 * @openapi
 * /payments/manual/record:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Record manual payment
 *     description: Record a manual payment (cash, cheque, bank transfer, UPI) - Admin only
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               loanId:
 *                 type: string
 *                 format: uuid
 *               emiId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, CHEQUE, BANK_TRANSFER, UPI]
 *               referenceNumber:
 *                 type: string
 *               notes:
 *                 type: string
 *             required:
 *               - loanId
 *               - emiId
 *               - amount
 *               - paymentMethod
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       400:
 *         description: Invalid request or payment amount
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 */
router.post('/manual/record', authMiddleware, recordManualPaymentController);

/**
 * @openapi
 * /payments/admin/list:
 *   get:
 *     tags:
 *       - Payments
 *     summary: List all payments
 *     description: List all payments with filters - Admin only
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, REFUNDED]
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [RAZORPAY, CASH, CHEQUE, BANK_TRANSFER, UPI]
 *       - in: query
 *         name: loanId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of payments
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/admin/list', authMiddleware, listPaymentsController);

/**
 * @openapi
 * /payments/admin/{paymentId}:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment details
 *     description: Get detailed information about a specific payment - Admin only
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment details
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Payment not found
 */
router.get('/admin/:paymentId', authMiddleware, getPaymentDetailsController);

/**
 * @openapi
 * /payments/admin/loans:
 *   get:
 *     tags:
 *       - Payments
 *     summary: List loans with payment summary
 *     description: List all loans with their payment summaries - Admin only
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, CLOSED, DEFAULTED]
 *     responses:
 *       200:
 *         description: List of loans with payment summaries
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/admin/loans', authMiddleware, listLoansWithPaymentSummaryController);

/**
 * @openapi
 * /payments/admin/emis/overdue:
 *   get:
 *     tags:
 *       - Payments
 *     summary: List overdue EMIs
 *     description: List all overdue EMIs across all loans - Admin only
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: daysOverdue
 *         schema:
 *           type: integer
 *         description: Minimum days overdue to filter by
 *     responses:
 *       200:
 *         description: List of overdue EMIs
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/admin/emis/overdue', authMiddleware, listOverdueEmisController);

// ============================================
// CUSTOMER PAYMENT ROUTES
// ============================================

/**
 * @openapi
 * /payments/loan/{loanId}/total-due:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get total due for loan
 *     description: Get total due amount including principal, interest, and penalties
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Total due breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDue:
 *                       type: number
 *                     principalDue:
 *                       type: number
 *                     interestDue:
 *                       type: number
 *                     penaltyDue:
 *                       type: number
 *                     overdueEmis:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Loan not found
 */
router.get('/loan/:loanId/total-due', authMiddleware, getLoanTotalDueController);

/**
 * @openapi
 * /payments/emi/pay:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Pay EMI
 *     description: Pay a specific EMI with sequential validation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emiId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [RAZORPAY, CASH, CHEQUE, BANK_TRANSFER, UPI]
 *             required:
 *               - emiId
 *               - amount
 *               - paymentMethod
 *     responses:
 *       200:
 *         description: EMI payment successful
 *       400:
 *         description: Invalid payment or amount mismatch
 *       401:
 *         description: Not authenticated
 */
router.post('/emi/pay', authMiddleware, payEmiController);

/**
 * @openapi
 * /payments/razorpay/create-order:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Create Razorpay order
 *     description: Create a Razorpay payment order for EMI payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emiId:
 *                 type: string
 *                 format: uuid
 *               amount:
 *                 type: number
 *             required:
 *               - emiId
 *               - amount
 *     responses:
 *       200:
 *         description: Razorpay order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     key:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *       400:
 *         description: Invalid request
 */
router.post('/razorpay/create-order', authMiddleware, createRazorpayOrderController);

/**
 * @openapi
 * /payments/razorpay/verify:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Verify Razorpay payment
 *     description: Verify Razorpay payment after completion (fallback for webhook)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Payment verification failed
 *       401:
 *         description: Not authenticated
 */
router.post('/razorpay/verify', authMiddleware, verifyRazorpayPaymentController);

/**
 * @openapi
 * /payments/razorpay/order/{orderId}/status:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get payment order status
 *     description: Get payment order status for polling during payment flow
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [PENDING, COMPLETED, FAILED]
 *                     paymentId:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Order not found
 */
router.get('/razorpay/order/:orderId/status', authMiddleware, getPaymentOrderStatusController);

// NOTE: The Razorpay webhook route is mounted in server.ts with
// express.raw() middleware so the raw body can be used for signature
// verification. We intentionally do NOT add the webhook route here to
// avoid double mounting and to ensure the raw body remains intact.

/**
 * @openapi
 * /payments/emi/{emiId}/history:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get EMI payment history
 *     description: Get payment attempt history for an EMI
 *     parameters:
 *       - in: path
 *         name: emiId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment history
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: EMI not found
 */
router.get('/emi/:emiId/history', authMiddleware, getEMIPaymentHistoryController);

/**
 * @openapi
 * /payments/emi/{emiId}/breakdown:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Get EMI breakdown
 *     description: Get detailed breakdown of EMI payment including principal, interest, and penalties
 *     parameters:
 *       - in: path
 *         name: emiId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: EMI breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     emiAmount:
 *                       type: number
 *                     principalAmount:
 *                       type: number
 *                     interestAmount:
 *                       type: number
 *                     penaltyAmount:
 *                       type: number
 *                     totalDue:
 *                       type: number
 *                     dueDate:
 *                       type: string
 *                       format: date
 *                     daysOverdue:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: EMI not found
 */
router.get('/emi/:emiId/breakdown', authMiddleware, getEmiBreakdownController);

export default router;

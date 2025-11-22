import type { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { prisma } from '@fundifyhub/prisma';
import { PAYMENT_METHOD, PAYMENT_STATUS, EMI_STATUS, PAYMENT_TYPE, OVERDUE_GRACE_PERIOD_DAYS } from '@fundifyhub/types';
import { calculateEmiBreakdown } from '@fundifyhub/utils';
import logger from '../../utils/logger';

// Razorpay configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Validate Razorpay credentials on startup
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  logger.warn('Razorpay credentials not configured. Payment features will not work.');
}

// Initialize Razorpay instance
let razorpay: Razorpay | null = null;
try {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} catch (error) {
  logger.error(`Failed to initialize Razorpay: ${error}`);
}

/**
 * Verify Razorpay payment signature
 * @param orderId - Razorpay order ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Razorpay signature from callback
 * @returns boolean - true if signature is valid
 */
function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const text = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');
  return expectedSignature === signature;
}

/**
 * POST /api/v1/payments/razorpay/create-order
 * Creates a Razorpay order for EMI payment
 * 
 * @body loanId - Loan ID
 * @body emiId - EMI schedule ID to pay
 * @body amount - Payment amount in INR
 * @returns Razorpay order details
 */
export const createRazorpayOrderController = async (req: Request, res: Response) => {
  try {
    if (!razorpay) {
      logger.error('Razorpay not initialized. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment gateway not configured. Please contact support.' 
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { loanId, emiId, amount } = req.body;

    if (!loanId || !emiId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Loan ID, EMI ID, and amount are required' 
      });
    }

    // Validate loan ownership
    const loan = await prisma.loan.findFirst({
      where: { id: loanId, request: { customerId: userId } },
      include: { 
        request: { include: { customer: true } },
        emisSchedule: { orderBy: { emiNumber: 'asc' } }
      }
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    // Find the first unpaid EMI (enforce sequential payment)
    const firstUnpaidEmi = await prisma.eMISchedule.findFirst({
      where: {
        loanId,
        status: { in: [EMI_STATUS.PENDING, EMI_STATUS.OVERDUE] }
      },
      orderBy: { emiNumber: 'asc' }
    });

    if (!firstUnpaidEmi) {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending EMIs found. All EMIs are already paid!' 
      });
    }

    // Validate that customer is trying to pay the first unpaid EMI (no skipping)
    if (firstUnpaidEmi.id !== emiId) {
      return res.status(400).json({ 
        success: false, 
        message: `Please pay EMI #${firstUnpaidEmi.emiNumber} first (due on ${firstUnpaidEmi.dueDate.toLocaleDateString('en-IN')}). EMIs must be paid in order.`,
        data: {
          nextEmiDue: {
            id: firstUnpaidEmi.id,
            emiNumber: firstUnpaidEmi.emiNumber,
            dueDate: firstUnpaidEmi.dueDate,
            amount: firstUnpaidEmi.emiAmount,
            status: firstUnpaidEmi.status
          }
        }
      });
    }

    // Now get the EMI with full details (we know it's the first unpaid one)
    const emi = firstUnpaidEmi;

    // Get penalty rates from request (with defaults)
    const penaltyRate = loan.request.penaltyPercentage || 4; // Default 4%
    const lateFeeRate = loan.request.LateFeePercentage || 0.01; // Default 0.01%

    // Calculate penalty breakdown with daily penalty
    const breakdown = calculateEmiBreakdown(
      {
        emiNumber: emi.emiNumber,
        emiAmount: emi.emiAmount,
        principalAmount: emi.principalAmount,
        interestAmount: emi.interestAmount,
        status: emi.status,
        dueDate: emi.dueDate.toISOString(),
      },
      loan.emisSchedule.map(e => ({
        emiNumber: e.emiNumber,
        status: e.status,
        emiAmount: e.emiAmount,
        lateFee: e.lateFee,
        dueDate: e.dueDate.toISOString(),
      })),
      penaltyRate,
      lateFeeRate,
      new Date(), // Current date for days late calculation
      OVERDUE_GRACE_PERIOD_DAYS
    );

    // Total amount = EMI amount + penalty (no partial payments allowed)
    const totalAmount = breakdown.totalDue;

    // Validate exact amount (no partial payments)
    if (Math.abs(amount - totalAmount) > 0.01) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid amount. Expected ₹${totalAmount.toFixed(2)} (EMI: ₹${breakdown.emiAmount.toFixed(2)} + Penalty: ₹${breakdown.penalty.toFixed(2)})`,
        data: {
          breakdown: {
            principal: breakdown.principal,
            interest: breakdown.interest,
            overdue: breakdown.overdue,
            overdueEmiPenalty: breakdown.overdueEmiPenalty,
            daysLate: breakdown.daysLate,
            latePaymentPenalty: breakdown.latePaymentPenalty,
            penalty: breakdown.penalty,
            totalDue: breakdown.totalDue,
          }
        }
      });
    }

    // Create Razorpay order with penalty included
    const razorpayOrder = await razorpay!.orders.create({
      amount: Math.round(totalAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `EMI_${emi.emiNumber}_${loanId.substring(0, 8)}`,
      notes: {
        loanId,
        emiId,
        emiNumber: emi.emiNumber.toString(),
        customerId: userId,
        emiAmount: breakdown.emiAmount.toString(),
        penalty: breakdown.penalty.toString(),
        overdue: breakdown.overdue.toString(),
        totalAmount: totalAmount.toString(),
      },
    });

    logger.info(`Razorpay order created: ${razorpayOrder.id} for EMI #${emi.emiNumber} (₹${totalAmount})`);

    return res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        loanId,
        emiId,
        emiNumber: emi.emiNumber,
        keyId: RAZORPAY_KEY_ID,
        customerName: `${loan.request.customer?.firstName || ''} ${loan.request.customer?.lastName || ''}`.trim(),
        customerPhone: loan.request.customer?.phoneNumber || '',
        customerEmail: loan.request.customer?.email || '',
        breakdown: {
          principal: breakdown.principal,
          interest: breakdown.interest,
          overdue: breakdown.overdue,
          overdueEmiPenalty: breakdown.overdueEmiPenalty,
          daysLate: breakdown.daysLate,
          latePaymentPenalty: breakdown.latePaymentPenalty,
          penalty: breakdown.penalty,
          emiAmount: breakdown.emiAmount,
          totalDue: breakdown.totalDue,
        },
      },
    });
  } catch (error) {
    logger.error('Error creating Razorpay order', error as Error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create payment order' 
    });
  }
};

/**
 * POST /api/v1/payments/razorpay/verify
 * Verifies Razorpay payment and updates EMI status
 * 
 * @body orderId - Razorpay order ID
 * @body paymentId - Razorpay payment ID
 * @body signature - Razorpay signature
 * @body loanId - Loan ID
 * @body emiId - EMI schedule ID
 * @returns Payment verification result
 */
export const verifyRazorpayPaymentController = async (req: Request, res: Response) => {
  try {
    if (!razorpay) {
      logger.error('Razorpay not initialized. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
      return res.status(500).json({ 
        success: false, 
        message: 'Payment gateway not configured. Please contact support.' 
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { orderId, paymentId, signature, loanId, emiId } = req.body;

    if (!orderId || !paymentId || !signature || !loanId || !emiId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required payment verification data' 
      });
    }

    // Verify signature
    const isValidSignature = verifyRazorpaySignature(orderId, paymentId, signature);
    
    if (!isValidSignature) {
      logger.warn(`Invalid Razorpay signature for order ${orderId}, payment ${paymentId}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed: Invalid signature' 
      });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay!.payments.fetch(paymentId);
    
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return res.status(400).json({ 
        success: false, 
        message: `Payment not successful. Status: ${payment.status}` 
      });
    }

    // Check for duplicate payment
    const existingPayment = await prisma.payment.findFirst({
      where: { paymentReference: paymentId }
    });

    if (existingPayment) {
      logger.info(`Duplicate payment attempt: ${paymentId}`);
      return res.json({ 
        success: true, 
        message: 'Payment already processed',
        data: existingPayment 
      });
    }

    // Process payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get EMI details with all EMIs for penalty calculation
      const emi = await tx.eMISchedule.findUnique({
        where: { id: emiId },
        include: { loan: { include: { emisSchedule: { orderBy: { emiNumber: 'asc' } } } } }
      });

      if (!emi) {
        throw new Error('EMI not found');
      }

      // Verify loan ownership
      const loan = await tx.loan.findFirst({
        where: { id: loanId, request: { customerId: userId } }
      });

      if (!loan) {
        throw new Error('Loan not found or unauthorized');
      }

      const paidAmount = Number(payment.amount) / 100; // Convert from paise to INR

      // Calculate penalty breakdown from payment notes
      const paymentNotes = payment.notes || {};
      const penalty = Number(paymentNotes.penalty || 0);
      const emiAmount = Number(paymentNotes.emiAmount || emi.emiAmount);

      // Validate payment amount matches expected total
      const expectedTotal = emiAmount + penalty;
      if (Math.abs(paidAmount - expectedTotal) > 0.01) {
        logger.warn(`Payment amount mismatch: paid ${paidAmount}, expected ${expectedTotal}`);
      }

      // Create payment record (full payment, no partial)
      const paymentRecord = await tx.payment.create({
        data: {
          loanId,
          requestId: emi.requestId,
          emiScheduleId: emi.id,
          amount: paidAmount,
          paymentType: PAYMENT_TYPE.EMI, // No PARTIAL allowed
          paymentMethod: PAYMENT_METHOD.RAZORPAY,
          paymentReference: paymentId,
          processedBy: userId,
          remarks: penalty > 0 
            ? `Razorpay Order: ${orderId} (EMI: ₹${emiAmount.toFixed(2)} + Penalty: ₹${penalty.toFixed(2)})`
            : `Razorpay Order: ${orderId}`,
        },
      });

      // Update EMI status and record penalty
      await tx.eMISchedule.update({
        where: { id: emi.id },
        data: { 
          status: EMI_STATUS.PAID,
          paidDate: new Date(),
          paidAmount,
          lateFee: penalty, // Record penalty in late fee column
        },
      });

      // Update loan statistics
      const paidEMIs = await tx.eMISchedule.count({
        where: { loanId, status: EMI_STATUS.PAID }
      });

      const totalPaid = await tx.payment.aggregate({
        where: { loanId },
        _sum: { amount: true }
      });

      const remainingEMIs = await tx.eMISchedule.count({
        where: { loanId, status: { in: [EMI_STATUS.PENDING, EMI_STATUS.OVERDUE] } }
      });

      const overdueEMIs = await tx.eMISchedule.count({
        where: { loanId, status: EMI_STATUS.OVERDUE }
      });

      await tx.loan.update({
        where: { id: loanId },
        data: {
          paidEMIs,
          totalPaidAmount: totalPaid._sum.amount || 0,
          remainingEMIs,
          remainingAmount: loan.totalAmount - (totalPaid._sum.amount || 0),
          overdueEMIs,
        },
      });

      logger.info(`EMI #${emi.emiNumber} marked as PAID. Penalty: ₹${penalty.toFixed(2)}`);

      return { payment: paymentRecord, emi, penalty };
    });

    logger.info(`Payment verified and processed: ${paymentId} for loan ${loanId}`);

    return res.json({
      success: true,
      message: 'Payment verified and EMI updated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Error verifying Razorpay payment', error as Error);
    return res.status(500).json({ 
      success: false, 
      message: 'Payment verification failed' 
    });
  }
};

/**
 * POST /api/v1/payments/razorpay/webhook
 * Razorpay webhook endpoint for payment events
 * 
 * Handles payment.captured and payment.failed events
 * No authentication required - webhook signature is verified instead
 */
export const razorpayWebhookController = async (req: Request, res: Response) => {
  try {
    // Get webhook signature from headers
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    
    if (!webhookSignature) {
      logger.warn('Webhook received without signature');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing webhook signature' 
      });
    }

    // Verify webhook signature using webhook secret
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET;
    const webhookBody = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      logger.warn('Invalid webhook signature');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid webhook signature' 
      });
    }

    // Parse webhook event
    const event = req.body.event;
    const payload = req.body.payload;

    logger.info(`Webhook received: ${event}, paymentId: ${payload?.payment?.entity?.id}`);

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;
      
      case 'payment.authorized':
        logger.info(`Payment authorized: ${payload?.payment?.entity?.id}`);
        // Optional: Handle authorized payments if needed
        break;
      
      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    // Always return 200 to acknowledge webhook receipt
    return res.status(200).json({ success: true, message: 'Webhook processed' });
    
  } catch (error) {
    logger.error('Webhook processing error', error as Error);
    // Still return 200 to prevent Razorpay from retrying
    return res.status(200).json({ success: true, message: 'Webhook acknowledged' });
  }
};

/**
 * Handle payment.captured webhook event
 */
async function handlePaymentCaptured(payload: any) {
  try {
    const payment = payload?.payment?.entity;
    if (!payment) {
      logger.warn('Payment data missing in captured webhook');
      return;
    }

    const paymentId = payment.id;
    const orderId = payment.order_id;
    const amount = Number(payment.amount) / 100; // Convert from paise to INR
    const notes = payment.notes || {};

    logger.info(`Processing payment.captured: ${paymentId}, order: ${orderId}, amount: ₹${amount}`);

    // Check if payment already processed
    const existingPayment = await prisma.payment.findFirst({
      where: { paymentReference: paymentId }
    });

    if (existingPayment) {
      logger.info(`Payment already processed: ${paymentId}`);
      return;
    }

    // Extract metadata from notes
    const loanId = notes.loanId;
    const emiId = notes.emiId;
    const customerId = notes.customerId;

    if (!loanId || !emiId || !customerId) {
      logger.warn(`Missing required metadata in payment notes: ${JSON.stringify(notes)}`);
      return;
    }

    // Process payment in transaction (same logic as verify endpoint)
    await prisma.$transaction(async (tx) => {
      const emi = await tx.eMISchedule.findUnique({
        where: { id: emiId },
        include: { loan: { include: { emisSchedule: { orderBy: { emiNumber: 'asc' } } } } }
      });

      if (!emi) {
        logger.warn(`EMI not found: ${emiId}`);
        return;
      }

      const loan = emi.loan;
      const penalty = Number(notes.penalty || 0);
      const emiAmount = Number(notes.emiAmount || emi.emiAmount);

      // Create payment record
      const paymentRecord = await tx.payment.create({
        data: {
          loanId,
          requestId: emi.requestId,
          emiScheduleId: emi.id,
          amount,
          paymentType: PAYMENT_TYPE.EMI,
          paymentMethod: PAYMENT_METHOD.RAZORPAY,
          paymentReference: paymentId,
          processedBy: customerId,
          remarks: penalty > 0 
            ? `Webhook: ${orderId} (EMI: ₹${emiAmount.toFixed(2)} + Penalty: ₹${penalty.toFixed(2)})`
            : `Webhook: ${orderId}`,
        },
      });

      // Update EMI status
      await tx.eMISchedule.update({
        where: { id: emi.id },
        data: { 
          status: EMI_STATUS.PAID,
          paidDate: new Date(),
          paidAmount: amount,
          lateFee: penalty,
        },
      });

      // Update loan statistics
      const paidEMIs = await tx.eMISchedule.count({
        where: { loanId, status: EMI_STATUS.PAID }
      });

      const totalPaid = await tx.payment.aggregate({
        where: { loanId },
        _sum: { amount: true }
      });

      const remainingEMIs = await tx.eMISchedule.count({
        where: { loanId, status: { in: [EMI_STATUS.PENDING, EMI_STATUS.OVERDUE] } }
      });

      const overdueEMIs = await tx.eMISchedule.count({
        where: { loanId, status: EMI_STATUS.OVERDUE }
      });

      await tx.loan.update({
        where: { id: loanId },
        data: {
          paidEMIs,
          totalPaidAmount: totalPaid._sum.amount || 0,
          remainingEMIs,
          remainingAmount: loan.totalAmount - (totalPaid._sum.amount || 0),
          overdueEMIs,
        },
      });

      logger.info(`Webhook: EMI #${emi.emiNumber} marked as PAID (payment: ${paymentId}, loan: ${loanId}, amount: ₹${amount}, penalty: ₹${penalty})`);
    });

  } catch (error) {
    logger.error('Error handling payment.captured webhook', error as Error);
  }
}

/**
 * Handle payment.failed webhook event
 */
async function handlePaymentFailed(payload: any) {
  try {
    const payment = payload?.payment?.entity;
    if (!payment) {
      logger.warn('Payment data missing in failed webhook');
      return;
    }

    const paymentId = payment.id;
    const orderId = payment.order_id;
    const errorCode = payment.error_code;
    const errorDescription = payment.error_description;
    const notes = payment.notes || {};

    logger.warn(`Payment failed: ${paymentId}, order: ${orderId}, error: ${errorCode} - ${errorDescription}, loan: ${notes.loanId}`);

    // Optional: Send notification to customer about failed payment
    // Optional: Create a failed payment record for tracking

  } catch (error) {
    logger.error('Error handling payment.failed webhook', error as Error);
  }
}

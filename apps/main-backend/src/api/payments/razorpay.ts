import type { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma, PaymentOrderStatus, Prisma } from '@fundifyhub/prisma';
import { 
  PAYMENT_METHOD, 
  EMI_STATUS, 
  PAYMENT_TYPE, 
  OVERDUE_GRACE_PERIOD_DAYS,
  PAYMENT_ORDER_STATUS,
  RAZORPAY_ORDER_EXPIRY_MINUTES,
  REQUEST_STATUS,
  LOAN_STATUS,
  ROLES,
  DEFAULT_PENALTY_PERCENTAGE,
  DEFAULT_LATE_FEE_PERCENTAGE,
} from '@fundifyhub/types';
import { calculateEmiBreakdown } from '@fundifyhub/utils';
import { sendEMIReminderNotification } from '../../utils/notifications';
import baseLogger from '../../utils/logger';
import config from '../../utils/config';

// Child logger for Razorpay operations
const logger = baseLogger.child('[Razorpay]');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/** Schema for create-order endpoint */
const createOrderSchema = z.object({
  loanId: z.string().min(1, 'Loan ID is required'),
  emiId: z.string().min(1, 'EMI ID is required'),
});

/** Schema for verify endpoint */
const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  signature: z.string().min(1, 'Signature is required'),
  loanId: z.string().min(1, 'Loan ID is required'),
  emiId: z.string().min(1, 'EMI ID is required'),
});

// ============================================================================
// CONFIGURATION (from centralized config)
// ============================================================================

const { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET, webhookSecret: RAZORPAY_WEBHOOK_SECRET } = config.razorpay;

// Validate Razorpay credentials on startup
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  logger.error('Razorpay credentials not configured. Payment features will not work.');
}

// Initialize Razorpay instance
let razorpay: Razorpay | null = null;
try {
  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
    logger.info('Razorpay SDK initialized successfully');
  }
} catch (error) {
  logger.error('Failed to initialize Razorpay SDK', error as Error);
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify Razorpay payment signature (for frontend callback - optional fallback)
 */
function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const text = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');
  return expectedSignature === signature;
}

/**
 * Verify webhook signature using Razorpay webhook secret
 */
function verifyWebhookSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update loan statistics after EMI payment
 */
async function updateLoanStatistics(tx: Prisma.TransactionClient, loanId: string): Promise<void> {
  const loan = await tx.loan.findUnique({ where: { id: loanId } });
  if (!loan) {
    logger.warn(`updateLoanStatistics: Loan not found: ${loanId}`);
    return;
  }

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

  const totalPaidAmount = totalPaid._sum.amount || 0;

  await tx.loan.update({
    where: { id: loanId },
    data: {
      paidEMIs,
      totalPaidAmount,
      remainingEMIs,
      remainingAmount: loan.totalAmount - totalPaidAmount,
      overdueEMIs,
    },
  });

  logger.info(`Loan stats updated: ${loanId} - Paid: ${paidEMIs}, Remaining: ${remainingEMIs}, Overdue: ${overdueEMIs}`);
}

/**
 * Check and complete loan if all EMIs are paid
 */
async function checkAndCompleteLoan(tx: Prisma.TransactionClient, loanId: string, requestId: string): Promise<boolean> {
  const remainingEMIs = await tx.eMISchedule.count({
    where: { loanId, status: { in: [EMI_STATUS.PENDING, EMI_STATUS.OVERDUE] } }
  });

  if (remainingEMIs === 0) {
    const loan = await tx.loan.update({
      where: { id: loanId },
      data: {
        status: LOAN_STATUS.COMPLETED,
        closedDate: new Date(),
        closureType: 'NORMAL',
      },
    });

    await tx.request.update({
      where: { id: requestId },
      data: { currentStatus: REQUEST_STATUS.COMPLETED },
    });

    logger.info(`🎉 LOAN COMPLETED: ${loanId} - All EMIs paid!`);
    return true;
  }
  return false;
}

/**
 * Core payment processing logic - used by webhook (primary) and verify (fallback)
 * 
 * IMPORTANT: This function processes payments atomically with proper idempotency.
 * The idempotency check is performed INSIDE the transaction to prevent race conditions.
 */
async function processPayment(params: {
  paymentId: string;
  orderId: string;
  amount: number;
  method: string | null;
  signature?: string;
  notes: Record<string, string>;
  source: 'webhook' | 'verify';
}): Promise<{ success: boolean; message: string; isCompleted?: boolean; isRetryable?: boolean }> {
  const { paymentId, orderId, amount, method, signature, notes, source } = params;

  logger.info(`[${source.toUpperCase()}] Processing payment: ${paymentId}, order: ${orderId}, amount: ₹${amount}`);

  const { loanId, requestId, emiId, customerId } = notes;

  // Handle both old format (IDs) and new format (user-friendly identifiers)
  let actualLoanId = loanId;
  let actualRequestId = requestId;
  let actualEmiId = emiId;
  let actualCustomerId = customerId;

  // If using new format with user-friendly identifiers, look up the actual IDs
  if (notes.loanNumber && !loanId) {
    // Find loan by loanNumber
    const loan = await prisma.loan.findFirst({
      where: { loanNumber: notes.loanNumber },
      select: { id: true, requestId: true }
    });
    if (loan) {
      actualLoanId = loan.id;
      actualRequestId = loan.requestId;
    }
  }

  if (notes.requestNumber && !requestId) {
    // Find request by requestNumber
    const request = await prisma.request.findFirst({
      where: { requestNumber: notes.requestNumber },
      select: { id: true, customerId: true }
    });
    if (request) {
      actualRequestId = request.id;
      actualCustomerId = request.customerId;
    }
  }

  if (notes.emiNumber && !emiId && actualLoanId) {
    // Find EMI by loanId and emiNumber
    const emi = await prisma.eMISchedule.findFirst({
      where: { 
        loanId: actualLoanId,
        emiNumber: parseInt(notes.emiNumber)
      },
      select: { id: true }
    });
    if (emi) {
      actualEmiId = emi.id;
    }
  }

  if (notes.customerEmail && !customerId) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: notes.customerEmail },
      select: { id: true }
    });
    if (user) {
      actualCustomerId = user.id;
    }
  }

  if (!actualLoanId || !actualEmiId || !actualRequestId) {
    logger.warn(`[${source.toUpperCase()}] Missing or invalid identifiers: loanId=${actualLoanId}, emiId=${actualEmiId}, requestId=${actualRequestId}`);
    return { success: false, message: 'Invalid payment metadata - could not resolve identifiers', isRetryable: false };
  }

  // Process in transaction with idempotency check INSIDE to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    // CRITICAL: Idempotency check INSIDE transaction to prevent duplicate payments
    // This prevents race condition where two webhooks could both pass the check before either inserts
    const existingPayment = await tx.payment.findFirst({
      where: { paymentReference: paymentId }
    });

    if (existingPayment) {
      logger.info(`[${source.toUpperCase()}] Payment already processed (within transaction): ${paymentId}`);
      return { alreadyProcessed: true };
    }

    const orderPenalty = Number(notes.penalty || 0);
    const orderEmiAmount = Number(notes.emiAmount || 0);
    
    // Get EMI with loan and request details for fresh penalty calculation
    const emi = await tx.eMISchedule.findUnique({
      where: { id: actualEmiId },
      include: { 
        loan: {
          include: {
            request: {
              select: { penaltyPercentage: true, lateFeePercentage: true }
            },
            emisSchedule: {
              select: { emiNumber: true, status: true, emiAmount: true, lateFee: true, dueDate: true },
              orderBy: { emiNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!emi) {
      logger.error(`[${source.toUpperCase()}] EMI not found: ${actualEmiId}`);
      throw new Error('EMI not found');
    }

    // Already paid? (double check)
    if (emi.status === EMI_STATUS.PAID) {
      logger.info(`[${source.toUpperCase()}] EMI already paid: ${actualEmiId}`);
      return { alreadyPaid: true };
    }

    // CRITICAL FIX: Recalculate penalty at payment time (not order creation time)
    // This ensures accurate penalty charges if days have passed since order was created
    const penaltyRate = emi.loan.request.penaltyPercentage || DEFAULT_PENALTY_PERCENTAGE;
    const lateFeeRate = emi.loan.request.lateFeePercentage || DEFAULT_LATE_FEE_PERCENTAGE;
    
    const freshBreakdown = calculateEmiBreakdown(
      {
        emiNumber: emi.emiNumber,
        emiAmount: emi.emiAmount,
        principalAmount: emi.principalAmount,
        interestAmount: emi.interestAmount,
        status: emi.status,
        dueDate: emi.dueDate.toISOString(),
      },
      emi.loan.emisSchedule.map(e => ({
        emiNumber: e.emiNumber,
        status: e.status,
        emiAmount: e.emiAmount,
        lateFee: e.lateFee,
        dueDate: e.dueDate.toISOString(),
      })),
      penaltyRate,
      lateFeeRate,
      new Date(), // Calculate as of NOW (payment time)
      OVERDUE_GRACE_PERIOD_DAYS
    );

    // Use freshly calculated penalty if it's higher (penalty can only increase over time)
    // Use the actual payment amount from Razorpay (amount) as the source of truth
    const penalty = Math.max(orderPenalty, freshBreakdown.penalty);
    const emiAmount = emi.emiAmount;
    
    if (freshBreakdown.penalty > orderPenalty) {
      logger.info(`[${source.toUpperCase()}] Penalty recalculated: ₹${orderPenalty} -> ₹${freshBreakdown.penalty} (${freshBreakdown.daysLate} days late)`);
    }

    // Update PaymentOrder
    const paymentOrder = await tx.paymentOrder.findUnique({
      where: { razorpayOrderId: orderId }
    });

    if (paymentOrder && paymentOrder.status !== PAYMENT_ORDER_STATUS.PAID) {
      await tx.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: PAYMENT_ORDER_STATUS.PAID,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature || null,
          paymentMethod: method,
          paidAt: new Date(),
        },
      });
      logger.info(`[${source.toUpperCase()}] PaymentOrder updated: ${paymentOrder.id}`);
    }

    // Create payment record
    const paymentRecord = await tx.payment.create({
      data: {
        loanId: actualLoanId,
        requestId: actualRequestId,
        emiScheduleId: actualEmiId,
        amount,
        paymentType: PAYMENT_TYPE.EMI,
        paymentMethod: PAYMENT_METHOD.RAZORPAY,
        paymentReference: paymentId,
        processedBy: actualCustomerId || 'system',
        remarks: penalty > 0 
          ? `EMI #${emi.emiNumber}: ₹${emiAmount.toFixed(2)} + Penalty: ₹${penalty.toFixed(2)}`
          : `EMI #${emi.emiNumber} payment`,
      },
    });
    logger.info(`[${source.toUpperCase()}] Payment record created: ${paymentRecord.id}`);

    // Update EMI status
    await tx.eMISchedule.update({
      where: { id: actualEmiId },
      data: { 
        status: EMI_STATUS.PAID,
        paidDate: new Date(),
        paidAmount: amount,
        lateFee: penalty,
      },
    });
    logger.info(`[${source.toUpperCase()}] EMI #${emi.emiNumber} marked as PAID`);

    // Update loan statistics
    await updateLoanStatistics(tx, actualLoanId);

    // Check for loan completion
    const isCompleted = await checkAndCompleteLoan(tx, actualLoanId, actualRequestId);

    return { emiNumber: emi.emiNumber, isCompleted };
  });

  if ('alreadyProcessed' in result) {
    return { success: true, message: 'Payment already processed', isRetryable: false };
  }

  if ('alreadyPaid' in result) {
    return { success: true, message: 'EMI already paid', isRetryable: false };
  }

  logger.info(`[${source.toUpperCase()}] ✅ EMI #${result.emiNumber} PAID successfully (₹${amount})`);

  // Send notification via job queue (background worker handles delivery)
  try {
    if (actualCustomerId) {
      const customer = await prisma.user.findUnique({ where: { id: actualCustomerId } });
      if (customer) {
        await sendEMIReminderNotification(
          {
            userId: customer.id,
            email: customer.email || undefined,
            phoneNumber: customer.phoneNumber || undefined,
            name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
          },
          {
            loanNumber: '',
            emiNumber: Number(result.emiNumber || 0),
            emiAmount: amount,
            dueDate: new Date().toISOString(),
            daysUntilDue: 0,
            totalOutstanding: 0,
          }
        );
      }
    }
  } catch (err) {
    logger.warn('Failed to enqueue EMI_REMINDER notification - ' + (err as Error).message);
  }
  return { 
    success: true, 
    message: result.isCompleted 
      ? 'Payment successful - Loan fully paid!' 
      : 'Payment successful',
    isCompleted: result.isCompleted
  };
}

/**
 * POST /api/v1/payments/razorpay/create-order
 * Creates a Razorpay order for EMI payment
 * 
 * ORDER REUSE LOGIC:
 * - For each EMI, we maintain a single PaymentOrder record
 * - If an active (CREATED/ATTEMPTED) non-expired order exists, return it
 * - If previous order is FAILED/EXPIRED, create a new Razorpay order but UPDATE the same PaymentOrder
 * - This ensures 1:1 mapping between EMI and PaymentOrder for proper audit trail
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
      logger.warn('Create order attempted without user authentication');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Validate request body
    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      logger.warn('Create order validation failed: ' + JSON.stringify(errors));
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors,
      });
    }

    const { loanId, emiId } = validation.data;
    logger.info(`Creating order - User: ${userId}, Loan: ${loanId}, EMI: ${emiId}`);

    logger.info('Validating loan ownership and fetching details...');
    // Validate loan ownership and get details
    const loan = await prisma.loan.findFirst({
      where: { id: loanId, request: { customerId: userId } },
      include: { 
        request: { include: { customer: true } },
        emisSchedule: { 
          select: { 
            id: true, emiNumber: true, dueDate: true, emiAmount: true, 
            principalAmount: true, interestAmount: true, status: true, 
            paidDate: true, paidAmount: true, lateFee: true 
          }, 
          orderBy: { emiNumber: 'asc' } 
        }
      }
    });

    if (!loan) {
      logger.warn(`Loan not found or access denied - loanId: ${loanId}, userId: ${userId}`);
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    logger.info(`Loan found: ${loan.loanNumber || loanId} with ${loan.emisSchedule.length} EMIs`);

    // INDUSTRY STANDARD: Allow paying ANY pending/overdue EMI (not just the first one)
    // Penalties from skipped EMIs will accumulate and be included in the payment
    // This matches HDFC, ICICI, SBI approach where customers can pay any pending EMI
    const requestedEmi = loan.emisSchedule.find(e => e.id === emiId);
    
    if (!requestedEmi) {
      logger.warn(`EMI not found - emiId: ${emiId}, loanId: ${loanId}`);
      return res.status(404).json({ 
        success: false, 
        message: 'EMI not found' 
      });
    }

    // Check if EMI is already paid
    if (requestedEmi.status === EMI_STATUS.PAID) {
      logger.info(`EMI #${requestedEmi.emiNumber} already paid`);
      return res.status(400).json({ 
        success: false, 
        message: `EMI #${requestedEmi.emiNumber} has already been paid.` 
      });
    }

    // Check if any EMI is pending (at least one must be unpaid)
    const hasPendingEmis = loan.emisSchedule.some(
      e => e.status === EMI_STATUS.PENDING || e.status === EMI_STATUS.OVERDUE
    );

    if (!hasPendingEmis) {
      logger.info(`All EMIs already paid for loan: ${loanId}`);
      return res.status(400).json({ 
        success: false, 
        message: 'No pending EMIs found. All EMIs are already paid!' 
      });
    }

    logger.info(`Requested EMI: #${requestedEmi.emiNumber}, status: ${requestedEmi.status}`);

    // Count skipped EMIs for informational purposes (penalties will be accumulated)
    const skippedEmis = loan.emisSchedule.filter(
      e => e.emiNumber < requestedEmi.emiNumber && 
           (e.status === EMI_STATUS.PENDING || e.status === EMI_STATUS.OVERDUE)
    );
    
    if (skippedEmis.length > 0) {
      logger.info(`Customer skipping ${skippedEmis.length} earlier EMI(s): ${skippedEmis.map(e => `#${e.emiNumber}`).join(', ')}`);
      logger.info(`Penalties from skipped EMIs will be accumulated in the payment amount`);
    }

    const emi = requestedEmi;

    // Get penalty rates from request (with defaults)
    const penaltyRate = loan.request.penaltyPercentage || DEFAULT_PENALTY_PERCENTAGE;
    const lateFeeRate = loan.request.lateFeePercentage || DEFAULT_LATE_FEE_PERCENTAGE;

    logger.info(`Calculating EMI breakdown - penaltyRate: ${penaltyRate}%, lateFeeRate: ${lateFeeRate}%`);

    // Calculate penalty breakdown (always recalculate for fresh penalty amount)
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
      new Date(),
      OVERDUE_GRACE_PERIOD_DAYS
    );

    const totalAmount = breakdown.totalDue;

    logger.info(`EMI #${emi.emiNumber} breakdown - Principal: ₹${breakdown.principal}, Interest: ₹${breakdown.interest}, Penalty: ₹${breakdown.penalty}, Total: ₹${totalAmount}`);

    // Check for existing PaymentOrder for this EMI
    const existingOrder = await prisma.paymentOrder.findFirst({
      where: { emiScheduleId: emiId },
      orderBy: { createdAt: 'desc' }, // Get the most recent one
    });

    // If an active (CREATED/ATTEMPTED) non-expired order exists, return it
    if (existingOrder && 
        [PAYMENT_ORDER_STATUS.CREATED, PAYMENT_ORDER_STATUS.ATTEMPTED].includes(existingOrder.status as any) &&
        new Date() < existingOrder.expiresAt) {
      
      logger.info(`Returning existing active PaymentOrder: ${existingOrder.razorpayOrderId}`);
      
      return res.json({
        success: true,
        data: {
          orderId: existingOrder.razorpayOrderId,
          paymentOrderId: existingOrder.id,
          amount: Math.round(existingOrder.totalAmount * 100),
          currency: 'INR',
          loanId,
          emiId,
          emiNumber: emi.emiNumber,
          keyId: RAZORPAY_KEY_ID,
          customerName: `${loan.request.customer?.firstName || ''} ${loan.request.customer?.lastName || ''}`.trim(),
          customerPhone: loan.request.customer?.phoneNumber || '',
          customerEmail: loan.request.customer?.email || '',
          breakdown: {
            principal: emi.principalAmount,
            interest: emi.interestAmount,
            penalty: existingOrder.penalty,
            emiAmount: existingOrder.emiAmount,
            totalDue: existingOrder.totalAmount,
          },
          existingOrder: true,
        },
      });
    }

    // Create new Razorpay order
    logger.info(`Creating new Razorpay order - amount: ₹${totalAmount} (${Math.round(totalAmount * 100)} paise)`);

    const razorpayOrder = await razorpay!.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: `EMI_${emi.emiNumber}_${loan.loanNumber || loanId.substring(0, 8)}`,
      notes: {
        loanNumber: loan.loanNumber || loanId,
        requestNumber: loan.request.requestNumber || loan.requestId,
        emiNumber: emi.emiNumber.toString(),
        customerEmail: loan.request.customer?.email || 'unknown',
        emiAmount: breakdown.emiAmount.toString(),
        penalty: breakdown.penalty.toString(),
        totalAmount: totalAmount.toString(),
      },
    });

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + RAZORPAY_ORDER_EXPIRY_MINUTES * 60 * 1000);

    // Create or update PaymentOrder record
    const paymentOrder = await prisma.$transaction(async (tx) => {
      let order;

      // If there's an existing failed/expired order for this EMI, update it with new Razorpay order
      if (existingOrder && 
          [PAYMENT_ORDER_STATUS.FAILED, PAYMENT_ORDER_STATUS.EXPIRED].includes(existingOrder.status as any)) {
        
        logger.info(`Updating existing failed/expired PaymentOrder ${existingOrder.id} with new Razorpay order`);
        
        order = await tx.paymentOrder.update({
          where: { id: existingOrder.id },
          data: {
            razorpayOrderId: razorpayOrder.id,
            emiAmount: breakdown.emiAmount,
            penalty: breakdown.penalty,
            totalAmount,
            status: PAYMENT_ORDER_STATUS.CREATED,
            attempts: existingOrder.attempts, // Keep the attempt count
            lastAttemptAt: null,
            razorpayPaymentId: null,
            razorpaySignature: null,
            paymentMethod: null,
            paidAt: null,
            failureReason: null,
            failureCode: null,
            notes: {
              principal: breakdown.principal,
              interest: breakdown.interest,
              overdue: breakdown.overdue,
              overdueEmiPenalty: breakdown.overdueEmiPenalty,
              daysLate: breakdown.daysLate,
              latePaymentPenalty: breakdown.latePaymentPenalty,
              previousOrderId: existingOrder.razorpayOrderId,
            },
            expiresAt,
          },
        });
      } else {
        // Create new PaymentOrder
        order = await tx.paymentOrder.create({
          data: {
            razorpayOrderId: razorpayOrder.id,
            loanId,
            requestId: loan.requestId,
            emiScheduleId: emiId,
            customerId: userId,
            emiAmount: breakdown.emiAmount,
            penalty: breakdown.penalty,
            totalAmount,
            status: PAYMENT_ORDER_STATUS.CREATED,
            notes: {
              principal: breakdown.principal,
              interest: breakdown.interest,
              overdue: breakdown.overdue,
              overdueEmiPenalty: breakdown.overdueEmiPenalty,
              daysLate: breakdown.daysLate,
              latePaymentPenalty: breakdown.latePaymentPenalty,
            },
            expiresAt,
          },
        });
      }

      return order;
    });

    logger.info(`PaymentOrder ${existingOrder ? 'updated' : 'created'}: ${paymentOrder.id}, Razorpay: ${razorpayOrder.id} for EMI #${emi.emiNumber} (₹${totalAmount})`);

    return res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        paymentOrderId: paymentOrder.id,
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
 * Verifies Razorpay payment and updates EMI status (fallback when webhook is slow)
 * - Updates PaymentOrder status to PAID
 * - Creates Payment record
 * - Updates EMI and Loan statistics
 * - Adds request history entry
 */
export const verifyRazorpayPaymentController = async (req: Request, res: Response) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ 
        success: false, 
        message: 'Payment gateway not configured. Please contact support.' 
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      logger.warn('Verify payment attempted without user authentication');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Validate request body
    const validation = verifyPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      logger.warn('Verify payment validation failed: ' + JSON.stringify(errors));
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required payment verification data',
        errors,
      });
    }

    const { orderId, paymentId, signature, loanId, emiId } = validation.data;
    logger.info(`Verifying payment - orderId: ${orderId}, paymentId: ${paymentId}, loanId: ${loanId}, emiId: ${emiId}`);

    logger.info('Verifying Razorpay signature...');
    // Verify signature
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      logger.warn(`Invalid Razorpay signature for order ${orderId}, payment ${paymentId}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed: Invalid signature' 
      });
    }

    logger.info('Signature verified ✓, fetching payment details from Razorpay...');
    // Fetch payment details from Razorpay
    const payment = await razorpay!.payments.fetch(paymentId);
    logger.info(`Razorpay payment status: ${payment.status}, amount: ₹${Number(payment.amount) / 100}`);
    
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      logger.warn(`Payment not successful - status: ${payment.status}`);
      return res.status(400).json({ 
        success: false, 
        message: `Payment not successful. Status: ${payment.status}` 
      });
    }

    logger.info('Payment captured/authorized ✓, checking for duplicates...');
    // Check for duplicate payment (idempotency)
    const existingPayment = await prisma.payment.findFirst({
      where: { paymentReference: paymentId }
    });

    if (existingPayment) {
      logger.info(`Duplicate payment verification (already processed): ${paymentId}`);
      return res.json({ 
        success: true, 
        message: 'Payment already processed',
        data: existingPayment 
      });
    }

    // Delegate to centralized processPayment for consistent handling
    const notes = payment.notes || {};
    const method = payment.method || null;
    const amountNumeric = Number(payment.amount) / 100;

    const processed = await processPayment({
      paymentId,
      orderId,
      amount: amountNumeric,
      method,
      signature,
      notes,
      source: 'verify'
    });

    if (!processed.success) {
      logger.warn(`Verify fallback: processPayment failed: ${processed.message}`);
      return res.status(400).json({ success: false, message: processed.message || 'Payment processing failed' });
    }

    return res.json({
      success: true,
      message: processed.isCompleted 
        ? 'Payment verified - Loan fully paid!' 
        : 'Payment verified and EMI updated successfully',
      data: processed,
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
 * THIS IS THE PRIMARY HANDLER - Single source of truth for payment updates
 * 
 * Handles events:
 * - payment.captured: Process successful payment
 * - payment.authorized: Auto-capture or log for manual capture
 * - payment.failed: Update PaymentOrder status with failure info
 * - order.paid: Log order completion
 * - refund.created: Handle refunds (future)
 */
export const razorpayWebhookController = async (req: Request, res: Response) => {
  const webhookLogger = logger.child('[Webhook]');
  
  try {
    // ========================================
    // 1. SIGNATURE VERIFICATION
    // ========================================
    // Try standard header access and also attempt to find any header that looks like Razorpay signature
    const headers = req.headers as Record<string, string | string[] | undefined>;
    let webhookSignature = (headers['x-razorpay-signature'] as string) || (headers['X-Razorpay-Signature'] as string) || undefined;

    if (!webhookSignature) {
      // Try to find any header containing the words 'razorpay' and 'signature', fallback for proxies
      for (const [k, v] of Object.entries(headers)) {
        if (k && k.toLowerCase().includes('razorpay') && k.toLowerCase().includes('signature')) {
          webhookSignature = Array.isArray(v) ? v[0] : v;
          break;
        }
      }
    }

    if (!webhookSignature) {
      webhookLogger.warn('❌ Webhook received without signature header');
      // Log headers for debugging (avoid logging sensitive secrets - we'll log keys only)
      try {
        const headerEntries = Object.entries(headers)
          .slice(0, 50)
          .map(([k, v]) => ({ key: k, value: (typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '') }));

        // Build a debug-friendly map with redaction for potential secret headers
        const debugHeaders = headerEntries.reduce((acc, { key, value }) => {
          const lower = key.toLowerCase();
          if (lower.includes('signature') || lower.includes('token') || lower.includes('auth')) {
            acc[key] = value ? `${value.slice(0, 10)}... (redacted)` : '';
          } else {
            acc[key] = value || '';
          }
          return acc;
        }, {} as Record<string, string>);

        webhookLogger.debug('Webhook headers (redacted): ' + JSON.stringify(debugHeaders));
      } catch (err) {
        webhookLogger.debug('Failed to enumerate headers for debugging');
      }

      // Helpful diagnostic message for users
      if (headers['x-razorpay-event-id']) {
        webhookLogger.warn('Razorpay webhook event ID present but signature missing: Please ensure your webhook is configured with a secret in the Razorpay dashboard and that the signature header is forwarded by any proxy/ngrok.');
      }
      
      // SECURITY: Always require webhook signature verification
      // The bypass option has been removed for security reasons
      return res.status(400).json({
        success: false,
        message: 'Missing webhook signature. Ensure the Razorpay webhook is configured with a secret and that the signature header is forwarded to this endpoint (proxies/ngrok must not strip headers).',
      });
    }

  // Use the raw body if available (set by server middleware), otherwise stringify
  const webhookBody = req.rawBody ?? JSON.stringify(req.body);
    
  if (webhookSignature && !verifyWebhookSignature(webhookBody, webhookSignature)) {
      webhookLogger.warn('❌ Invalid webhook signature - possible tampering attempt');
      try {
        const shortSig = (webhookSignature || '').toString().slice(0, 20);
        webhookLogger.debug(`Signature header (truncated): ${shortSig}...`);
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || 'unknown';
        webhookLogger.debug(`Source IP: ${ip}`);
      } catch (err) {
        // ignore debug failures
      }
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    webhookLogger.info('✓ Webhook signature verified');

    // ========================================
    // 2. PARSE EVENT
    // ========================================
    const { event, payload } = req.body;
    const paymentEntity = payload?.payment?.entity;
    const orderEntity = payload?.order?.entity;

    webhookLogger.info(`📥 Event: ${event}`);
    
    if (paymentEntity) {
      webhookLogger.info(`   PaymentId: ${paymentEntity.id}, Status: ${paymentEntity.status}, Amount: ₹${Number(paymentEntity.amount) / 100}`);
    }
    if (orderEntity) {
      webhookLogger.info(`   OrderId: ${orderEntity.id}, Status: ${orderEntity.status}`);
    }

    // ========================================
    // 3. HANDLE EVENT
    // ========================================
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload, webhookLogger);
        break;
      
      case 'payment.authorized':
        // Payment authorized but not yet captured
        // In auto-capture mode, this comes before payment.captured
        webhookLogger.info(`Payment authorized: ${paymentEntity?.id} - awaiting capture`);
        await updatePaymentOrderStatus(paymentEntity?.order_id, PAYMENT_ORDER_STATUS.ATTEMPTED);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(payload, webhookLogger);
        break;
      
      case 'order.paid':
        webhookLogger.info(`✅ Order paid: ${orderEntity?.id}`);
        break;
      
      case 'refund.created':
        webhookLogger.info(`💸 Refund created: ${payload?.refund?.entity?.id}`);
        // TODO: Handle refunds when needed
        break;
      
      default:
        webhookLogger.info(`⚠️ Unhandled event type: ${event}`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({ success: true, event });
    
  } catch (error) {
    webhookLogger.error('Webhook processing error', error as Error);
    // CRITICAL FIX: Return 500 on transient errors to allow Razorpay retries
    // Razorpay will retry webhooks that receive 5xx responses
    // Only return 200 for permanent failures (bad data, already processed, etc.)
    return res.status(500).json({ success: false, error: 'Internal processing error' });
  }
};

/**
 * Update PaymentOrder status helper
 */
async function updatePaymentOrderStatus(orderId: string | undefined, status: PaymentOrderStatus): Promise<void> {
  if (!orderId) return;
  
  try {
    await prisma.paymentOrder.updateMany({
      where: { razorpayOrderId: orderId },
      data: { status, lastAttemptAt: new Date() },
    });
  } catch (error) {
    logger.error(`Failed to update PaymentOrder status: ${orderId}`, error as Error);
  }
}

/**
 * Handle payment.captured webhook event
 * Uses centralized processPayment for consistency
 * 
 * IMPORTANT: Throws error on transient failures to trigger webhook retry via 500 response
 */
async function handlePaymentCaptured(payload: any, webhookLogger: typeof logger): Promise<void> {
  const payment = payload?.payment?.entity;
  if (!payment) {
    webhookLogger.warn('No payment entity in captured payload');
    return; // Not a retryable error - bad payload
  }

  const paymentId = payment.id;
  const orderId = payment.order_id;
  const amount = Number(payment.amount) / 100;
  const method = payment.method || null;
  const notes = payment.notes || {};

  webhookLogger.info(`Processing captured payment: ${paymentId}`);
  webhookLogger.info(`   Order: ${orderId}, Amount: ₹${amount}, Method: ${method}`);
  webhookLogger.info(`   Notes: ${JSON.stringify(notes)}`);

  // Use centralized processPayment function
  const result = await processPayment({
    paymentId,
    orderId,
    amount,
    method,
    notes,
    source: 'webhook',
  });

  if (result.success) {
    webhookLogger.info(`✅ Payment processed: ${result.message}`);
    if (result.isCompleted) {
      webhookLogger.info(`🎉 LOAN COMPLETED via webhook!`);
    }
  } else {
    webhookLogger.warn(`⚠️ Payment processing issue: ${result.message}`);
    // CRITICAL: Throw error for retryable failures to trigger 500 response
    if (result.isRetryable !== false) {
      throw new Error(`Payment processing failed: ${result.message}`);
    }
  }
}

/**
 * Handle payment.failed webhook event
 */
async function handlePaymentFailed(payload: any, webhookLogger: typeof logger): Promise<void> {
  try {
    const payment = payload?.payment?.entity;
    if (!payment) {
      webhookLogger.warn('No payment entity in failed payload');
      return;
    }

    const paymentId = payment.id;
    const orderId = payment.order_id;
    const errorCode = payment.error_code;
    const errorDescription = payment.error_description;
    const errorSource = payment.error_source;
    const errorStep = payment.error_step;
    const errorReason = payment.error_reason;
    const notes = payment.notes || {};

    webhookLogger.warn(`❌ Payment FAILED: ${paymentId}`);
    webhookLogger.warn(`   Order: ${orderId}`);
    webhookLogger.warn(`   Error: ${errorCode} - ${errorDescription}`);
    webhookLogger.warn(`   Source: ${errorSource}, Step: ${errorStep}, Reason: ${errorReason}`);

    const { requestId, emiId, customerId } = notes;

    // Handle identifier resolution for failure handling
    let actualRequestId = requestId;
    let actualEmiId = emiId;
    let actualCustomerId = customerId;

    if (notes.requestNumber && !requestId) {
      const request = await prisma.request.findFirst({
        where: { requestNumber: notes.requestNumber },
        select: { id: true, customerId: true }
      });
      if (request) {
        actualRequestId = request.id;
        actualCustomerId = request.customerId;
      }
    }

    if (notes.emiNumber && !emiId && notes.loanNumber) {
      const loan = await prisma.loan.findFirst({
        where: { loanNumber: notes.loanNumber },
        select: { id: true }
      });
      if (loan) {
        const emi = await prisma.eMISchedule.findFirst({
          where: { 
            loanId: loan.id,
            emiNumber: parseInt(notes.emiNumber)
          },
          select: { id: true }
        });
        if (emi) {
          actualEmiId = emi.id;
        }
      }
    }

    if (notes.customerEmail && !customerId) {
      const user = await prisma.user.findUnique({
        where: { email: notes.customerEmail },
        select: { id: true }
      });
      if (user) {
        actualCustomerId = user.id;
      }
    }

    if (!orderId) {
      webhookLogger.warn('No orderId in failed payment - cannot update');
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Update PaymentOrder with failure details
      const paymentOrder = await tx.paymentOrder.findUnique({
        where: { razorpayOrderId: orderId }
      });

      if (paymentOrder) {
        await tx.paymentOrder.update({
          where: { id: paymentOrder.id },
          data: {
            status: PAYMENT_ORDER_STATUS.FAILED,
            razorpayPaymentId: paymentId,
            failureReason: errorDescription || errorReason || null,
            failureCode: errorCode || null,
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        });
        webhookLogger.info(`PaymentOrder ${paymentOrder.id} marked as FAILED`);
      } else {
        webhookLogger.warn(`PaymentOrder not found for failed order: ${orderId}`);
      }
    });

  } catch (error) {
    webhookLogger.error('Error in handlePaymentFailed', error as Error);
  }
}

/**
 * GET /api/v1/payments/razorpay/order/:orderId/status
 * Get status of a PaymentOrder
 */
export const getPaymentOrderStatusController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { orderId } = req.params;

    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { razorpayOrderId: orderId },
      include: {
        emiSchedule: { select: { emiNumber: true, dueDate: true, status: true } },
      }
    });

    if (!paymentOrder) {
      return res.status(404).json({ success: false, message: 'Payment order not found' });
    }

    // Verify ownership
    if (paymentOrder.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({
      success: true,
      data: {
        id: paymentOrder.id,
        razorpayOrderId: paymentOrder.razorpayOrderId,
        status: paymentOrder.status,
        totalAmount: paymentOrder.totalAmount,
        penalty: paymentOrder.penalty,
        emiNumber: paymentOrder.emiSchedule?.emiNumber,
        paidAt: paymentOrder.paidAt,
        failureReason: paymentOrder.failureReason,
        expiresAt: paymentOrder.expiresAt,
        isExpired: new Date() > paymentOrder.expiresAt,
      }
    });
  } catch (error) {
    logger.error('Error fetching payment order status', error as Error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order status' });
  }
};

/**
 * GET /api/v1/payments/emi/:emiId/history
 * Get payment attempt history for an EMI
 */
export const getEMIPaymentHistoryController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { emiId } = req.params;
    if (!emiId) {
      return res.status(400).json({ success: false, message: 'EMI ID is required' });
    }

    // Get the EMI with loan and request details
    const emi = await prisma.eMISchedule.findUnique({
      where: { id: emiId },
      include: {
        loan: {
          select: {
            id: true,
            requestId: true,
            request: {
              select: {
                customerId: true,
              }
            }
          }
        }
      }
    });

    if (!emi) {
      return res.status(404).json({ success: false, message: 'EMI not found' });
    }

    // Verify ownership - customer can view their own EMIs
    const isOwner = emi.loan.request.customerId === userId;
    const user = req.user;
    const isAdmin = user?.roles?.includes(ROLES.SUPER_ADMIN) || user?.roles?.includes(ROLES.DISTRICT_ADMIN);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get all payment orders for this EMI
    const paymentOrders = await prisma.paymentOrder.findMany({
      where: { emiScheduleId: emiId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        razorpayOrderId: true,
        status: true,
        emiAmount: true,
        penalty: true,
        totalAmount: true,
        attempts: true,
        lastAttemptAt: true,
        razorpayPaymentId: true,
        paymentMethod: true,
        paidAt: true,
        failureReason: true,
        failureCode: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Get payment history from AuditLog
    const paymentHistory = await prisma.auditLog.findMany({
      where: {
        entityType: 'PAYMENT',
        entityId: emiId,
        action: {
          in: ['PAYMENT_INITIATED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED']
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        newValue: true,
        createdAt: true,
      }
    });

    return res.json({
      success: true,
      data: {
        emiId: emi.id,
        emiNumber: emi.emiNumber,
        loanId: emi.loan.id,
        paymentOrders,
        paymentHistory,
        summary: {
          totalAttempts: paymentOrders.reduce((sum: number, order: any) => sum + order.attempts, 0),
          successfulPayments: paymentOrders.filter((order: any) => order.status === PAYMENT_ORDER_STATUS.PAID).length,
          failedPayments: paymentOrders.filter((order: any) => order.status === PAYMENT_ORDER_STATUS.FAILED).length,
          lastAttemptAt: paymentOrders.length > 0 ? paymentOrders[0].lastAttemptAt : null,
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching EMI payment history', error as Error);
    return res.status(500).json({ success: false, message: 'Failed to fetch EMI payment history' });
  }
};

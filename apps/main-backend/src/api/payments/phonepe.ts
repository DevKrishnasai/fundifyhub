import type { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '@fundifyhub/prisma';

// PhonePe configuration
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || '';
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || '';
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const PHONEPE_BASE_URL = process.env.PHONEPE_ENV === 'production' 
  ? 'https://api.phonepe.com/apis/hermes' 
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const PHONEPE_MOCK_MODE = process.env.PHONEPE_MOCK_MODE === 'true';

/**
 * Generate PhonePe checksum for request/response verification
 * Format: base64(payload) + endpoint + saltKey | sha256 -> base64 -> X-VERIFY header
 */
function generatePhonePeChecksum(payload: string, endpoint: string): string {
  const stringToHash = payload + endpoint + PHONEPE_SALT_KEY;
  const sha256Hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
  return `${sha256Hash}###${PHONEPE_SALT_INDEX}`;
}

/**
 * Verify PhonePe callback/webhook signature
 */
function verifyPhonePeSignature(base64Response: string, xVerifyHeader: string): boolean {
  const [receivedHash, receivedIndex] = xVerifyHeader.split('###');
  if (receivedIndex !== PHONEPE_SALT_INDEX) return false;
  
  const stringToHash = base64Response + PHONEPE_SALT_KEY;
  const expectedHash = crypto.createHash('sha256').update(stringToHash).digest('hex');
  return receivedHash === expectedHash;
}

/**
 * POST /api/v1/payments/phonepe/create-order
 * Creates a PhonePe payment transaction
 */
export const createPhonePeOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { loanId, emiId, payAheadCount, amount } = req.body;

    if (!loanId || !emiId) {
      return res.status(400).json({ success: false, message: 'Loan ID and EMI ID are required' });
    }

    // Validate loan ownership via request
    const loan = await prisma.loan.findFirst({
      where: { id: loanId, request: { customerId: userId } },
      include: { request: { include: { customer: true } } }
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    // Validate EMI and calculate total due
    const emis = await prisma.eMISchedule.findMany({
      where: {
        loanId,
        id: { gte: emiId },
        status: { in: ['PENDING', 'OVERDUE'] }
      },
      orderBy: { dueDate: 'asc' },
      take: payAheadCount || 1
    });

    if (emis.length === 0) {
      return res.status(404).json({ success: false, message: 'No unpaid EMIs found' });
    }

    const totalDue = emis.reduce((sum, emi) => sum + emi.emiAmount, 0);

    // Validate amount matches totalDue
    if (Math.abs(amount - totalDue) > 0.01) {
      return res.status(400).json({ 
        success: false, 
        message: `Amount must equal total due: ₹${totalDue.toFixed(2)}` 
      });
    }

    // Generate unique merchant transaction ID
    const merchantTransactionId = `TXN_${Date.now()}_${userId.substring(0, 8)}`;
    const merchantUserId = userId;

    // PhonePe payment payload
    const paymentPayload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId,
      amount: Math.round(amount * 100), // Convert to paise
      redirectUrl: `${process.env.FRONTEND_URL}/payments/callback?txnId=${merchantTransactionId}`,
      redirectMode: 'POST',
      callbackUrl: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/v1/payments/phonepe/webhook`,
      mobileNumber: loan.request.customer?.phoneNumber || undefined,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    // Mock mode for development (bypass PhonePe API)
    if (PHONEPE_MOCK_MODE) {
      console.log('🧪 Mock Payment Mode: Bypassing PhonePe API');
      const mockRedirectUrl = `${process.env.FRONTEND_URL}/payments/mock-gateway?txnId=${merchantTransactionId}&amount=${amount}`;
      
      return res.json({
        success: true,
        data: {
          merchantTransactionId,
          redirectUrl: mockRedirectUrl,
          loanId,
          emiIds: emis.map(e => e.id),
          amount: totalDue
        }
      });
    }

    const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
    const endpoint = '/pg/v1/pay';
    const xVerify = generatePhonePeChecksum(base64Payload, endpoint);

    // Call PhonePe API
    const response = await axios.post(
      `${PHONEPE_BASE_URL}${endpoint}`,
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify
        }
      }
    );

    if (response.data.success) {
      return res.json({
        success: true,
        data: {
          merchantTransactionId,
          instrumentResponse: response.data.data.instrumentResponse,
          redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
          loanId,
          emiIds: emis.map(e => e.id),
          amount: totalDue
        }
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'PhonePe order creation failed',
        error: response.data 
      });
    }
  } catch (error) {
    console.error('Error creating PhonePe order:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/v1/payments/phonepe/verify
 * Verifies PhonePe payment status and creates payment/ledger entries
 */
export const verifyPhonePePaymentController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { merchantTransactionId, loanId, emiIds, amount } = req.body;

    if (!merchantTransactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    let paymentData;

    // Mock mode for development
    if (PHONEPE_MOCK_MODE) {
      console.log('🧪 Mock Payment Verification: Auto-approving payment');
      paymentData = {
        success: true,
        code: 'PAYMENT_SUCCESS',
        data: {
          merchantTransactionId,
          transactionId: `MOCK_${merchantTransactionId}`,
          amount: Math.round(amount * 100),
          state: 'COMPLETED'
        }
      };
    } else {
      // Check status with PhonePe
      const endpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`;
      const stringToHash = endpoint + PHONEPE_SALT_KEY;
      const xVerify = crypto.createHash('sha256').update(stringToHash).digest('hex') + `###${PHONEPE_SALT_INDEX}`;

      const statusResponse = await axios.get(
        `${PHONEPE_BASE_URL}${endpoint}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify
          }
        }
      );

      paymentData = statusResponse.data;
    }

    if (!paymentData.success || paymentData.code !== 'PAYMENT_SUCCESS') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed',
        data: paymentData 
      });
    }

    // Check for duplicate payment (idempotency)
    const existingPayment = await prisma.payment.findFirst({
      where: { paymentReference: merchantTransactionId }
    });

    if (existingPayment) {
      return res.json({ 
        success: true, 
        message: 'Payment already processed',
        data: existingPayment 
      });
    }

    // Process payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      const emis = await tx.eMISchedule.findMany({
        where: { id: { in: emiIds } },
        orderBy: { dueDate: 'asc' }
      });

      let remainingAmount = amount;
      const payments: any[] = [];
      const ledgerEntries: any[] = [];

      for (const emi of emis) {
        if (remainingAmount <= 0) break;

        const paymentAmount = Math.min(remainingAmount, emi.emiAmount);

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            loanId,
            requestId: emi.requestId,
            emiScheduleId: emi.id,
            amount: paymentAmount,
            paymentType: 'EMI',
            paymentMethod: 'PHONEPE',
            paymentReference: merchantTransactionId,
            processedBy: userId
          }
        });

        payments.push(payment);

        // Update EMI status
        await tx.eMISchedule.update({
          where: { id: emi.id },
          data: { 
            status: 'PAID',
            paidDate: new Date(),
            paidAmount: paymentAmount
          }
        });

        remainingAmount -= paymentAmount;
      }

      return { payments, ledgerEntries };
    });

    return res.json({
      success: true,
      message: 'Payment verified and recorded successfully',
      data: result
    });
  } catch (error) {
    console.error('Error verifying PhonePe payment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

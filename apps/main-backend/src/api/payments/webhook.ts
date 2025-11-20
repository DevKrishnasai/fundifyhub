import type { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '@fundifyhub/prisma';

const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || '';
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';

/**
 * Verify PhonePe webhook signature
 */
function verifyPhonePeWebhookSignature(base64Response: string, xVerifyHeader: string): boolean {
  if (!PHONEPE_SALT_KEY || !xVerifyHeader) return false;
  
  const [receivedHash, receivedIndex] = xVerifyHeader.split('###');
  if (receivedIndex !== PHONEPE_SALT_INDEX) return false;
  
  const stringToHash = base64Response + PHONEPE_SALT_KEY;
  const expectedHash = crypto.createHash('sha256').update(stringToHash).digest('hex');
  return receivedHash === expectedHash;
}

/**
 * POST /api/v1/payments/phonepe/webhook
 * Handles PhonePe webhook events for async payment notifications
 */
export const phonePeWebhookController = async (req: Request, res: Response) => {
  try {
    const xVerifyHeader = req.headers['x-verify'] as string | undefined;
    const base64Response = req.body?.response;

    if (!base64Response) {
      console.warn('[PhonePe] Webhook missing response body');
      return res.status(400).json({ success: false, message: 'Missing response' });
    }

    // Verify signature
    if (!xVerifyHeader || !verifyPhonePeWebhookSignature(base64Response, xVerifyHeader)) {
      console.warn('[PhonePe] Invalid webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    // Decode payload
    const decodedPayload = Buffer.from(base64Response, 'base64').toString('utf-8');
    const webhookData = JSON.parse(decodedPayload);

    console.info('[PhonePe] Webhook received:', webhookData);

    // Extract transaction details
    const { success, code, data } = webhookData;
    const merchantTransactionId = data?.merchantTransactionId;
    const transactionId = data?.transactionId;
    const amount = data?.amount; // in paise

    if (!merchantTransactionId) {
      console.warn('[PhonePe] Webhook missing merchantTransactionId');
      return res.status(400).json({ success: false, message: 'Missing transaction ID' });
    }

    // Check if payment already processed
    const existingPayment = await prisma.payment.findFirst({
      where: { paymentReference: merchantTransactionId }
    });

    if (existingPayment) {
      console.info('[PhonePe] Payment already processed:', merchantTransactionId);
      return res.json({ success: true, message: 'Payment already recorded' });
    }

    // Handle successful payment
    if (success && code === 'PAYMENT_SUCCESS') {
      try {
        // Try to find associated EMI from stored transaction metadata
        // In production, you should store txnId -> emiId mapping when creating order
        // For now, we'll attempt to parse from merchantTransactionId or query recent unpaid EMIs
        
        // This is a simplified reconciliation - in production, store order metadata in DB
        console.info('[PhonePe] Payment captured:', { merchantTransactionId, transactionId, amount });

        // Here you would:
        // 1. Query your order/transaction table using merchantTransactionId
        // 2. Get associated loanId and emiIds
        // 3. Create payment and ledger entries
        // 4. Update EMI status

        // For now, just acknowledge receipt
        return res.json({ 
          success: true, 
          message: 'Webhook received - manual reconciliation required',
          data: { merchantTransactionId, transactionId }
        });
      } catch (err) {
        console.error('[PhonePe] Webhook processing error:', err);
        return res.status(500).json({ success: false, message: 'Processing failed' });
      }
    }

    // Handle failed payment
    if (!success || code === 'PAYMENT_ERROR' || code === 'PAYMENT_DECLINED') {
      console.warn('[PhonePe] Payment failed:', { merchantTransactionId, code });
      return res.json({ success: true, message: 'Payment failure acknowledged' });
    }

    // Other webhook events
    console.info('[PhonePe] Unhandled webhook event:', { code, merchantTransactionId });
    return res.json({ success: true, message: 'Event acknowledged' });

  } catch (error) {
    console.error('Error processing PhonePe webhook:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

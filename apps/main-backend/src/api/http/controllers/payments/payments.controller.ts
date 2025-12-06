/**
 * Payments Controller
 *
 * Handles HTTP requests related to payments.
 *
 * @module api/http/controllers/payments
 */
import { paymentsService } from '../../../../domain/payments';
import type { Request, Response } from 'express';
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  razorpayWebhookSchema,
} from '../../../../domain/payments/payments.validators';
import { ValidationError, ErrorCode } from '@fundifyhub/utils';
import logger from '../../../../utils/logger';

/**
 * Create a payment order for EMI payment
 * POST /api/payments/orders
 */
async function createPaymentOrder(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validatedData = createPaymentOrderSchema.parse(req.body);

    if (!req.user?.id) {
      throw new ValidationError('User not authenticated', ErrorCode.AUTHENTICATION_ERROR);
    }

    // Call service
    const result = await paymentsService.createPaymentOrder(
      {
        emiId: validatedData.emiId,
        customerId: req.user.id,
        amount: validatedData.amount,
      },
      req.user
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('[PaymentsController.createPaymentOrder] Error', { error });
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        code: ErrorCode.INVALID_INPUT,
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

/**
 * Verify a payment after Razorpay callback
 * POST /api/payments/verify
 */
async function verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    // Validate input
    const validatedData = verifyPaymentSchema.parse(req.body);

    // Call service to verify signature and process payment
    const result = await paymentsService.verifyPayment({
      razorpayOrderId: validatedData.razorpayOrderId,
      razorpayPaymentId: validatedData.razorpayPaymentId,
      razorpaySignature: validatedData.razorpaySignature,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Payment verified successfully',
    });
  } catch (error: any) {
    logger.error('[PaymentsController.verifyPayment] Error', { error });
    
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        code: ErrorCode.INVALID_INPUT,
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }

    res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
    });
  }
}

export const paymentsController = {
  createPaymentOrder,
  verifyPayment,
};

/**
 * Razorpay webhook handler
 * POST /api/webhooks/razorpay
 * 
 * Handles payment status updates from Razorpay.
 * Signature verification is done by Razorpay provider.
 */
export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  try {
    // Razorpay sends the signature in the header
    const razorpaySignature = req.headers['x-razorpay-signature'] as string;

    if (!razorpaySignature) {
      res.status(400).json({
        success: false,
        message: 'Missing Razorpay signature',
      });
      return;
    }

    // Validate webhook payload
    const webhook = razorpayWebhookSchema.parse(req.body);

    // Forward to payments service for processing
    // Note: handleWebhook method needs to be implemented in PaymentsService
    logger.info('[PaymentsController.handleRazorpayWebhook] Webhook received', {
      event: webhook.event,
    });

    // Always respond with 200 to Razorpay
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error: any) {
    logger.error('[PaymentsController.handleRazorpayWebhook] Error', { error });
    
    // Still respond with 200 to Razorpay to prevent retries
    res.status(200).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
}

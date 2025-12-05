import type { Request, Response } from 'express';
import { ValidationError, ErrorCode } from '@fundifyhub/utils';

/**
 * Razorpay webhook controller (HTTP layer)
 *
 * TODO: Wire to payments adapter/service once migrated.
 */
export async function razorpayWebhookController(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      throw new ValidationError('Missing Razorpay signature', ErrorCode.INVALID_INPUT);
    }

    // Placeholder until payments service is refactored into domain/http layer
    res.status(501).json({ success: false, message: 'Razorpay webhook handling not yet migrated' });
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode || 500;
    res.status(status).json({ success: false, message: (error as Error).message });
  }
}

/**
 * Loans Controller
 *
 * Handles HTTP requests related to loans.
 *
 * @module api/http/controllers/loans
 */
import { loansService } from '../../../domain/loans';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { 
  PAYMENT_METHOD, 
  recordPaymentSchema, 
  API_MESSAGES, 
  type PaginationParams 
} from '@fundifyhub/types';
import logger from '../../../utils/logger';
import { asyncHandler } from '../middlewares';

export const loansController = {
  getLoan: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;

    const loan = await loansService.getLoanById(id, req.user);

    res.status(200).json({
      success: true,
      data: { loan },
    });
  }),

  listLoans: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string | undefined;
    const result = await loansService.listLoans(req.user, {
      page,
      pageSize,
      status,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }),

  getEMISchedule: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;

    const schedule = await loansService.getEMISchedule(id);

    res.status(200).json({
      success: true,
      data: { schedule },
    });
  }),

  makePayment: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: API_MESSAGES.ERROR.UNAUTHORIZED });
      return;
    }

    const { id } = req.params;
    const paymentData = recordPaymentSchema.parse(req.body);

    const { payment } = await loansService.applyEMIPayment({
      loanId: id,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      transactionReference: paymentData.paymentReference,
      processedBy: req.user.id,
      remarks: paymentData.remarks,
    });

    logger.info('[LoansController] Payment recorded', { loanId: id, paymentId: (payment as { id?: string })?.id, amount: paymentData.amount });

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { payment },
    });
  }),

  prepayment: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const prepaymentData = z.object({
      amount: z.number().positive(),
      paymentMethod: z.nativeEnum(PAYMENT_METHOD),
      transactionReference: z.string(),
      reason: z.string().optional(),
    }).parse(req.body);

    const { remainingBalance } = await loansService.recordPrepayment({
      loanId: id,
      amount: prepaymentData.amount,
      paymentMethod: prepaymentData.paymentMethod,
      transactionReference: prepaymentData.transactionReference,
      processedBy: req.user.id,
      reason: prepaymentData.reason,
    });

    logger.info('[LoansController] Prepayment processed', { loanId: id, amount: prepaymentData.amount, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Prepayment processed successfully',
      data: { remainingBalance },
    });
  }),

  closeLoan: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;

    const loanClosure = await loansService.closeLoan(id);

    logger.info('[LoansController] Loan closed', { loanId: id, userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Loan closed successfully',
      data: { loanClosure },
    });
  }),
};

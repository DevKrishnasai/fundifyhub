/**
 * Loans Service
 * 
 * Handles all loan EMI and payment workflows:
 * - EMI schedule management
 * - Payment processing and tracking
 * - Prepayment and loan closure
 * - Balance calculations
 * - Payment history
 * 
 * @module domain/loans
 */

import { prisma } from '@fundifyhub/prisma';
import { NotFoundError, ValidationError, ForbiddenError, ErrorCode } from '@fundifyhub/utils';
import type { Loan, EMISchedule } from '@fundifyhub/types';
import { 
  ROLES, 
  PAYMENT_METHOD,
  PAYMENT_TYPE, 
  CLOSURE_TYPE, 
  LATE_FEE_RATE, 
  DAYS_PER_MONTH,
} from '@fundifyhub/types';
import { canViewLoan, canMakePayment, hasRole, type RBACUser } from '../access-control/rbac';
import { eventBus } from '../events/bus';
import logger from '../../utils/logger';

export interface EMIWithBreakdown {
  principalAmount: number;
  interestRate: number;
  tenure: number;
  monthlyEMI: number;
  totalAmount: number;
  totalInterest: number;
  schedule: {
    month: number;
    principalPaid: number;
    interestPaid: number;
    totalPaid: number;
    outstandingBalance: number;
  }[];
}

export interface PaymentInput {
  loanId: string;
  amount: number;
  paymentMethod: PAYMENT_METHOD;
  transactionReference: string; // Transaction ID/reference
  processedBy?: string; // User ID who processed payment
  remarks?: string;
}

export interface PrepaymentInput {
  loanId: string;
  amount: number;
  paymentMethod: PAYMENT_METHOD;
  transactionReference: string;
  processedBy?: string;
  reason?: string;
}

/**
 * LoansService - EMI and payment management
 * 
 * All calculations follow standard EMI formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 * where:
 * - P = Principal amount
 * - r = Monthly interest rate (annual rate / 12 / 100)
 * - n = Total number of months
 */
export class LoansService {
  private static instance: LoansService;

  static getInstance(): LoansService {
    if (!LoansService.instance) {
      LoansService.instance = new LoansService();
    }
    return LoansService.instance;
  }

  /**
   * Get loan by ID with permission check
   * 
   * Customers can view their own loans
   * Agents/Admins can view loans in their district
   * 
   * @throws NotFoundError if loan doesn't exist
   * @throws ForbiddenError if user lacks access
   */
  async getLoanById(loanId: string, user: RBACUser): Promise<Loan> {
    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          request: { include: { customer: true, district: true } },
          emisSchedule: { orderBy: { dueDate: 'asc' } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Check user access via RBAC
      const customerId = loan.request.customer.id;
      const districtId = loan.request.districtId;
      
      if (!canViewLoan(user, customerId, districtId)) {
        throw new ForbiddenError('You do not have permission to view this loan', ErrorCode.FORBIDDEN);
      }

      logger.info('[LoansService.getLoanById] Loan retrieved', { loanId, userId: user.id });

      return loan as unknown as Loan;
    } catch (err) {
      logger.error('[LoansService.getLoanById] Failed to get loan', { error: err, loanId, userId: user.id });
      throw err;
    }
  }

  /**
   * List loans with role-based filtering
   * 
   * @throws ValidationError if pagination invalid
   */
  async listLoans(
    user: RBACUser,
    filters: { page?: number; pageSize?: number; status?: string }
  ): Promise<{ loans: Loan[]; total: number }> {
    try {
      const page = filters.page || 1;
      const pageSize = Math.min(filters.pageSize || 10, 100);

      if (page < 1 || pageSize < 1) {
        throw new ValidationError('Invalid pagination', ErrorCode.INVALID_INPUT);
      }

      const skip = (page - 1) * pageSize;

      // Build WHERE clause based on user role
      const where: any = {};

      if (hasRole(user, ROLES.CUSTOMER)) {
        // Customer sees only their own loans via request.customerId
        where.request = { customerId: user.id };
      } else if (hasRole(user, ROLES.AGENT) || hasRole(user, ROLES.DISTRICT_ADMIN)) {
        // Agent/District admin sees loans in their districts
        where.request = { districtId: { in: user.districts || [] } };
      } else if (hasRole(user, ROLES.STATE_ADMIN)) {
        // State admin sees loans in their state (via districts)
        where.request = { districtId: { in: user.districts || [] } };
      }
      // SUPER_ADMIN sees all - no filter

      // Apply status filter if provided
      if (filters.status) {
        where.status = filters.status;
      }

      // Fetch loans with pagination
      const [loans, total] = await Promise.all([
        prisma.loan.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            request: {
              include: {
                customer: { select: { id: true, firstName: true, lastName: true } },
                district: { select: { id: true, name: true } },
              },
            },
          },
        }),
        prisma.loan.count({ where }),
      ]);

      logger.info('[LoansService.listLoans] Loans listed', { 
        userId: user.id, 
        page, 
        pageSize, 
        count: loans.length,
        total 
      });

      return { loans: loans as unknown as Loan[], total };
    } catch (err) {
      logger.error('[LoansService.listLoans] Failed to list loans', { error: err, userId: user.id });
      throw err;
    }
  }

  /**
   * Apply EMI payment for a loan
   * 
   * 1. Verify loan exists and is active
   * 2. Calculate due amount (EMI + late fees if applicable)
   * 3. Process payment
   * 4. Update EMI schedule
   * 5. Emit PaymentRecorded event
   * 
   * @throws NotFoundError if loan doesn't exist
   * @throws ValidationError if payment amount invalid
   */
  async applyEMIPayment(input: PaymentInput): Promise<{ payment: any; updatedLoan: Loan }> {
    try {
      if (input.amount <= 0) {
        throw new ValidationError('Payment amount must be positive', ErrorCode.INVALID_INPUT);
      }

      const loan = await prisma.loan.findUnique({
        where: { id: input.loanId },
        include: { 
          request: { select: { customerId: true, districtId: true } },
          emisSchedule: { where: { status: 'PENDING' }, orderBy: { dueDate: 'asc' } } 
        },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Get current due EMI
      if (!loan.emisSchedule || loan.emisSchedule.length === 0) {
        throw new ValidationError('No pending EMIs found', ErrorCode.INVALID_INPUT);
      }

      const currentEMI = loan.emisSchedule[0];

      // Calculate late fee if EMI is overdue
      let lateFee = 0;
      const today = new Date();
      if (today > currentEMI.dueDate) {
        const daysOverdue = Math.floor((today.getTime() - currentEMI.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const monthsOverdue = Math.ceil(daysOverdue / DAYS_PER_MONTH);
        lateFee = currentEMI.emiAmount * LATE_FEE_RATE * monthsOverdue;
      }

      const totalDue = currentEMI.emiAmount + lateFee;

      if (input.amount < totalDue) {
        throw new ValidationError(
          `Payment amount insufficient. Required: ${totalDue} (EMI: ${currentEMI.emiAmount}, Late Fee: ${lateFee})`,
          ErrorCode.INVALID_INPUT
        );
      }

      // Use transaction for atomic updates
      const result = await prisma.$transaction(async (tx) => {
        // Create Payment record
        const payment = await tx.payment.create({
          data: {
            loanId: input.loanId,
            requestId: loan.requestId,
            emiScheduleId: currentEMI.id,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentReference: input.transactionReference,
            paidDate: today,
            processedBy: input.processedBy || 'system',
          },
        });

        // Update EMI schedule (mark as PAID)
        await tx.eMISchedule.update({
          where: { id: currentEMI.id },
          data: {
            status: 'PAID',
            paidDate: today,
            paidAmount: input.amount,
          },
        });

        // Update loan outstanding balance
        const updatedLoan = await tx.loan.update({
          where: { id: input.loanId },
          data: {
            remainingAmount: { decrement: currentEMI.principalAmount },
            remainingEMIs: { decrement: 1 },
          },
        });

        return { payment, updatedLoan };
      });

      // Emit PaymentRecorded event
      eventBus.emit('loan.paymentRecorded', {
        loanId: input.loanId,
        customerId: loan.request.customerId,
        emiId: currentEMI.id,
        emiNumber: currentEMI.emiNumber,
        amount: input.amount,
        lateFee,
        paymentDate: today,
        remainingEMIs: result.updatedLoan.remainingEMIs,
      });

      logger.info('[LoansService.applyEMIPayment] Payment applied', {
        loanId: input.loanId,
        amount: input.amount,
        lateFee,
      });

      return { payment: result.payment, updatedLoan: result.updatedLoan as unknown as Loan };
    } catch (err) {
      logger.error('[LoansService.applyEMIPayment] Failed to apply payment', { error: err, loanId: input.loanId });
      throw err;
    }
  }

  /**
   * Get EMI schedule for a loan
   * 
   * Returns full month-by-month breakdown with payment status
   * 
   * @throws NotFoundError if loan doesn't exist
   */
  async getEMISchedule(loanId: string): Promise<EMISchedule[]> {
    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { 
          emisSchedule: { 
            orderBy: { emiNumber: 'asc' },
          } 
        },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Add days overdue calculation
      const today = new Date();
      const enrichedSchedule = (loan.emisSchedule || []).map((emi: any) => {
        let daysOverdue = 0;
        if (emi.status !== 'PAID' && today > emi.dueDate) {
          daysOverdue = Math.floor((today.getTime() - emi.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          ...emi,
          daysOverdue,
          payment: emi.payment || null,
        };
      });

      logger.info('[LoansService.getEMISchedule] EMI schedule retrieved', { loanId, count: enrichedSchedule.length });

      return enrichedSchedule as EMISchedule[];
    } catch (err) {
      logger.error('[LoansService.getEMISchedule] Failed to get EMI schedule', { error: err, loanId });
      throw err;
    }
  }

  /**
   * Record prepayment or extra payment
   * 
   * 1. Verify loan exists
   * 2. Verify prepayment amount
   * 3. Update loan principal or close if full prepayment
   * 4. Recalculate remaining schedule if configured
   * 5. Emit PrepaymentRecorded event
   * 
   * @throws NotFoundError if loan doesn't exist
   * @throws ValidationError if prepayment amount invalid
   */
  async recordPrepayment(input: PrepaymentInput): Promise<{ prepayment: any; remainingBalance: number }> {
    try {
      if (input.amount <= 0) {
        throw new ValidationError('Prepayment amount must be positive', ErrorCode.INVALID_INPUT);
      }

      const loan = await prisma.loan.findUnique({
        where: { id: input.loanId },
        include: { request: { select: { customerId: true } } },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Get current outstanding balance
      const outstandingBalance = loan.remainingAmount;

      // Verify prepayment amount <= outstanding balance
      if (input.amount > outstandingBalance) {
        throw new ValidationError(
          `Prepayment amount exceeds outstanding balance: ${outstandingBalance}`,
          ErrorCode.INVALID_INPUT
        );
      }

      const today = new Date();
      const isFullPrepayment = input.amount >= outstandingBalance;

      // Use transaction for atomic updates
      const result = await prisma.$transaction(async (tx) => {
        // Create Prepayment record (using Payment table with special type)
        const prepayment = await tx.payment.create({
          data: {
            loanId: input.loanId,
            requestId: loan.requestId,
            amount: input.amount,
            paymentType: PAYMENT_TYPE.ADVANCE,
            paymentMethod: input.paymentMethod,
            paymentReference: input.transactionReference,
            paidDate: today,
            processedBy: input.processedBy || 'system',
          },
        });

        // Update loan outstanding balance
        const updatedLoan = await tx.loan.update({
          where: { id: input.loanId },
          data: {
            remainingAmount: { decrement: input.amount },
            totalPaidAmount: { increment: input.amount },
            ...(isFullPrepayment ? { status: 'COMPLETED', closedDate: today } : {}),
          },
        });

        // If full prepayment, mark all pending EMIs as PAID (or leave them, loan is closed)
        if (isFullPrepayment) {
          // Optionally mark remaining EMIs - commenting out as loan COMPLETED status is sufficient
          // await tx.eMISchedule.updateMany({
          //   where: { loanId: input.loanId, status: 'PENDING' },
          //   data: { status: 'PAID' },
          // });
        }

        return { prepayment, remainingBalance: updatedLoan.remainingAmount };
      });

      // Emit PrepaymentRecorded event
      eventBus.emit('loan.prepaymentRecorded', {
        loanId: input.loanId,
        customerId: loan.request.customerId,
        amount: input.amount,
        remainingBalance: result.remainingBalance,
        isFullPrepayment,
        prepaymentDate: today,
      });

      logger.info('[LoansService.recordPrepayment] Prepayment recorded', {
        loanId: input.loanId,
        amount: input.amount,
        isFullPrepayment,
      });

      return { prepayment: result.prepayment, remainingBalance: result.remainingBalance };
    } catch (err) {
      logger.error('[LoansService.recordPrepayment] Failed to record prepayment', { error: err, loanId: input.loanId });
      throw err;
    }
  }

  /**
   * Close loan (full payment or prepayment completion)
   * 
   * 1. Verify loan status
   * 2. Mark all pending EMIs as closed
   * 3. Generate closure certificate
   * 4. Update loan status to CLOSED
   * 5. Emit LoanClosed event
   * 
   * @throws NotFoundError if loan doesn't exist
   * @throws ValidationError if loan not eligible for closure
   */
  async closeLoan(loanId: string): Promise<{ closureDate: Date; certificateUrl?: string }> {
    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { request: { select: { customerId: true } } },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // Get outstanding balance
      const outstandingBalance = loan.remainingAmount;

      // Verify balance = 0 (full payment) or closure initiated
      if (outstandingBalance > 0) {
        throw new ValidationError(
          `Cannot close loan with outstanding balance: ${outstandingBalance}`,
          ErrorCode.INVALID_INPUT
        );
      }

      if (loan.status === 'COMPLETED') {
        throw new ValidationError('Loan already closed', ErrorCode.INVALID_INPUT);
      }

      const today = new Date();

      // Use transaction for atomic updates
      await prisma.$transaction(async (tx) => {
        // Update loan status to COMPLETED
        await tx.loan.update({
          where: { id: loanId },
          data: {
            status: 'COMPLETED',
            closedDate: today,
            closureType: CLOSURE_TYPE.REGULAR,
          },
        });

        // No need to update EMIs - they should all be PAID already
      });

      // Emit LoanClosed event
      eventBus.emit('loan.closed', {
        loanId,
        customerId: loan.request.customerId,
        closureDate: today,
        loanNumber: loan.loanNumber,
      });

      logger.info('[LoansService.closeLoan] Loan closed', { loanId, closureDate: today });

      // TODO: Generate/upload closure certificate in future
      return { closureDate: today, certificateUrl: undefined };
    } catch (err) {
      logger.error('[LoansService.closeLoan] Failed to close loan', { error: err, loanId });
      throw err;
    }
  }

  /**
   * Get outstanding balance for loan
   * 
   * Calculates current outstanding based on payments made
   * 
   * @throws NotFoundError if loan doesn't exist
   */
  async getOutstandingBalance(loanId: string): Promise<number> {
    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        select: { remainingAmount: true },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', ErrorCode.RESOURCE_NOT_FOUND);
      }

      // remainingAmount is maintained up-to-date via transactions
      const outstandingBalance = loan.remainingAmount;

      logger.info('[LoansService.getOutstandingBalance] Balance calculated', { loanId, outstandingBalance });

      return outstandingBalance;
    } catch (err) {
      logger.error('[LoansService.getOutstandingBalance] Failed to get balance', { error: err, loanId });
      throw err;
    }
  }

  /**
   * Get payment history for a loan
   * 
   * Returns all payments with dates and amounts
   * 
   * @throws NotFoundError if loan doesn't exist
   */
  async getPaymentHistory(
    loanId: string,
    filters?: { startDate?: Date; endDate?: Date }
  ): Promise<Array<{ id: string; amount: number; date: Date; type: string; status: string }>> {
    try {
      // Build where clause with date filters
      const where: any = { loanId };
      if (filters?.startDate || filters?.endDate) {
        where.paymentDate = {};
        if (filters.startDate) {
          where.paymentDate.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.paymentDate.lte = filters.endDate;
        }
      }

      const payments = await prisma.payment.findMany({
        where,
        orderBy: { paidDate: 'desc' },
        include: {
          emiSchedule: { select: { emiNumber: true } },
        },
      });

      // Map to return format
      const paymentHistory = payments.map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        date: payment.paidDate,
        type: payment.emiScheduleId 
          ? `EMI #${payment.emiSchedule?.emiNumber || 'N/A'}` 
          : payment.paymentType === PAYMENT_TYPE.ADVANCE ? 'Prepayment' : 'Late Fee',
        status: 'SUCCESS', // All payments in DB are successful
        transactionReference: payment.paymentReference,
        paymentType: payment.paymentType,
      }));

      logger.info('[LoansService.getPaymentHistory] Payment history retrieved', { 
        loanId, 
        count: paymentHistory.length 
      });

      return paymentHistory;
    } catch (err) {
      logger.error('[LoansService.getPaymentHistory] Failed to get payment history', { error: err, loanId });
      throw err;
    }
  }

  /**
   * Calculate EMI schedule
   * 
   * Pure calculation function using standard EMI formula:
   * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
   * 
   * Where:
   * - P = Principal amount
   * - r = Monthly interest rate (annual / 12 / 100)
   * - n = Tenure in months
   * 
   * @param principalAmount - Loan principal in rupees
   * @param annualInterestRate - Annual interest rate as percentage (e.g. 12 for 12%)
   * @param tenureMonths - Loan tenure in months
   * @param startDate - EMI start date (optional)
   * 
   * @returns Complete EMI schedule with month-by-month breakdown
   */
  calculateEMISchedule(
    principalAmount: number,
    annualInterestRate: number,
    tenureMonths: number,
    startDate: Date = new Date()
  ): EMIWithBreakdown {
    if (principalAmount <= 0 || annualInterestRate < 0 || tenureMonths <= 0) {
      throw new ValidationError('Invalid EMI parameters', ErrorCode.INVALID_INPUT);
    }

    const monthlyRate = annualInterestRate / 12 / 100;
    const numerator = principalAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths);
    const denominator = Math.pow(1 + monthlyRate, tenureMonths) - 1;
    const monthlyEMI = numerator / denominator;
    const totalAmount = monthlyEMI * tenureMonths;
    const totalInterest = totalAmount - principalAmount;

    const schedule = [];
    let remainingPrincipal = principalAmount;
    let currentDate = new Date(startDate);

    for (let month = 1; month <= tenureMonths; month++) {
      const interestForMonth = remainingPrincipal * monthlyRate;
      const principalForMonth = monthlyEMI - interestForMonth;
      remainingPrincipal -= principalForMonth;

      schedule.push({
        month,
        principalPaid: Math.round(principalForMonth * 100) / 100,
        interestPaid: Math.round(interestForMonth * 100) / 100,
        totalPaid: Math.round(monthlyEMI * 100) / 100,
        outstandingBalance: Math.max(0, Math.round(remainingPrincipal * 100) / 100),
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
      principalAmount,
      interestRate: annualInterestRate,
      tenure: tenureMonths,
      monthlyEMI: Math.round(monthlyEMI * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      schedule,
    };
  }
}

export const loansService = LoansService.getInstance();

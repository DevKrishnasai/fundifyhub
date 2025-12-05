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
  paymentDate?: Date;
  referenceId?: string;
  notes?: string;
}

export interface PrepaymentInput {
  loanId: string;
  amount: number;
  prepaymentDate?: Date;
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
  async getLoanById(loanId: string, user: any): Promise<Loan> {
    try {
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          request: { include: { customer: true } },
          emisSchedule: { orderBy: { dueDate: 'asc' } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', 'LOAN_NOT_FOUND');
      }

      // TODO: (agent) Check user access via RBAC
      // TODO: (agent) Verify user is customer, agent, or admin with access

      console.log(`[LoansService.getLoanById] Loan retrieved: ${loanId}`);

      return loan as any; // Placeholder
    } catch (err) {
      console.error(`[LoansService.getLoanById] Failed to get loan ${loanId}:`, err);
      throw err;
    }
  }

  /**
   * List loans with role-based filtering
   * 
   * @throws ValidationError if pagination invalid
   */
  async listLoans(
    user: any,
    filters: { page?: number; pageSize?: number; status?: string }
  ): Promise<{ loans: Loan[]; total: number }> {
    try {
      const page = filters.page || 1;
      const pageSize = Math.min(filters.pageSize || 10, 100);

      if (page < 1 || pageSize < 1) {
        throw new ValidationError('Invalid pagination', ErrorCode.INVALID_INPUT);
      }

      // TODO: (agent) Build WHERE clause based on user role
      // TODO: (agent) Apply status filter if provided
      // TODO: (agent) Fetch loans with pagination
      // TODO: (agent) Return paginated results

      console.log('[LoansService.listLoans] Loans listed', { userId: user.id, page, pageSize });

      return { loans: [], total: 0 };
    } catch (err) {
      console.error('[LoansService.listLoans] Failed to list loans:', err);
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
        include: { emisSchedule: { where: { status: 'PENDING' }, orderBy: { dueDate: 'asc' } } },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', 'LOAN_NOT_FOUND');
      }

      // TODO: (agent) Get current due EMI
      // TODO: (agent) Calculate late fee if EMI is overdue
      // TODO: (agent) Create Payment record
      // TODO: (agent) Update EMI schedule (mark as PAID/PARTIAL)
      // TODO: (agent) Update loan outstanding balance
      // TODO: (agent) Emit PaymentRecorded event
      // TODO: (agent) Return payment and updated loan

      console.log(`[LoansService.applyEMIPayment] Payment applied: ${input.amount}`, {
        loanId: input.loanId,
      });

      return { payment: {}, updatedLoan: loan as any };
    } catch (err) {
      console.error('[LoansService.applyEMIPayment] Failed to apply payment:', err);
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
        include: { emisSchedule: { orderBy: { dueDate: 'asc' } } },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', 'LOAN_NOT_FOUND');
      }

      // TODO: (agent) Fetch EMI schedules from database
      // TODO: (agent) Add payment information to each schedule
      // TODO: (agent) Calculate days overdue if applicable

      console.log(`[LoansService.getEMISchedule] EMI schedule retrieved: ${loanId}`);

      return (loan as any).emisSchedule || [];
    } catch (err) {
      console.error(`[LoansService.getEMISchedule] Failed to get EMI schedule for ${loanId}:`, err);
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
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', 'LOAN_NOT_FOUND');
      }

      // TODO: (agent) Get current outstanding balance
      // TODO: (agent) Verify prepayment amount <= outstanding balance
      // TODO: (agent) Create Prepayment record
      // TODO: (agent) Update loan outstanding balance
      // TODO: (agent) Check if full prepayment - if yes, close loan
      // TODO: (agent) Optionally recalculate remaining EMI schedule
      // TODO: (agent) Emit PrepaymentRecorded event

      console.log(`[LoansService.recordPrepayment] Prepayment recorded: ${input.amount}`, {
        loanId: input.loanId,
      });

      return { prepayment: {}, remainingBalance: 0 };
    } catch (err) {
      console.error('[LoansService.recordPrepayment] Failed to record prepayment:', err);
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
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', 'LOAN_NOT_FOUND');
      }

      // TODO: (agent) Get outstanding balance
      // TODO: (agent) Verify balance = 0 (full payment) or closure initiated
      // TODO: (agent) Update loan status to CLOSED
      // TODO: (agent) Mark all pending EMIs as CLOSED
      // TODO: (agent) Generate/upload closure certificate
      // TODO: (agent) Emit LoanClosed event

      console.log(`[LoansService.closeLoan] Loan closed: ${loanId}`);

      return { closureDate: new Date(), certificateUrl: undefined };
    } catch (err) {
      console.error(`[LoansService.closeLoan] Failed to close loan ${loanId}:`, err);
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
        include: {
          emisSchedule: true,
          payments: true,
        },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', 'LOAN_NOT_FOUND');
      }

      // TODO: (agent) Sum all paid amounts from payments
      // TODO: (agent) Calculate total due amount
      // TODO: (agent) Return outstanding = total due - paid

      console.log(`[LoansService.getOutstandingBalance] Balance calculated for: ${loanId}`);

      return 0;
    } catch (err) {
      console.error(`[LoansService.getOutstandingBalance] Failed to get balance for ${loanId}:`, err);
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
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: { payments: { orderBy: { createdAt: 'desc' } } },
      });

      if (!loan) {
        throw new NotFoundError('Loan not found', 'LOAN_NOT_FOUND');
      }

      // TODO: (agent) Fetch payments from database
      // TODO: (agent) Apply date filters if provided
      // TODO: (agent) Return payment history

      console.log(`[LoansService.getPaymentHistory] Payment history retrieved for: ${loanId}`);

      return [];
    } catch (err) {
      console.error(`[LoansService.getPaymentHistory] Failed to get payment history for ${loanId}:`, err);
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

/**
 * Manual Payment Controllers
 *
 * Admin-only endpoints for recording manual payments (cash, cheque, bank transfer, UPI)
 * These are used when customers pay at the office or via direct bank transfer.
 *
 * @module api/payments/manual
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma, Prisma, LoanStatus, EMIStatus } from '@fundifyhub/prisma';
import { ROLES, PAYMENT_METHOD, PAYMENT_TYPE, EMI_STATUS, LOAN_STATUS, type UserRole } from '@fundifyhub/types';
import { hasAnyRole, hasDistrictAccess } from '../../utils/rbac';
import { emitPaymentReceived } from '../../realtime/socket-server';
import logger from '../../utils/logger';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const manualPaymentMethods = [
  PAYMENT_METHOD.CASH,
  PAYMENT_METHOD.UPI,
  PAYMENT_METHOD.BANK_TRANSFER,
  PAYMENT_METHOD.CARD,
] as const;

/**
 * Schema for recording a manual payment
 */
const recordManualPaymentSchema = z.object({
  loanId: z.string().min(1, 'Loan ID is required'),
  emiNumber: z.number().int().positive('EMI number must be a positive integer'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(manualPaymentMethods, {
    message: 'Invalid payment method for manual payment',
  }),
  paymentReference: z.string().min(1, 'Payment reference is required'),
  remarks: z.string().optional(),
  paidDate: z.string().datetime().optional(), // ISO date string, defaults to now
});

/**
 * Schema for listing payments with filters
 */
const listPaymentsSchema = z.object({
  loanId: z.string().optional(),
  requestId: z.string().optional(),
  customerId: z.string().optional(),
  districtId: z.string().optional(),
  paymentMethod: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user has admin access to a specific loan
 */
async function hasLoanAccess(
  userId: string,
  userRoles: string[],
  userDistricts: string[],
  loanId: string
): Promise<{ hasAccess: boolean; loan: Awaited<ReturnType<typeof prisma.loan.findUnique>> }> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      request: {
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          district: true,
        },
      },
    },
  });

  if (!loan) {
    return { hasAccess: false, loan: null };
  }

  // Super admin has access to all
  if (userRoles.includes(ROLES.SUPER_ADMIN)) {
    return { hasAccess: true, loan };
  }

  // District/State admin needs district access
  if (hasAnyRole({ roles: userRoles as UserRole[], districts: userDistricts }, [ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN])) {
    const hasAccess = hasDistrictAccess({ roles: userRoles as UserRole[], districts: userDistricts }, loan.request.district.name);
    return { hasAccess, loan };
  }

  return { hasAccess: false, loan };
}

// ============================================
// CONTROLLERS
// ============================================

/**
 * POST /api/v1/payments/manual/record
 * Record a manual payment for an EMI
 *
 * Business rules:
 * - Only admins can record manual payments
 * - EMI must be in PENDING or OVERDUE status
 * - Sequential payment enforcement (no skipping EMIs)
 * - Full amount only (no partial payments)
 */
export async function recordManualPaymentController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;

    if (!user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check admin role
    if (!hasAnyRole(user, [ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN])) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    // Validate request body
    const parseResult = recordManualPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      const zodError = parseResult.error;
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: zodError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const { loanId, emiNumber, amount, paymentMethod, paymentReference, remarks, paidDate } = parseResult.data;

    // Check loan access
    const { hasAccess, loan } = await hasLoanAccess(
      user.id,
      user.roles ?? [],
      user.districts ?? [],
      loanId
    );

    if (!hasAccess || !loan) {
      res.status(404).json({ success: false, message: 'Loan not found or access denied' });
      return;
    }

    // Check loan is active
    if (loan.status !== LOAN_STATUS.ACTIVE) {
      res.status(400).json({
        success: false,
        message: `Cannot record payment for ${loan.status.toLowerCase()} loan`,
      });
      return;
    }

    // Get the specific EMI
    const emi = await prisma.eMISchedule.findFirst({
      where: { loanId, emiNumber },
    });

    if (!emi) {
      res.status(404).json({
        success: false,
        message: `EMI #${emiNumber} not found for this loan`,
      });
      return;
    }

    // Check EMI status
    if (emi.status === EMI_STATUS.PAID) {
      res.status(400).json({
        success: false,
        message: `EMI #${emiNumber} is already paid`,
      });
      return;
    }

    // Enforce sequential payment (no skipping EMIs)
    const unpaidBeforeThis = await prisma.eMISchedule.count({
      where: {
        loanId,
        emiNumber: { lt: emiNumber },
        status: { not: EMI_STATUS.PAID as EMIStatus },
      },
    });

    if (unpaidBeforeThis > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot pay EMI #${emiNumber}. There are ${unpaidBeforeThis} unpaid EMI(s) before this one.`,
      });
      return;
    }

    // Calculate expected amount (EMI amount + any late fee)
    const expectedAmount = emi.emiAmount + (emi.lateFee || 0);

    if (amount !== expectedAmount) {
      res.status(400).json({
        success: false,
        message: `Payment amount must be exactly ₹${expectedAmount.toFixed(2)} (EMI: ₹${emi.emiAmount.toFixed(2)} + Late Fee: ₹${(emi.lateFee || 0).toFixed(2)})`,
        data: {
          expectedAmount,
          emiAmount: emi.emiAmount,
          lateFee: emi.lateFee || 0,
          providedAmount: amount,
        },
      });
      return;
    }

    // Check for duplicate payment reference
    const existingPayment = await prisma.payment.findFirst({
      where: { paymentReference },
    });

    if (existingPayment) {
      res.status(400).json({
        success: false,
        message: 'Payment reference already exists. This may be a duplicate payment.',
      });
      return;
    }

    // Record payment in transaction
    const payment = await prisma.$transaction(async (tx) => {
      // Update EMI status
      await tx.eMISchedule.update({
        where: { id: emi.id },
        data: {
          status: EMI_STATUS.PAID as EMIStatus,
          paidDate: paidDate ? new Date(paidDate) : new Date(),
          paidAmount: amount,
        },
      });

      // Create payment record
      const newPayment = await tx.payment.create({
        data: {
          loanId,
          requestId: loan.requestId,
          emiScheduleId: emi.id,
          amount,
          paymentType: PAYMENT_TYPE.EMI,
          paymentMethod,
          paymentReference,
          paidDate: paidDate ? new Date(paidDate) : new Date(),
          processedBy: user.id,
          remarks,
        },
        include: {
          emiSchedule: true,
        },
      });

      // Update loan payment tracking
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          totalPaidAmount: { increment: amount },
          remainingAmount: { decrement: amount },
          paidEMIs: { increment: 1 },
          remainingEMIs: { decrement: 1 },
        },
      });

      // Check if loan is fully paid
      if (updatedLoan.remainingEMIs <= 0) {
        await tx.loan.update({
          where: { id: loanId },
          data: {
            status: LOAN_STATUS.COMPLETED as LoanStatus,
            closedDate: new Date(),
            closureType: 'NORMAL',
          },
        });
      }

      return { payment: newPayment, remainingEMIs: updatedLoan.remainingEMIs, isCompleted: updatedLoan.remainingEMIs <= 0 };
    });

    logger.info('Manual payment recorded', {
      paymentId: payment.payment.id,
      loanId,
      emiNumber,
      amount,
      paymentMethod,
      processedBy: user.id,
    });

    // Emit socket event for real-time update
    // Get the customer ID from the loan's request (loan includes request.customer from hasLoanAccess)
    const loanWithRequest = loan as typeof loan & { 
      request: { 
        customer: { id: string }; 
        district: { name: string } 
      } 
    };
    
    if (loanWithRequest.request?.customer?.id) {
      emitPaymentReceived(loanWithRequest.request.customer.id, {
        paymentId: payment.payment.id,
        loanId,
        requestId: loan.requestId,
        amount,
        emiNumber,
        remainingEmis: payment.remainingEMIs,
        isLoanCompleted: payment.isCompleted,
        paidAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      message: `Payment of ₹${amount.toFixed(2)} recorded for EMI #${emiNumber}`,
      data: {
        paymentId: payment.payment.id,
        loanId,
        emiNumber,
        amount,
        paymentMethod,
        paymentReference,
        paidDate: payment.payment.paidDate,
      },
    });
  } catch (error) {
    logger.error('recordManualPaymentController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
}

/**
 * GET /api/v1/payments/admin/list
 * List all payments with filters (admin only)
 */
export async function listPaymentsController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;

    if (!user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check admin role
    if (!hasAnyRole(user, [ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN])) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    // Parse query params
    const parseResult = listPaymentsSchema.safeParse(req.query);
    if (!parseResult.success) {
      const zodError = parseResult.error;
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: zodError.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const { loanId, requestId, customerId, districtId, paymentMethod, startDate, endDate, page, limit } = parseResult.data;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {};

    if (loanId) where.loanId = loanId;
    if (requestId) where.requestId = requestId;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      where.paidDate = {};
      if (startDate) where.paidDate.gte = new Date(startDate);
      if (endDate) where.paidDate.lte = new Date(endDate);
    }

    // Filter by customer or district via request relation
    if (customerId || districtId) {
      where.request = {};
      if (customerId) where.request.customerId = customerId;
      if (districtId) where.request.districtId = districtId;
    }

    // District admin restriction
    if (!user.roles?.includes(ROLES.SUPER_ADMIN) && user.districts?.length) {
      // Get district IDs for user's districts
      const userDistrictRecords = await prisma.district.findMany({
        where: { name: { in: user.districts } },
        select: { id: true },
      });
      const userDistrictIds = userDistrictRecords.map((d) => d.id);

      if (!where.request) where.request = {};
      where.request.districtId = { in: userDistrictIds };
    }

    // Count total
    const total = await prisma.payment.count({ where });

    // Get payments with pagination
    const payments = await prisma.payment.findMany({
      where,
      include: {
        loan: {
          select: {
            loanNumber: true,
            approvedAmount: true,
            status: true,
          },
        },
        emiSchedule: {
          select: {
            emiNumber: true,
            dueDate: true,
            emiAmount: true,
          },
        },
        request: {
          select: {
            requestNumber: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            district: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { paidDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      success: true,
      message: 'Payments retrieved',
      data: {
        payments: payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentType: p.paymentType,
          paymentMethod: p.paymentMethod,
          paymentReference: p.paymentReference,
          paidDate: p.paidDate,
          remarks: p.remarks,
          loan: p.loan,
          emi: p.emiSchedule ? {
            emiNumber: p.emiSchedule.emiNumber,
            dueDate: p.emiSchedule.dueDate,
            emiAmount: p.emiSchedule.emiAmount,
          } : null,
          request: {
            requestNumber: p.request.requestNumber,
            customer: p.request.customer,
            district: p.request.district,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('listPaymentsController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payments' });
  }
}

/**
 * GET /api/v1/payments/admin/:paymentId
 * Get payment details (admin only)
 */
export async function getPaymentDetailsController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    const { paymentId } = req.params;

    if (!user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check admin role
    if (!hasAnyRole(user, [ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN])) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        loan: {
          select: {
            id: true,
            loanNumber: true,
            approvedAmount: true,
            emiAmount: true,
            tenureMonths: true,
            status: true,
            totalPaidAmount: true,
            remainingAmount: true,
            paidEMIs: true,
            remainingEMIs: true,
          },
        },
        emiSchedule: {
          select: {
            id: true,
            emiNumber: true,
            dueDate: true,
            emiAmount: true,
            principalAmount: true,
            interestAmount: true,
            lateFee: true,
            status: true,
          },
        },
        request: {
          select: {
            id: true,
            requestNumber: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
            district: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }

    // Check district access for non-super admins
    if (!user.roles?.includes(ROLES.SUPER_ADMIN)) {
      const hasAccess = hasDistrictAccess(user, payment.request.district.name);
      if (!hasAccess) {
        res.status(403).json({ success: false, message: 'Access denied to this payment' });
        return;
      }
    }

    res.json({
      success: true,
      message: 'Payment details retrieved',
      data: payment,
    });
  } catch (error) {
    logger.error('getPaymentDetailsController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve payment details' });
  }
}

/**
 * GET /api/v1/payments/admin/loans
 * List loans with payment summary (for admin payment management)
 */
export async function listLoansWithPaymentSummaryController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;

    if (!user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check admin role
    if (!hasAnyRole(user, [ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN])) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as LoanStatus | undefined;
    const districtId = req.query.districtId as string | undefined;
    const search = req.query.search as string | undefined;

    // Build where clause
    const where: Prisma.LoanWhereInput = {};

    if (status) where.status = status;

    // Build request filter
    const requestFilter: Prisma.RequestWhereInput = {};
    let hasRequestFilter = false;

    // District admin restriction
    if (!user.roles?.includes(ROLES.SUPER_ADMIN) && user.districts?.length) {
      const userDistrictRecords = await prisma.district.findMany({
        where: { name: { in: user.districts } },
        select: { id: true },
      });
      const userDistrictIds = userDistrictRecords.map((d) => d.id);
      requestFilter.districtId = { in: userDistrictIds };
      hasRequestFilter = true;
    } else if (districtId) {
      requestFilter.districtId = districtId;
      hasRequestFilter = true;
    }

    // Search by request number, customer name, or phone
    if (search) {
      requestFilter.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
        { customer: { phoneNumber: { contains: search } } },
      ];
      hasRequestFilter = true;
    }

    if (hasRequestFilter) {
      where.request = requestFilter;
    }

    const total = await prisma.loan.count({ where });

    const loans = await prisma.loan.findMany({
      where,
      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            district: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        emisSchedule: {
          select: {
            id: true,
            emiNumber: true,
            dueDate: true,
            emiAmount: true,
            lateFee: true,
            status: true,
          },
          orderBy: { emiNumber: 'asc' },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Compute summary for each loan
    const loansWithSummary = loans.map((loan) => {
      const pendingEmis = loan.emisSchedule.filter((e) => e.status === EMI_STATUS.PENDING);
      const overdueEmis = loan.emisSchedule.filter((e) => e.status === EMI_STATUS.OVERDUE);
      const paidEmis = loan.emisSchedule.filter((e) => e.status === EMI_STATUS.PAID);
      
      const nextDueEmi = loan.emisSchedule.find((e) => e.status !== EMI_STATUS.PAID);
      const totalLateFee = overdueEmis.reduce((sum: number, e) => sum + (e.lateFee || 0), 0);

      return {
        id: loan.id,
        loanNumber: loan.loanNumber,
        approvedAmount: loan.approvedAmount,
        emiAmount: loan.emiAmount,
        tenureMonths: loan.tenureMonths,
        status: loan.status,
        request: loan.request,
        summary: {
          totalEMIs: loan.tenureMonths,
          paidEMIs: paidEmis.length,
          pendingEMIs: pendingEmis.length,
          overdueEMIs: overdueEmis.length,
          totalPaidAmount: loan.totalPaidAmount,
          remainingAmount: loan.remainingAmount,
          totalLateFee,
          paymentCount: loan._count.payments,
        },
        nextDueEmi: nextDueEmi ? {
          emiNumber: nextDueEmi.emiNumber,
          dueDate: nextDueEmi.dueDate,
          emiAmount: nextDueEmi.emiAmount,
          lateFee: nextDueEmi.lateFee,
          status: nextDueEmi.status,
          totalDue: nextDueEmi.emiAmount + (nextDueEmi.lateFee || 0),
        } : null,
      };
    });

    res.json({
      success: true,
      message: 'Loans with payment summary retrieved',
      data: {
        loans: loansWithSummary,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('listLoansWithPaymentSummaryController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve loans' });
  }
}

/**
 * GET /api/v1/payments/admin/emis/overdue
 * List all overdue EMIs across loans (for proactive collection)
 */
export async function listOverdueEmisController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;

    if (!user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check admin role
    if (!hasAnyRole(user, [ROLES.DISTRICT_ADMIN, ROLES.STATE_ADMIN, ROLES.SUPER_ADMIN])) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const districtId = req.query.districtId as string | undefined;
    const minDaysOverdue = parseInt(req.query.minDaysOverdue as string) || 0;

    // Build where clause
    const where: Prisma.EMIScheduleWhereInput = {
      status: EMI_STATUS.OVERDUE as EMIStatus,
    };

    // Filter by days overdue
    if (minDaysOverdue > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - minDaysOverdue);
      where.dueDate = { lte: cutoffDate };
    }

    // Build loan filter for district restriction
    const loanFilter: Prisma.LoanWhereInput = {};
    let hasLoanFilter = false;

    // District admin restriction
    if (!user.roles?.includes(ROLES.SUPER_ADMIN) && user.districts?.length) {
      const userDistrictRecords = await prisma.district.findMany({
        where: { name: { in: user.districts } },
        select: { id: true },
      });
      const userDistrictIds = userDistrictRecords.map((d) => d.id);
      loanFilter.request = { districtId: { in: userDistrictIds } };
      hasLoanFilter = true;
    } else if (districtId) {
      loanFilter.request = { districtId };
      hasLoanFilter = true;
    }

    if (hasLoanFilter) {
      where.loan = loanFilter;
    }

    const total = await prisma.eMISchedule.count({ where });

    const overdueEmis = await prisma.eMISchedule.findMany({
      where,
      include: {
        loan: {
          select: {
            id: true,
            loanNumber: true,
            approvedAmount: true,
            status: true,
            request: {
              select: {
                id: true,
                requestNumber: true,
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    email: true,
                  },
                },
                district: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' }, // Oldest overdue first
      skip: (page - 1) * limit,
      take: limit,
    });

    // Calculate days overdue for each EMI
    const now = new Date();
    const emisWithDetails = overdueEmis.map((emi) => {
      const daysOverdue = Math.floor((now.getTime() - emi.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: emi.id,
        emiNumber: emi.emiNumber,
        dueDate: emi.dueDate,
        emiAmount: emi.emiAmount,
        lateFee: emi.lateFee,
        totalDue: emi.emiAmount + (emi.lateFee || 0),
        daysOverdue,
        loan: {
          id: emi.loan.id,
          loanNumber: emi.loan.loanNumber,
          approvedAmount: emi.loan.approvedAmount,
          status: emi.loan.status,
        },
        request: {
          id: emi.loan.request.id,
          requestNumber: emi.loan.request.requestNumber,
        },
        customer: emi.loan.request.customer,
        district: emi.loan.request.district,
      };
    });

    res.json({
      success: true,
      message: 'Overdue EMIs retrieved',
      data: {
        emis: emisWithDetails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('listOverdueEmisController error', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve overdue EMIs' });
  }
}

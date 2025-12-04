import type { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import { calculateEmiBreakdown } from '@fundifyhub/utils';
import { ROLES } from '@fundifyhub/types';
import { sendEMIReminderNotification } from '../../utils/notifications';

/**
 * GET /api/v1/payments/loan/:loanId/total-due
 * Get total due amount for a loan (all unpaid EMIs)
 */
export const getLoanTotalDueController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { loanId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify loan ownership via request
    const loan = await prisma.loan.findFirst({
      where: { id: loanId, request: { customerId: userId } },
      include: { request: true }
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    // Get all unpaid/overdue EMIs
    const unpaidEmis = await prisma.eMISchedule.findMany({
      where: {
        loanId,
        status: { in: ['PENDING', 'OVERDUE'] }
      },
      orderBy: { dueDate: 'asc' }
    });

    const totalDue = unpaidEmis.reduce((sum, emi) => sum + emi.emiAmount, 0);

    return res.json({
      success: true,
      data: {
        loanId,
        totalDue,
        unpaidEmiCount: unpaidEmis.length,
        emis: unpaidEmis.map(emi => ({
          id: emi.id,
          dueDate: emi.dueDate,
          emiAmount: emi.emiAmount,
          status: emi.status
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching total due:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/v1/payments/emi/pay
 * Pay a specific EMI with sequential validation and penalty calculation
 */
export const payEmiController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { emiId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!emiId) {
      return res.status(400).json({ success: false, message: 'EMI ID is required' });
    }

    // Get the EMI with loan and request details
    const emi = await prisma.eMISchedule.findFirst({
      where: { id: emiId },
      include: {
        loan: {
          include: {
            request: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    });

    if (!emi) {
      return res.status(404).json({ success: false, message: 'EMI not found' });
    }

    // Verify ownership
    if (emi.loan.request.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if loan is ACTIVE (stage must be ACTIVE)
    if (emi.loan.request.stage !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Loan is not active' });
    }

    // Check if EMI is payable (not already paid)
    if (emi.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'EMI is already paid' });
    }

    // Get all EMIs for penalty calculation
    const allEmis = await prisma.eMISchedule.findMany({
      where: { loanId: emi.loanId },
      orderBy: { emiNumber: 'asc' }
    });

    // Calculate breakdown with penalties
    const breakdown = calculateEmiBreakdown(
      {
        emiNumber: emi.emiNumber,
        emiAmount: emi.emiAmount,
        principalAmount: emi.principalAmount,
        interestAmount: emi.interestAmount,
        status: emi.status,
        dueDate: emi.dueDate.toISOString()
      },
      allEmis.map(e => ({
        emiNumber: e.emiNumber,
        status: e.status,
        emiAmount: e.emiAmount,
        lateFee: e.lateFee,
        dueDate: e.dueDate.toISOString()
      })),
      emi.loan.request.penaltyPercentage || 4, // Default 4%
      emi.loan.request.lateFeePercentage || 0.01 // Default 0.01%
    );

    // Update EMI status and lateFee
    await prisma.eMISchedule.update({
      where: { id: emiId },
      data: {
        status: 'PAID',
        lateFee: breakdown.lateFee,
        paidDate: new Date()
      }
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        emiScheduleId: emiId,
        loanId: emi.loanId,
        requestId: emi.requestId,
        amount: breakdown.totalDue,
        paymentType: 'EMI',
        paymentMethod: 'RAZORPAY', // Will be updated after Razorpay verification
        paymentReference: `EMI-${emi.loan.loanNumber}-${emi.emiNumber}-${Date.now()}`,
        processedBy: userId,
        remarks: `EMI #${emi.emiNumber} payment`
      }
    });

    // Recalculate loan aggregate fields
    const allEmisAfterPayment = await prisma.eMISchedule.findMany({
      where: { loanId: emi.loanId }
    });

    const paidEmisCount = allEmisAfterPayment.filter(e => e.status === 'PAID').length;
    const totalPaidAmount = allEmisAfterPayment
      .filter(e => e.status === 'PAID')
      .reduce((sum, e) => sum + e.emiAmount + (e.lateFee || 0), 0);
    const remainingAmount = emi.loan.totalAmount - totalPaidAmount;
    const remainingEmisCount = allEmisAfterPayment.filter(e => e.status !== 'PAID').length;
    const overdueEmisCount = allEmisAfterPayment.filter(e => e.status === 'OVERDUE').length;

    // Update loan with recalculated values
    await prisma.loan.update({
      where: { id: emi.loanId },
      data: {
        paidEMIs: paidEmisCount,
        totalPaidAmount,
        remainingAmount: Math.max(0, remainingAmount), // Ensure non-negative
        remainingEMIs: remainingEmisCount,
        overdueEMIs: overdueEmisCount,
        // Update loan status if all EMIs are paid
        status: paidEmisCount === emi.loan.tenureMonths ? 'COMPLETED' : 'ACTIVE'
      }
    });

    // Send payment confirmation notification
    await sendEMIReminderNotification(
      {
        userId: emi.loan.request.customer.id,
        email: emi.loan.request.customer.email || undefined,
        phoneNumber: emi.loan.request.customer.phoneNumber || undefined,
        name: `${emi.loan.request.customer.firstName} ${emi.loan.request.customer.lastName}`,
      },
      {
        loanNumber: emi.loan.loanNumber || '',
        emiNumber: emi.emiNumber,
        emiAmount: breakdown.totalDue,
        dueDate: emi.dueDate.toISOString().split('T')[0],
        daysUntilDue: 0, // Payment completed
        totalOutstanding: 0,
      }
    );

    return res.json({
      success: true,
      data: {
        emiId,
        paymentId: payment.id,
        breakdown,
        message: 'EMI payment initiated successfully'
      }
    });

  } catch (error) {
    console.error('Error processing EMI payment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/v1/payments/emi/:emiId/breakdown
 * Get payment breakdown for a specific EMI including penalties
 */
export const getEmiBreakdownController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { emiId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get the EMI with loan and request details
    const emi = await prisma.eMISchedule.findFirst({
      where: { id: emiId },
      include: {
        loan: {
          include: {
            request: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    });

    if (!emi) {
      return res.status(404).json({ success: false, message: 'EMI not found' });
    }

    // Verify ownership - customer can view their own EMIs, admins can view all
    const isOwner = emi.loan.request.customerId === userId;
    const user = req.user;
    const isAdmin = user?.roles?.includes(ROLES.SUPER_ADMIN) || user?.roles?.includes(ROLES.DISTRICT_ADMIN);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if loan is ACTIVE (stage must be ACTIVE)
    if (emi.loan.request.stage !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Loan is not active' });
    }

    // Get all EMIs for penalty calculation
    const allEmis = await prisma.eMISchedule.findMany({
      where: { loanId: emi.loanId },
      orderBy: { emiNumber: 'asc' }
    });

    // Calculate breakdown with penalties
    const breakdown = calculateEmiBreakdown(
      {
        emiNumber: emi.emiNumber,
        emiAmount: emi.emiAmount,
        principalAmount: emi.principalAmount,
        interestAmount: emi.interestAmount,
        status: emi.status,
        dueDate: emi.dueDate.toISOString()
      },
      allEmis.map(e => ({
        emiNumber: e.emiNumber,
        status: e.status,
        emiAmount: e.emiAmount,
        lateFee: e.lateFee || 0,
        dueDate: e.dueDate.toISOString()
      })),
      emi.loan.request.penaltyPercentage || 4, // Default 4%
      emi.loan.request.lateFeePercentage || 0.01 // Default 0.01%
    );

    return res.json({
      success: true,
      data: {
        emiId,
        breakdown,
        emi: {
          emiNumber: emi.emiNumber,
          dueDate: emi.dueDate,
          status: emi.status,
          emiAmount: emi.emiAmount,
          principalAmount: emi.principalAmount,
          interestAmount: emi.interestAmount,
          lateFee: emi.lateFee
        }
      }
    });

  } catch (error) {
    console.error('Error calculating EMI breakdown:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

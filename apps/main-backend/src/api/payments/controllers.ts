import type { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import { calculateEmiBreakdown } from '@fundifyhub/utils';
import { createEnqueueClient } from '@fundifyhub/utils/src/enqueue';
import { TEMPLATE_NAMES } from '@fundifyhub/types';

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

    // Check if loan is ACTIVE
    if (emi.loan.request.currentStatus !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Loan is not active' });
    }

    // Sequential payment validation: Find the oldest unpaid EMI
    const oldestUnpaidEmi = await prisma.eMISchedule.findFirst({
      where: {
        loanId: emi.loanId,
        status: { in: ['PENDING', 'OVERDUE'] }
      },
      orderBy: { dueDate: 'asc' }
    });

    if (!oldestUnpaidEmi) {
      return res.status(400).json({ success: false, message: 'No unpaid EMIs found' });
    }

    if (oldestUnpaidEmi.id !== emiId) {
      return res.status(400).json({
        success: false,
        message: 'You must pay the oldest unpaid EMI first',
        oldestUnpaidEmi: {
          id: oldestUnpaidEmi.id,
          emiNumber: oldestUnpaidEmi.emiNumber,
          dueDate: oldestUnpaidEmi.dueDate
        }
      });
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
        remarks: `EMI #${emi.emiNumber} payment`
      }
    });

    // Send payment confirmation notification
    const enqueueClient = createEnqueueClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    await enqueueClient.addAJob(TEMPLATE_NAMES.EMI_REMINDER, {
      customerName: emi.loan.request.customer.firstName + ' ' + emi.loan.request.customer.lastName,
      email: emi.loan.request.customer.email,
      phoneNumber: emi.loan.request.customer.phoneNumber || '',
      loanNumber: emi.loan.loanNumber || '',
      emiNumber: emi.emiNumber,
      emiAmount: breakdown.totalDue,
      dueDate: emi.dueDate.toISOString().split('T')[0],
      daysUntilDue: 0, // Payment completed
      totalOutstanding: 0, // Will be calculated if needed
      paymentUrl: '', // Not needed for confirmation
      companyName: 'FundifyHub'
    });

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

import type { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';

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

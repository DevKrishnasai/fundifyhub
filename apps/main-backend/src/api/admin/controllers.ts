import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import { LOAN_STATUS, REQUEST_STATUS } from '@fundifyhub/types';
import { APIResponseType } from '../../types';
import logger from '../../utils/logger';


export async function getActiveLoansController(req: Request, res: Response): Promise<void> {
  try {
    // Query all loans with status ACTIVE
    const activeLoans = await prisma.loan.findMany({
      where: {
        status: LOAN_STATUS.ACTIVE,
      },
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
                district: true,
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `Found ${activeLoans.length} active loan(s)`,
      data: activeLoans,
    } as APIResponseType);
  } catch (error) {
    logger.error('Error getting active loans:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active loans',
    } as APIResponseType);
  }
}

/**
 * 
 * @param req 
 * @param res 
 * @returns 
 */
export async function getPendingRequestsController(req: Request, res: Response): Promise<void> {
  try {
    const pendingStatuses = [
      REQUEST_STATUS.PENDING,
      REQUEST_STATUS.UNDER_REVIEW,
      REQUEST_STATUS.OFFER_MADE,
      REQUEST_STATUS.OFFER_ACCEPTED,
      REQUEST_STATUS.OFFER_REJECTED,
      REQUEST_STATUS.INSPECTION_SCHEDULED,
      REQUEST_STATUS.INSPECTION_IN_PROGRESS,
      REQUEST_STATUS.INSPECTION_COMPLETED
    ];

    const pendingRequests = await prisma.request.findMany({
      where: {
        currentStatus: {
          in: pendingStatuses
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            district: true
          }
        },
        assignedAgent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true
          }
        },
        loan: {
          select: {
            id: true,
            status: true,
            approvedAmount: true,
            disbursedDate: true
          }
        },
        _count: {
          select: {
            comments: true,
            inspections: true,
            documents: true
          }
        }
      },
      orderBy: {
        submittedDate: 'desc'
      }
    });

    if (pendingRequests.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No pending requests found',
        data: []
      } as APIResponseType);
      return;
    }

    res.status(200).json({
      success: true,
      message: `Found ${pendingRequests.length} pending request(s)`,
      data: pendingRequests
    } as APIResponseType);
  } catch (error) {
    logger.error('Error getting pending requests:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending requests'
    } as APIResponseType);
  }
}
import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import { LOAN_STATUS, REQUEST_STATUS, PENDING_REQUEST_STATUSES } from '@fundifyhub/types';
import { APIResponseType } from '../../types';
import logger from '../../utils/logger';
import { ROLES } from '@fundifyhub/types';
import { hasDistrictAccess, hasAnyRole } from '../../utils/rbac';


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
    const pendingStatuses = PENDING_REQUEST_STATUSES;

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

/**
 * GET /admin/requests
 * Query params: status (comma separated), district, limit, offset
 * RBAC: SUPER_ADMIN may see all; DISTRICT_ADMIN may only see requests in their districts
 */
export async function getRequestsController(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray(user.roles) && user.roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasAnyRole(user, [ROLES.DISTRICT_ADMIN])) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    const { status, district, limit = '50', offset = '0' } = req.query as Record<string, string>;
    const where: any = {};

    if (status) {
      const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) where.currentStatus = { in: statuses };
    }

    if (district) {
      where.district = String(district);
    }

    // If district admin and not super, restrict to their districts
    if (!isSuper && Array.isArray(user.roles) && user.roles.includes(ROLES.DISTRICT_ADMIN)) {
      // user.districts is string[]
      if (!where.district) {
        where.district = { in: (user as any).districts || [] };
      } else {
        // ensure the requested district is within user's allowed districts
        if (!hasDistrictAccess(user as any, String(where.district))) {
          res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
          return;
        }
      }
    }

    const lim = Math.min(100, Number(limit) || 50);
    const off = Math.max(0, Number(offset) || 0);

    const requests = await prisma.request.findMany({
      where,
      select: {
        id: true,
        requestNumber: true,
        requestedAmount: true,
        district: true,
        currentStatus: true,
        assignedAgentId: true,
        submittedDate: true,
        assetBrand: true,
        assetModel: true,
        assetType: true,
        assetCondition: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            district: true,
          }
        }
      },
      orderBy: { submittedDate: 'desc' },
      skip: off,
      take: lim,
    });

    res.status(200).json({ success: true, message: `Found ${requests.length} request(s)`, data: { requests } } as APIResponseType);
  } catch (error) {
    logger.error('Error getting admin requests:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to get requests' } as APIResponseType);
  }
}
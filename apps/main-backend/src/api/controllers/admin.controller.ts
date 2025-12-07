import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import { LOAN_STATUS, REQUEST_STAGE, PENDING_STAGES, stageToLegacyStatus } from '@fundifyhub/types';
import { APIResponseType } from '../../types';
import logger from '../../utils/logger';
import { ROLES } from '@fundifyhub/types';
import { hasDistrictAccess, hasAnyRole } from '../../utils/rbac';

/**
 * Enrich request with computed currentStatus for backward compatibility with frontend
 */
function enrichRequestWithLegacyStatus<T extends { stage?: string; subStatus?: string | null }>(
  request: T
): T & { currentStatus: string } {
  const stage = (request.stage as REQUEST_STAGE) || REQUEST_STAGE.REVIEW;
  const subStatus = request.subStatus || null;
  const currentStatus = stageToLegacyStatus(stage, subStatus);
  return { ...request, currentStatus };
}


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
                homeDistrictId: true,
                homeDistrict: { select: { id: true, name: true, code: true } },
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
    // Pending requests are in REVIEW or OFFER stage that require admin action
    const pendingRequests = await prisma.request.findMany({
      where: {
        OR: [
          { stage: 'REVIEW' },
          { stage: 'OFFER', subStatus: 'PENDING' },
        ],
        requiresAdminAction: true,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            homeDistrictId: true,
            homeDistrict: { select: { id: true, name: true, code: true } },
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
        
        _count: {
          select: {
            comments: true,
            inspections: true,
            documents: true
          }
        }
        ,
        loan: {
          select: {
            id: true,
            approvedAmount: true,
            status: true,
            disbursedDate: true,
            totalPaidAmount: true,
            remainingAmount: true,
            emiAmount: true,
            tenureMonths: true,
          }
        },
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
    const where: Record<string, unknown> = {};

    // Status filter maps to stage-based filtering
    if (status) {
      const statuses = String(status).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (statuses.length > 0) {
        // Map status keywords to stages
        const stageFilters: REQUEST_STAGE[] = [];
        for (const s of statuses) {
          if (s === 'PENDING') {
            stageFilters.push(...PENDING_STAGES);
          } else if (Object.values(REQUEST_STAGE).includes(s as REQUEST_STAGE)) {
            stageFilters.push(s as REQUEST_STAGE);
          }
        }
        if (stageFilters.length > 0) {
          where.stage = { in: stageFilters };
        }
      }
    }

    if (district) {
      where.districtId = String(district);
    }

    // If district admin and not super, restrict to their districts + assignment rules
    if (!isSuper && Array.isArray(user.roles) && user.roles.includes(ROLES.DISTRICT_ADMIN)) {
      // user.districts is string[] of district IDs from districtAssignments
      const userDistrictIds = user.districts || [];
      
      // District admins see:
      // 1. Requests assigned to them (assignedAdminId = their id) - regardless of status
      // 2. Unassigned requests in their districts in any pending stage
      where.OR = [
        { assignedAdminId: user.id },
        { 
          assignedAdminId: null,
          districtId: { in: userDistrictIds },
          stage: { in: PENDING_STAGES }
        }
      ];
      
      // If specific district filter requested, validate access
      if (district) {
        if (!hasDistrictAccess(user, String(district))) {
          res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
          return;
        }
        // Override the OR with specific district filter but keep assignment logic
        where.OR = [
          { assignedAdminId: user.id, districtId: String(district) },
          { assignedAdminId: null, districtId: String(district), stage: { in: PENDING_STAGES } }
        ];
      }
    }

    const lim = Math.min(100, Number(limit) || 50);
    const off = Math.max(0, Number(offset) || 0);
    logger.info(`getRequestsController: userId=${user.id}, isSuper=${isSuper}, status=${status}, district=${district}, limit=${lim}, offset=${off}, where=${JSON.stringify(where)}`);

    const requests = await prisma.request.findMany({
      where,
      select: {
          assignedAgent: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
          assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { comments: true, inspections: true, documents: true } },
          inspectionScheduledAt: true,
          penaltyPercentage: true,
          lateFeePercentage: true,
          bankDetailsSubmittedAt: true,
          disbursementAccount: {
            select: {
              id: true,
              accountNumber: true,
              ifscCode: true,
              accountName: true,
              bankName: true,
              upiId: true,
              isVerified: true,
            }
          },
        id: true,
        requestNumber: true,
        requestedAmount: true,
        districtId: true,
        district: { select: { id: true, name: true, code: true } },
        stage: true,
        subStatus: true,
        requiresCustomerAction: true,
        requiresAdminAction: true,
        requiresAgentAction: true,
        assignedAgentId: true,
        assignedAdminId: true,
        adminOfferedAmount: true,
        adminInterestRate: true,
        adminTenureMonths: true,
        adminEmiSchedule: true,
        offerMadeDate: true,
        submittedDate: true,
        asset: {
          select: {
            id: true,
            assetType: true,
            brand: true,
            model: true,
            condition: true,
            purchaseYear: true,
            description: true,
            estimatedValue: true,
            inspectedValue: true,
            status: true,
          }
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            homeDistrictId: true,
            homeDistrict: { select: { id: true, name: true, code: true } },
          }
        }
        ,
        loan: {
          select: {
            id: true,
            status: true,
            approvedAmount: true,
            disbursedDate: true,
            totalPaidAmount: true,
            remainingAmount: true,
            tenureMonths: true,
            emiAmount: true,
          }
        }
      },
      orderBy: { submittedDate: 'desc' },
      skip: off,
      take: lim,
    });

    // Add currentStatus for backward compatibility with frontend
    const requestsWithLegacyStatus = requests.map(enrichRequestWithLegacyStatus);

    res.status(200).json({ success: true, message: `Found ${requests.length} request(s)`, data: { requests: requestsWithLegacyStatus } } as APIResponseType);
  } catch (error) {
    logger.error('Error getting admin requests:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to get requests' } as APIResponseType);
  }
}
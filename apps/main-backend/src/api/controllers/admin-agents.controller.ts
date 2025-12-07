import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import logger from '../utils/logger';
import { APIResponseType } from '@fundifyhub/types';
import { hasDistrictAccess } from '../middlewares/rbac.middleware';
import { ROLES } from '@fundifyhub/types';

/**
 * GET /admin/agents?districtId=districtCUID
 * Returns agents filtered by district. If districtId is not provided, returns agents
 * for the requesting user's assigned districts.
 */
export async function getAgentsByDistrictController(req: Request, res: Response): Promise<void> {
  try {
    const districtId = typeof req.query.districtId === 'string'
      ? req.query.districtId
      : undefined;

    // Authorization: only SUPER_ADMIN or district admins can list agents
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    const isSuper = user.roles?.includes(ROLES.SUPER_ADMIN);
    
    // Build the where clause based on district access
    let districtFilter: string[] = [];
    
    if (districtId) {
      // Specific district requested - check access
      if (!isSuper && !hasDistrictAccess(user, districtId)) {
        res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
        return;
      }
      districtFilter = [districtId];
    } else if (!isSuper) {
      // Use user's assigned districts
      districtFilter = user.districts || [];
      if (districtFilter.length === 0) {
        res.status(400).json({ success: false, message: 'No district access configured' } as APIResponseType);
        return;
      }
    }

    // Query agents with district assignments
    const agents = await prisma.user.findMany({
      where: {
        roles: { has: ROLES.AGENT },
        isActive: true,
        deletedAt: null,
        // Filter by district assignments if not super admin
        ...(districtFilter.length > 0 && {
          districtAssignments: {
            some: {
              districtId: { in: districtFilter },
              deletedAt: null
            }
          }
        })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        roles: true,
        isActive: true,
        createdAt: true,
        districtAssignments: {
          where: { deletedAt: null },
          select: {
            districtId: true,
            isPrimary: true,
            district: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    // Transform to include district names for easier frontend use
    const transformedAgents = agents.map(agent => ({
      ...agent,
      districts: agent.districtAssignments.map(da => da.district.name),
      districtDetails: agent.districtAssignments.map(da => ({
        id: da.districtId,
        name: da.district.name,
        code: da.district.code,
        isPrimary: da.isPrimary
      }))
    }));

    res.status(200).json({ success: true, message: 'Agents retrieved', data: transformedAgents } as APIResponseType);
  } catch (error) {
    logger.error('getAgentsByDistrictController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve agents' } as APIResponseType);
  }
}

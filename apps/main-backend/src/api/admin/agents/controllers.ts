import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import logger from '../../../utils/logger';
import { APIResponseType } from '../../../types';
import { hasDistrictAccess } from '../../../utils/rbac';
import { ROLES } from '@fundifyhub/types';

/**
 * GET /admin/agents?district=DistrictName
 * Returns agents filtered by district. If district is not provided, uses
 * the requesting user's district (from auth middleware).
 */
export async function getAgentsByDistrictController(req: Request, res: Response): Promise<void> {
  try {
    const queryDistrict = typeof req.query.district === 'string'
      ? (req.query.district as string)
      : (Array.isArray(req.user?.district) ? req.user!.district[0] : '');

    if (!queryDistrict) {
      res.status(400).json({ success: false, message: 'district query parameter required' } as APIResponseType);
      return;
    }

    // Authorization: only SUPER_ADMIN or district admins for that district can list agents
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required' } as APIResponseType);
      return;
    }

    const isSuper = Array.isArray((user as any).roles) && (user as any).roles.includes(ROLES.SUPER_ADMIN);
    if (!isSuper && !hasDistrictAccess(user as any, queryDistrict)) {
      res.status(403).json({ success: false, message: 'Forbidden' } as APIResponseType);
      return;
    }

    const agentsRaw = await prisma.user.findMany({
      where: {
        roles: { has: ROLES.AGENT },
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        district: true,
        roles: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { firstName: 'asc' }
    });

    // Filter in JS to avoid TypeScript/Prisma filter typing issues for string[] filters
    const agents = agentsRaw.filter((a) => Array.isArray(a.district) && a.district.includes(queryDistrict));

    res.status(200).json({ success: true, message: 'Agents retrieved', data: agents } as APIResponseType);
  } catch (error) {
    logger.error('getAgentsByDistrictController error:', error as Error);
    res.status(500).json({ success: false, message: 'Failed to retrieve agents' } as APIResponseType);
  }
}

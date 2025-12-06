/**
 * User Routes
 *
 * Routes for user-specific functionality (profile, dashboard, settings).
 *
 * @module api/http/routes/user
 */

import { Router } from 'express';
import {
  authenticateUser,
  requireAuthentication,
  asyncHandler,
} from '../middlewares';
import { prisma } from '@fundifyhub/prisma';

const router: Router = Router();

/**
 * GET /user/profile
 * Get current user's profile
 */
router.get(
  '/profile',
  authenticateUser,
  requireAuthentication,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        roles: user.roles,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        homeDistrictId: user.homeDistrictId,
        districts: user.districts,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  })
);

/**
 * PUT /user/profile
 * Update current user's profile
 */
router.put(
  '/profile',
  authenticateUser,
  requireAuthentication,
  asyncHandler(async (req, res) => {
    // TODO: Implement profile update with validation
    res.status(501).json({
      success: false,
      message: 'Not implemented',
      code: 'NOT_IMPLEMENTED',
    });
  })
);

/**
 * GET /user/dashboard-stats
 * Get dashboard statistics for the current user
 */
router.get(
  '/dashboard-stats',
  authenticateUser,
  requireAuthentication,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { prisma } = req.app.locals;

    // Get stats based on user role
    const isCustomer = user.roles.includes('CUSTOMER');
    const isAgent = user.roles.includes('AGENT');
    const isAdmin = user.roles.some((r: string) => 
      ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(r)
    );

    let stats: any = {
      totalRequests: 0,
      pendingReview: 0,
      activeLoans: 0,
      totalDisbursed: 0,
    };

    if (isCustomer) {
      // Customer-specific stats
      const [totalRequests, pendingReview, customerRequests] = await Promise.all([
        prisma.request.count({
          where: { customerId: user.id },
        }),
        prisma.request.count({
          where: { 
            customerId: user.id,
            workflowStatus: { in: ['PENDING_AGENT_REVIEW', 'PENDING_ADMIN_REVIEW'] },
          },
        }),
        prisma.request.findMany({
          where: { customerId: user.id },
          select: { id: true },
        }),
      ]);

      const requestIds = customerRequests.map((r: { id: string }) => r.id);
      
      const [activeLoans, disbursedSum] = await Promise.all([
        prisma.loan.count({
          where: { 
            requestId: { in: requestIds },
            status: { in: ['ACTIVE', 'OVERDUE'] },
          },
        }),
        prisma.loan.aggregate({
          where: { 
            requestId: { in: requestIds },
            status: { in: ['ACTIVE', 'OVERDUE', 'CLOSED'] },
          },
          _sum: { approvedAmount: true },
        }),
      ]);

      stats = {
        totalRequests,
        pendingReview,
        activeLoans,
        totalDisbursed: disbursedSum._sum.approvedAmount || 0,
      };
    } else if (isAgent || isAdmin) {
      // Agent/Admin stats (filtered by geography if applicable)
      const whereClause: any = {};
      
      if (isAgent && user.homeDistrictId) {
        whereClause.districtId = user.homeDistrictId;
      } else if (isAdmin && user.districts && user.districts.length > 0 && !user.roles.includes('SUPER_ADMIN')) {
        whereClause.districtId = { in: user.districts };
      }

      const [totalRequests, pendingReview, requests] = await Promise.all([
        prisma.request.count({ where: whereClause }),
        prisma.request.count({
          where: { 
            ...whereClause,
            workflowStatus: { in: ['PENDING_AGENT_REVIEW', 'PENDING_ADMIN_REVIEW'] },
          },
        }),
        prisma.request.findMany({
          where: whereClause,
          select: { id: true },
        }),
      ]);

      const requestIds = requests.map((r: { id: string }) => r.id);
      
      const [activeLoans, disbursedSum] = await Promise.all([
        prisma.loan.count({
          where: { 
            ...(requestIds.length > 0 ? { requestId: { in: requestIds } } : { requestId: 'none' }),
            status: { in: ['ACTIVE', 'OVERDUE'] },
          },
        }),
        prisma.loan.aggregate({
          where: { 
            ...(requestIds.length > 0 ? { requestId: { in: requestIds } } : { requestId: 'none' }),
            status: { in: ['ACTIVE', 'OVERDUE', 'CLOSED'] },
          },
          _sum: { approvedAmount: true },
        }),
      ]);

      stats = {
        totalRequests,
        pendingReview,
        activeLoans,
        totalDisbursed: disbursedSum._sum.approvedAmount || 0,
      };
    }

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /user/requests
 * Get requests for the current user
 */
router.get(
  '/requests',
  authenticateUser,
  requireAuthentication,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { prisma } = req.app.locals;

    // Parse query params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const whereClause: any = {};
    
    if (user.roles.includes('CUSTOMER')) {
      whereClause.customerId = user.id;
    } else if (user.roles.includes('AGENT') && user.homeDistrictId) {
      whereClause.districtId = user.homeDistrictId;
    } else if (user.districts && user.districts.length > 0 && !user.roles.includes('SUPER_ADMIN')) {
      whereClause.districtId = { in: user.districts };
    }

    // Add status filter if provided
    if (req.query.status) {
      whereClause.workflowStatus = req.query.status;
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
          district: {
            select: {
              id: true,
              name: true,
              state: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          assets: {
            select: {
              id: true,
              description: true,
              estimatedValue: true,
              category: true,
            },
          },
        },
      }),
      prisma.request.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  })
);

export default router;

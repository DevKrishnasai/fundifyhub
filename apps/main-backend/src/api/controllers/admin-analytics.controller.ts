import { Request, Response } from 'express';
import { prisma } from '@fundifyhub/prisma';
import { ROLES } from '@fundifyhub/types';
import logger from '../utils/logger';

/**
 * GET /admin/analytics/summary
 * Get overview metrics
 */
export async function getAnalyticsSummaryController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Check if user has admin role
    const isAdmin = req.user.roles.some((r: string) => 
      ([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN] as readonly string[]).includes(r)
    );
    
    if (!isAdmin) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Get district filter for district admins (now uses districtId FK)
    const districtFilter = req.user.roles.includes(ROLES.SUPER_ADMIN) 
      ? {} 
      : { districtId: { in: req.user.districts || [] } };

    // Execute all queries in parallel
    const [
      totalRequests,
      totalUsers,
      totalLoans,
      activeLoans,
      disbursementData,
      overdueEMIs,
      pendingRequests,
      completedLoans,
    ] = await Promise.all([
      // Total requests
      prisma.request.count({ where: districtFilter }),
      
      // Total users (customers only)
      prisma.user.count({ 
        where: { 
          roles: { has: ROLES.CUSTOMER },
          isActive: true,
        } 
      }),
      
      // Total loans
      prisma.loan.count(),
      
      // Active loans
      prisma.loan.count({ where: { status: 'ACTIVE' } }),
      
      // Total disbursed amount
      prisma.loan.aggregate({
        _sum: { approvedAmount: true },
        where: { disbursedDate: { not: null } },
      }),
      
      // Overdue EMIs count
      prisma.eMISchedule.count({ where: { status: 'OVERDUE' } }),
      
      // Pending requests (REVIEW stage with PENDING subStatus)
      prisma.request.count({ 
        where: { 
          ...districtFilter,
          stage: 'REVIEW',
          subStatus: 'PENDING',
        } 
      }),
      
      // Completed loans
      prisma.loan.count({ where: { status: 'COMPLETED' } }),
    ]);

    // Calculate collection rate
    const collectionData = await prisma.loan.aggregate({
      _sum: {
        totalPaidAmount: true,
        totalAmount: true,
      },
      where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
    });

    const collectionRate = collectionData._sum.totalAmount 
      ? ((collectionData._sum.totalPaidAmount || 0) / collectionData._sum.totalAmount) * 100
      : 0;

    res.json({
      success: true,
      data: {
        totalRequests,
        totalUsers,
        totalLoans,
        activeLoans,
        completedLoans,
        totalDisbursed: disbursementData._sum.approvedAmount || 0,
        overdueEMIs,
        pendingRequests,
        collectionRate: Math.round(collectionRate * 100) / 100,
      },
    });
  } catch (error) {
    logger.error('Analytics summary error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to get analytics summary' });
  }
}

/**
 * GET /admin/analytics/trends
 * Get monthly trends for the last N months
 */
export async function getAnalyticsTrendsController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const months = Math.min(12, Math.max(1, parseInt(req.query.months as string) || 6));
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Get requests grouped by month
    const requests = await prisma.request.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, stage: true, subStatus: true },
    });

    // Get loans grouped by month
    const loans = await prisma.loan.findMany({
      where: { approvedDate: { gte: startDate } },
      select: { approvedDate: true, approvedAmount: true, disbursedDate: true },
    });

    // Get payments grouped by month (all payments are successful/completed)
    const payments = await prisma.payment.findMany({
      where: { 
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, amount: true },
    });

    // Build monthly data
    const monthlyData: Record<string, {
      month: string;
      requests: number;
      approvedLoans: number;
      disbursedAmount: number;
      collections: number;
    }> = {};

    // Initialize all months
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = {
        month: key,
        requests: 0,
        approvedLoans: 0,
        disbursedAmount: 0,
        collections: 0,
      };
    }

    // Aggregate requests
    requests.forEach(r => {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].requests++;
      }
    });

    // Aggregate loans
    loans.forEach(l => {
      const key = `${l.approvedDate.getFullYear()}-${String(l.approvedDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].approvedLoans++;
        if (l.disbursedDate) {
          monthlyData[key].disbursedAmount += l.approvedAmount;
        }
      }
    });

    // Aggregate payments
    payments.forEach(p => {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        monthlyData[key].collections += p.amount;
      }
    });

    // Sort by date and return
    const trends = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: { trends },
    });
  } catch (error) {
    logger.error('Analytics trends error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to get analytics trends' });
  }
}

/**
 * GET /admin/analytics/district-breakdown
 * Get per-district statistics
 */
export async function getAnalyticsDistrictBreakdownController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Get all requests grouped by districtId
    const requestsByDistrict = await prisma.request.groupBy({
      by: ['districtId'],
      _count: { id: true },
    });

    // Get district details with more metrics
    const districtData = await Promise.all(
      requestsByDistrict.map(async (d) => {
        // Get district name
        const district = await prisma.district.findUnique({
          where: { id: d.districtId },
          select: { name: true, code: true }
        });

        const [
          totalRequests,
          pendingRequests,
          activeLoans,
          disbursedAmount,
        ] = await Promise.all([
          prisma.request.count({ where: { districtId: d.districtId } }),
          prisma.request.count({ where: { districtId: d.districtId, stage: 'REVIEW', subStatus: 'PENDING' } }),
          prisma.loan.count({
            where: {
              status: 'ACTIVE',
              request: { districtId: d.districtId },
            },
          }),
          prisma.loan.aggregate({
            _sum: { approvedAmount: true },
            where: {
              disbursedDate: { not: null },
              request: { districtId: d.districtId },
            },
          }),
        ]);

        return {
          districtId: d.districtId,
          district: district?.name || 'Unknown',
          districtCode: district?.code || '',
          totalRequests,
          pendingRequests,
          activeLoans,
          disbursedAmount: disbursedAmount._sum.approvedAmount || 0,
        };
      })
    );

    // Sort by total requests descending
    districtData.sort((a, b) => b.totalRequests - a.totalRequests);

    res.json({
      success: true,
      data: { districts: districtData },
    });
  } catch (error) {
    logger.error('Analytics district breakdown error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to get district breakdown' });
  }
}

/**
 * GET /admin/analytics/request-status
 * Get request counts by status
 */
export async function getAnalyticsRequestStatusController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const statusCounts = await prisma.request.groupBy({
      by: ['stage'],
      _count: { id: true },
    });

    const statusBreakdown = statusCounts.map(s => ({
      status: s.stage,
      count: s._count?.id ?? 0,
    }));

    // Sort by count descending
    statusBreakdown.sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: { statusBreakdown },
    });
  } catch (error) {
    logger.error('Analytics request status error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ success: false, message: 'Failed to get request status breakdown' });
  }
}

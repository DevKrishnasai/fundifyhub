// Real data service functions for the main backend API
import { prisma } from '@fundifyhub/prisma';
import { createLogger } from '@fundifyhub/logger';
import type { Request, Response } from 'express';

const logger = createLogger({ serviceName: 'main-backend-data-service' });

// API endpoint handlers
export async function getDashboardStats(req: Request, res: Response) {
  try {
    logger.info('Fetching dashboard statistics...');
    
    const [userStats, paymentStats, walletStats, recentActivity] = await Promise.all([
      prisma.user.aggregate({
        _count: true,
        where: { isActive: true }
      }),
      prisma.payment.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true }
      }),
      prisma.wallet.aggregate({
        _sum: { balance: true },
        _count: true
      }),
      prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      })
    ]);
    
    const totalRevenue = paymentStats
      .filter((p: any) => p.status === 'COMPLETED')
      .reduce((sum: number, p: any) => sum + (p._sum.amount?.toNumber() || 0), 0);
    
    const stats = {
      users: {
        total: userStats._count,
        active: userStats._count
      },
      payments: {
        byStatus: paymentStats.map((p: any) => ({
          status: p.status,
          count: p._count,
          totalAmount: p._sum.amount?.toNumber() || 0
        })),
        totalRevenue
      },
      wallets: {
        count: walletStats._count,
        totalBalance: walletStats._sum.balance?.toNumber() || 0
      },
      recentActivity
    };
    
    logger.info('Dashboard statistics fetched successfully');
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Failed to fetch dashboard stats:', error as Error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard statistics' 
    });
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    logger.info(`Fetching users - page: ${page}, limit: ${limit}, search: ${search}`);
    
    const whereClause = search ? {
      OR: [
        { email: { contains: String(search), mode: 'insensitive' as const } },
        { firstName: { contains: String(search), mode: 'insensitive' as const } },
        { lastName: { contains: String(search), mode: 'insensitive' as const } }
      ]
    } : {};
    
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: Number(limit),
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
          emailVerified: true,
          phoneVerified: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              payments: true,
              wallets: true
            }
          }
        }
      }),
      prisma.user.count({ where: whereClause })
    ]);
    
    logger.info(`Fetched ${users.length} users out of ${totalCount} total`);
    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch users:', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
}

export async function getPayments(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    logger.info(`Fetching payments - page: ${page}, limit: ${limit}, status: ${status}, userId: ${userId}`);
    
    const whereClause: any = {};
    if (status) whereClause.status = String(status);
    if (userId) whereClause.userId = String(userId);
    
    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        skip,
        take: Number(limit),
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.payment.count({ where: whereClause })
    ]);
    
    logger.info(`Fetched ${payments.length} payments out of ${totalCount} total`);
    res.json({
      success: true,
      data: payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch payments:', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
}

export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    logger.info(`Fetching user profile for ID: ${id}`);
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        payments: {
          take: 20,
          orderBy: { createdAt: 'desc' }
        },
        wallets: true,
        _count: {
          select: {
            payments: true,
            wallets: true,
            investments: true,
            notifications: true
          }
        }
      }
    });
    
    if (!user) {
      logger.warn(`User not found: ${id}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    logger.info(`User profile fetched successfully for: ${user.email}`);
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Failed to fetch user profile:', error as Error);
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
}

// Health check function
export async function getDatabaseHealth(req: Request, res: Response) {
  try {
    logger.info('Checking database health...');
    
    const [userCount, paymentCount, walletCount, transactionCount] = await Promise.all([
      prisma.user.count(),
      prisma.payment.count(),
      prisma.wallet.count(),
      prisma.transaction.count()
    ]);
    
    const health = {
      database: 'connected',
      timestamp: new Date().toISOString(),
      counts: {
        users: userCount,
        payments: paymentCount,
        wallets: walletCount,
        transactions: transactionCount
      }
    };
    
    logger.info('Database health check completed');
    res.json({ success: true, data: health });
  } catch (error) {
    logger.error('Database health check failed:', error as Error);
    res.status(500).json({ 
      success: false, 
      error: 'Database health check failed',
      database: 'disconnected' 
    });
  }
}
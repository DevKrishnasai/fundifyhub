// Real data fetching functions for the frontend
import { prisma } from '@fundifyhub/prisma';

export async function getDashboardStats() {
  try {
    const [userCount, paymentCount, totalRevenue, recentPayments] = await Promise.all([
      prisma.user.count(),
      prisma.payment.count(),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      })
    ]);

    return {
      success: true,
      data: {
        userCount,
        paymentCount,
        totalRevenue: totalRevenue._sum.amount?.toNumber() || 0,
        recentPayments
      }
    };
  } catch (error) {
    console.error('❌ Failed to fetch dashboard stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getUsers(limit: number = 10) {
  try {
    const users = await prisma.user.findMany({
      take: limit,
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
    });

    return {
      success: true,
      data: users
    };
  } catch (error) {
    console.error('❌ Failed to fetch users:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getPayments(limit: number = 20) {
  try {
    const payments = await prisma.payment.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      }
    });

    return {
      success: true,
      data: payments
    };
  } catch (error) {
    console.error('❌ Failed to fetch payments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getUserProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        payments: {
          take: 10,
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
      return {
        success: false,
        error: 'User not found'
      };
    }

    return {
      success: true,
      data: user
    };
  } catch (error) {
    console.error('❌ Failed to fetch user profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
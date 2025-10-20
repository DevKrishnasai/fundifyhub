// Real data fetching functions for the frontend
import { prisma } from '@fundifyhub/prisma';

export async function getDashboardStats() {
  try {
    const [userCount, requestCount, totalPayments, recentPayments] = await Promise.all([
      prisma.user.count(),
      prisma.request.count(),
      prisma.payment.aggregate({
        _sum: { amount: true }
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          emiSchedule: {
            include: {
              loan: {
                include: {
                  request: {
                    include: {
                      customer: {
                        select: { name: true, email: true }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    return {
      success: true,
      data: {
        userCount,
        requestCount,
        totalPayments: totalPayments._sum.amount || 0,
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
        name: true,
        role: true,
        district: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            requests: true,
            comments: true
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
        emiSchedule: {
          include: {
            loan: {
              include: {
                request: {
                  include: {
                    customer: {
                      select: { name: true, email: true }
                    }
                  }
                }
              }
            }
          }
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
        requests: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            loan: true,
            documents: true
          }
        },
        comments: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            requests: true,
            comments: true
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

export async function getRequests(limit: number = 20) {
  try {
    const requests = await prisma.request.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true, email: true }
        },
        loan: true,
        documents: true,
        comments: true
      }
    });

    return {
      success: true,
      data: requests
    };
  } catch (error) {
    console.error('❌ Failed to fetch requests:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
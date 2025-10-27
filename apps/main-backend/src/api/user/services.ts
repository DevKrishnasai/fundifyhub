/**
 * User Services
 * Business logic and DB access for user-related operations
 */
import { prisma } from '@fundifyhub/prisma';
import { createLogger } from '@fundifyhub/logger';

const logger = createLogger({ serviceName: 'user-services' });

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<{
  success: boolean;
  data?: any;
  message: string;
}> {
  try {
    if (!userId) {
      return {
        success: false,
        message: 'User not found in token',
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        district: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      return {
        success: false,
        message: 'User not found or inactive',
      };
    }

    return {
      success: true,
      data: { user },
      message: 'Profile retrieved successfully',
    };
  } catch (error) {
    logger.error('Get profile error:', error as Error);
    return {
      success: false,
      message: 'Failed to retrieve profile',
    };
  }
}

/**
 * Validate user authentication status
 */
export async function validateUserAuth(userId: string): Promise<{
  success: boolean;
  data?: {
    isAuthenticated: boolean;
    user?: any;
  };
  message: string;
}> {
  try {
    if (!userId) {
      return {
        success: false,
        data: {
          isAuthenticated: false,
        },
        message: 'Not authenticated',
      };
    }

    const freshUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
      },
    });

    if (!freshUser || !freshUser.isActive) {
      return {
        success: false,
        data: {
          isAuthenticated: false,
        },
        message: 'User not found or inactive',
      };
    }

    return {
      success: true,
      data: {
        isAuthenticated: true,
        user: freshUser,
      },
      message: 'Authentication validated',
    };
  } catch (error) {
    logger.error('Auth validation error:', error as Error);
    return {
      success: false,
      data: {
        isAuthenticated: false,
      },
      message: 'Authentication validation failed',
    };
  }
}

/**
 * Debug authentication - shows token data vs database data
 */
export async function debugAuth(
  userId: string,
  tokenData: any
): Promise<{
  success: boolean;
  data?: any;
  message: string;
}> {
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      message: 'Not available in production',
    };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    return {
      success: true,
      data: {
        tokenData: {
          ...tokenData,
          rolesType: Array.isArray(tokenData?.roles) ? 'array' : typeof tokenData?.roles,
        },
        databaseData: {
          ...dbUser,
          rolesType: Array.isArray(dbUser?.roles) ? 'array' : typeof dbUser?.roles,
        },
        comparison: {
          rolesMatch: JSON.stringify(tokenData?.roles) === JSON.stringify(dbUser?.roles),
          tokenRoles: tokenData?.roles,
          dbRoles: dbUser?.roles,
        },
      },
      message: 'Debug data retrieved',
    };
  } catch (error) {
    logger.error('Debug auth error:', error as Error);
    return {
      success: false,
      message: 'Debug failed',
    };
  }
}

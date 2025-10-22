import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { createLogger } from '@fundifyhub/logger';
import { requireAuth } from '../../../middleware/auth';
import { prisma } from '@fundifyhub/prisma';

const router: ExpressRouter = Router();
const logger = createLogger({ serviceName: 'user-routes' });

/**
 * GET /api/v1/user/profile
 * Get current user profile (protected)
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found in token',
        code: 'USER_NOT_FOUND'
      });
    }

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true, // Changed from role to roles
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        district: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
});

/**
 * GET /api/v1/user/validate
 * Validate authentication status (protected)
 */
router.get('/validate', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        data: {
          isAuthenticated: false,
          user: null
        }
      });
    }

    // Fetch fresh user data for validation
    const freshUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true, // Changed from role to roles
        emailVerified: true,
        phoneVerified: true,
        isActive: true
      }
    });

    if (!freshUser || !freshUser.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        data: {
          isAuthenticated: false,
          user: null
        }
      });
    }

    res.json({
      success: true,
      message: 'Authentication validated',
      data: {
        isAuthenticated: true,
        user: freshUser
      }
    });

  } catch (error) {
    logger.error('Auth validation error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Authentication validation failed'
    });
  }
});

export default router;
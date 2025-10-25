/**
 * User Controllers
 * Handles HTTP requests and responses for user operations
 * Business logic is delegated to user services
 */

import { Request, Response } from 'express';
import { createLogger } from '@fundifyhub/logger';
import { getUserProfile, validateUserAuth, debugAuth } from './services';

const logger = createLogger({ serviceName: 'user-controllers' });

/**
 * GET /user/profile
 * Get current user profile (protected)
 */
export async function getProfileController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'User not found in token',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const result = await getUserProfile(req.user.id);
    const statusCode = result.success ? 200 : 404;

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logger.error('Get profile error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
    });
  }
}

/**
 * GET /user/validate
 * Validate authentication status (protected)
 */
export async function validateController(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
        data: {
          isAuthenticated: false,
          user: null,
        },
      });
      return;
    }

    const result = await validateUserAuth(req.user.id);
    const statusCode = result.success ? 200 : 401;

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    logger.error('Auth validation error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Authentication validation failed',
    });
  }
}

/**
 * GET /user/debug-auth
 * Debug authentication - shows token data vs database data (development only)
 */
export async function debugAuthController(req: Request, res: Response): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const result = await debugAuth(req.user.id, req.user);

    res.json({
      success: result.success,
      data: result.data,
    });
  } catch (error) {
    logger.error('Debug auth error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
    });
  }
}

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@fundifyhub/logger';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt';
import { AuthPayload } from '../types';

const logger = createLogger({ serviceName: 'auth-middleware' });

// The Request user property is already extended in the existing types

/**
 * Authentication middleware - requires valid JWT token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Try to get token from Authorization header first, then from cookies
    const authHeader = req.headers.authorization;
    const headerToken = extractTokenFromHeader(authHeader);
    const cookieToken = req.cookies?.accessToken;
    const token = headerToken || cookieToken;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    try {
      const decoded = verifyToken(token);
      if(!decoded) {
        res.status(401).json({
          success: false,
          message: 'Authentication required. Please provide a valid token.',
          code: 'TOKEN_MISSING'
        });
        return;
      }
      // Convert JWTPayload to AuthPayload
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.roles[0], // Use first role for backward compatibility
        roles: decoded.roles, // Store all roles
        emailVerified: decoded.emailVerified,
        phoneVerified: decoded.phoneVerified
      };
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
      
      logger.warn(`Authentication failed: ${errorMessage}`);
      
      let code = 'TOKEN_INVALID';
      if (errorMessage.includes('expired')) {
        code = 'TOKEN_EXPIRED';
      }

      res.status(401).json({
        success: false,
        message: errorMessage,
        code
      });
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Authentication service unavailable'
    });
    return;
  }
}

/**
 * Optional authentication middleware - adds user to request if token is valid
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Try to get token from Authorization header first, then from cookies
    const authHeader = req.headers.authorization;
    const headerToken = extractTokenFromHeader(authHeader);
    const cookieToken = req.cookies?.accessToken;
    const token = headerToken || cookieToken;

    if (token) {
      try {
        const decoded = verifyToken(token);
        // Convert JWTPayload to AuthPayload
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.roles[0], // Use first role for backward compatibility
          roles: decoded.roles, // Store all roles
          emailVerified: decoded.emailVerified,
          phoneVerified: decoded.phoneVerified
        };
      } catch (error) {
        // Ignore token errors for optional auth
        logger.debug(`Optional auth failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error as Error);
    next(); // Don't block request for optional auth errors
  }
}

/**
 * Role-based authorization middleware
 * Checks if user has ANY of the required roles
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Check if user has any of the required roles
    const userRoles = req.user.roles || [req.user.role]; // Support both old and new format
    const hasRequiredRole = roles.some(role => 
      userRoles.some(userRole => userRole.toLowerCase() === role.toLowerCase())
    );

    if (!hasRequiredRole) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
}

/**
 * Admin only middleware (includes SUPER_ADMIN)
 */
export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');

/**
 * Agent or Admin middleware
 */
export const requireAgentOrAdmin = requireRole('AGENT', 'ADMIN', 'SUPER_ADMIN');

/**
 * Any authenticated user middleware (alias for requireAuth)
 */
export const requireUser = requireAuth;
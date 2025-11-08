import { Request, Response, NextFunction } from 'express';
import { JWTPayloadType } from '@fundifyhub/types';
import jwt from 'jsonwebtoken';
import logger from './logger';
import config from './env-config';

const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;

/**
 * Generate JWT access token (simplified - single token only)
 */
export function generateAccessToken(payload: JWTPayloadType): string {
  try {
    return jwt.sign(
      payload as object, 
      JWT_SECRET as jwt.Secret, 
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
  } catch (error) {
    const contextLogger = logger.child('[generate-token]');
    contextLogger.error('Failed to generate access token:', error as Error);
    throw new Error('Token generation failed');
  }
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayloadType {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as JWTPayloadType;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      const contextLogger = logger.child('[verify-token]');
      contextLogger.error('Token verification failed:', error as Error);
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Authentication middleware - requires valid JWT token
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Check if token is present in the request (headers or cookies)
    const authHeader = req.headers.authorization;
    const headerToken = authHeader ? authHeader.replace('Bearer ', '') : '';
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
        roles: decoded.roles, // Store all roles
        district: decoded.district,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        isActive: decoded.isActive
      };
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
            
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
    const contextLogger = logger.child('[auth-middleware]');
    contextLogger.error('Authentication error:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Authentication service unavailable'
    });
    return;
  }
}

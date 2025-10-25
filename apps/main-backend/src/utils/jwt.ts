import jwt from 'jsonwebtoken';
import { createLogger } from '@fundifyhub/logger';

const logger = createLogger({ serviceName: 'jwt-utils' });

// JWT configuration - Simplified (only access token needed)
if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
  throw new Error('Missing required JWT environment variables: JWT_SECRET, JWT_EXPIRES_IN');
}

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as string;

export interface JWTPayload {
  id: string;
  userId: string; // Keep for backward compatibility
  email: string;
  roles: string[]; // Changed from role to roles array
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

/**
 * Generate JWT access token (simplified - single token only)
 */
export function generateAccessToken(payload: JWTPayload): string {
  try {
    return jwt.sign(
      payload as object, 
      JWT_SECRET as jwt.Secret, 
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );
  } catch (error) {
    logger.error('Failed to generate access token:', error as Error);
    throw new Error('Token generation failed');
  }
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      logger.error('Token verification failed:', error as Error);
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    logger.error('Failed to decode token for expiration:', error as Error);
    return null;
  }
}
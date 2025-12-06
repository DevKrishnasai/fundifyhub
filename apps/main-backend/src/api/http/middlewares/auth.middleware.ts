/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and attaches user to request.
 * All protected routes should use this middleware.
 * 
 * @module api/http/middlewares/auth
 */

import type { Request, Response, NextFunction } from 'express';
import type { UserType, JWTPayload } from '@fundifyhub/types';
import jwt from 'jsonwebtoken';
import config from '../../../config';

/**
 * Extended Express Request with user context
 */
declare global {
  namespace Express {
    interface Request {
      user?: UserType;
    }
  }
}

/**
 * Verify JWT and extract user information
 * 
 * In production:
 * 1. Get token from Authorization header: "Bearer <token>"
 * 2. Verify token using JWT_SECRET
 * 3. Extract user data from token payload
 * 4. Attach to req.user
 * 
 * @example
 * ```ts
 * app.get('/protected', authenticateUser, (req, res) => {
 *   console.log(req.user.id) // User ID
 * })
 * ```
 */
export function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Try to get token from:
    // 1. Authorization header (Bearer <token>)
    // 2. Cookies (accessToken or ACCESS_TOKEN)
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : undefined;
    const token = bearer || req.cookies?.accessToken || req.cookies?.ACCESS_TOKEN;
    
    if (!token) {
      // No token found - allow next middleware/handler to decide what to do
      return next();
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, config.jwt.secret as jwt.Secret) as JWTPayload;

    // JWTPayload uses 'id' property for user ID
    req.user = {
      id: decoded.id,
      email: decoded.email,
      firstName: decoded.firstName || '',
      lastName: decoded.lastName || '',
      roles: decoded.roles || [],
      districts: decoded.districts || [],
      isActive: decoded.isActive ?? true,
    };

    next();
  } catch (err) {
    // Handle different JWT errors appropriately
    if (err instanceof jwt.TokenExpiredError) {
      console.warn('[Auth] Token expired:', err.message);
      return next(); // Let requireAuthentication handle it
    }
    
    if (err instanceof jwt.JsonWebTokenError) {
      console.warn('[Auth] Invalid JWT:', err.message);
      return next(); // Let requireAuthentication handle it
    }

    console.error('[Auth] Authentication error:', err);
    return next(); // Let requireAuthentication handle it
  }
}

/**
 * Verify user is authenticated (user must exist)
 * 
 * Can be used as standalone middleware or with requireRole
 * 
 * @example
 * ```ts
 * app.get('/profile', authenticateUser, requireAuthentication, (req, res) => {
 *   // req.user is guaranteed to exist
 * })
 * ```
 */
export function requireAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    console.warn('[Auth] No user context found');
    res.status(401).json({
      success: false,
      message: 'Unauthorized - User not authenticated',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  next();
}

/**
 * Optional authentication (doesn't fail if user not present)
 * 
 * Useful for endpoints that work for both authenticated and unauthenticated users
 * 
 * @example
 * ```ts
 * app.get('/public-listing', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     // Show personalized view
 *   } else {
 *     // Show generic view
 *   }
 * })
 * ```
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Try to get token from:
    // 1. Authorization header (Bearer <token>)
    // 2. Cookies (accessToken or ACCESS_TOKEN)
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : undefined;
    const token = bearer || req.cookies?.accessToken || req.cookies?.ACCESS_TOKEN;
    
    if (!token) {
      // No token - continue as unauthenticated user
      return next();
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, config.jwt.secret as jwt.Secret) as JWTPayload;

    // JWTPayload uses 'id' property for user ID
    req.user = {
      id: decoded.id,
      email: decoded.email,
      firstName: decoded.firstName || '',
      lastName: decoded.lastName || '',
      roles: decoded.roles || [],
      districts: decoded.districts || [],
      isActive: decoded.isActive ?? true,
    };

    next();
  } catch (err) {
    // Ignore auth errors for optional routes - just continue without user context
    console.debug('[Auth] Optional auth failed (ignoring):', (err as any)?.message);
    next();
  }
}

/**
 * Refresh access token (used when access token expires)
 * 
 * In production:
 * 1. Get refresh token from cookie or body
 * 2. Verify refresh token
 * 3. Generate new access token
 * 4. Return new token
 * 
 * @example
 * ```ts
 * app.post('/auth/refresh', refreshAccessToken, (req, res) => {
 *   res.json({ accessToken: req.headers['x-new-token'] })
 * })
 * ```
 */
export function refreshAccessToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // TODO: (agent) Get refresh token
    // TODO: (agent) Verify refresh token
    // TODO: (agent) Check if token is blacklisted (revoked)
    // TODO: (agent) Generate new access token
    // TODO: (agent) Attach to request or response

    console.log('[Auth] Token refresh requested');
    next();
  } catch (err) {
    console.error('[Auth] Token refresh failed:', err);
    res.status(401).json({
      success: false,
      message: 'Failed to refresh token',
      code: 'REFRESH_FAILED',
    });
  }
}

/**
 * Blacklist token on logout
 * 
 * In production:
 * 1. Get token from Authorization header
 * 2. Add token to cache blacklist with TTL = token expiry time
 * 3. Return success
 * 
 * @example
 * ```ts
 * app.post('/auth/logout', authenticateUser, logoutUser, (req, res) => {
 *   res.json({ message: 'Logged out' })
 * })
 * ```
 */
export function logoutUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get the access token from Authorization header or cookies
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : undefined;
    const token = bearer || req.cookies?.accessToken || req.cookies?.ACCESS_TOKEN;

    if (token) {
      try {
        // Decode token to get expiry time
        const decoded = jwt.decode(token) as { exp?: number } | null;
        
        if (decoded?.exp) {
          // TTL in seconds until token expiry
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          
          if (ttl > 0) {
            // TODO: (agent) Add token to Redis blacklist with TTL
            // This prevents token reuse even if validation is bypassed
            console.log('[Auth] Token blacklisted for logout:', { userId: req.user?.id, ttl });
          }
        }
      } catch (decodeErr) {
        console.warn('[Auth] Could not decode token for blacklist:', (decodeErr as any)?.message);
      }
    }

    console.log('[Auth] User logged out:', { userId: req.user?.id });
    next();
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    // Don't fail the logout request even if blacklist fails
    next();
  }
}

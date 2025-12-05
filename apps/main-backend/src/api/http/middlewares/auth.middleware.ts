/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and attaches user to request.
 * All protected routes should use this middleware.
 * 
 * @module api/http/middlewares/auth
 */

import type { Request, Response, NextFunction } from 'express';
import type { UserType } from '@fundifyhub/types';

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
    // TODO: (agent) Get token from Authorization header
    // const token = req.headers.authorization?.replace('Bearer ', '')
    // if (!token) throw new UnauthorizedError()

    // TODO: (agent) Verify token using jsonwebtoken.verify()
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!)

    // TODO: (agent) Extract user from decoded payload
    // req.user = {
    //   id: decoded.userId,
    //   email: decoded.email,
    //   roles: decoded.roles,
    //   ...
    // }

    // Stub: user stays undefined - will be handled by requireAuthentication

    console.log('[Auth] User authentication attempted (stub)');
    next();
  } catch (err) {
    // TODO: (agent) Handle token errors (expired, invalid, malformed)
    // if (err.name === 'TokenExpiredError') throw new TokenExpiredError()
    // if (err.name === 'JsonWebTokenError') throw new InvalidTokenError()

    console.error('[Auth] Authentication failed:', err);
    res.status(401).json({
      success: false,
      message: 'Unauthorized - Invalid or missing token',
      code: 'UNAUTHORIZED',
    });
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
    // TODO: (agent) Same as authenticateUser but don't fail if token missing
    console.log('[Auth] Optional auth - user:', req.user?.id || 'anonymous');
    next();
  } catch (err) {
    // Ignore auth errors for optional routes
    console.debug('[Auth] Optional auth failed (ignoring):', err);
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
    // TODO: (agent) Get token from Authorization header
    // TODO: (agent) Extract expiry time from token
    // TODO: (agent) Call cacheAdapter.blacklistToken(token, ttl)

    console.log('[Auth] User logged out:', { userId: req.user?.id });
    next();
  } catch (err) {
    console.error('[Auth] Logout failed:', err);
    // Don't fail the logout request even if blacklist fails
    next();
  }
}

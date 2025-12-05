/**
 * Auth Controllers
 * 
 * Thin request handlers for auth endpoints.
 * Controllers validate input, call domain services, format responses.
 * 
 * Pattern:
 * - Validate request body/params using zod schemas
 * - Call domain service
 * - Format response
 * - Don't contain business logic
 * 
 * @module api/http/controllers/auth
 */

import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares';

/**
 * POST /auth/register
 * Register new user
 * 
 * TODO: (agent) Implement handler
 */
export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  // TODO: (agent) Validate input using registerSchema.parse()
  // const data = registerSchema.parse(req.body)

  // TODO: (agent) Call authService.register(data)
  // const user = await authService.register(data)

  // TODO: (agent) Return user + tokens
  res.status(501).json({
    success: false,
    message: 'Not implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

/**
 * POST /auth/login
 * User login
 * 
 * TODO: (agent) Implement handler
 */
export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  // TODO: (agent) Validate input: email, password
  // const { email, password } = req.body

  // TODO: (agent) Call authService.login(email, password)
  // const result = await authService.login(email, password)

  // TODO: (agent) Return user + tokens
  res.status(501).json({
    success: false,
    message: 'Not implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

/**
 * POST /auth/refresh
 * Refresh access token
 * 
 * TODO: (agent) Implement handler
 */
export const refreshTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  // TODO: (agent) Get refresh token from cookie or body
  // const refreshToken = req.cookies.refreshToken || req.body.refreshToken

  // TODO: (agent) Call authService.refreshAccessToken(refreshToken)
  // const tokens = await authService.refreshAccessToken(refreshToken)

  // TODO: (agent) Return new access token
  res.status(501).json({
    success: false,
    message: 'Not implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

/**
 * POST /auth/logout
 * Logout user
 * 
 * TODO: (agent) Implement handler
 */
export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  // TODO: (agent) Get token from Authorization header
  // TODO: (agent) Call authService.logout(req.user.id, token)
  // TODO: (agent) Return success

  res.status(501).json({
    success: false,
    message: 'Not implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

/**
 * POST /auth/request-password-reset
 * Request password reset
 * 
 * TODO: (agent) Implement handler
 */
export const requestPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
  // TODO: (agent) Validate input: email
  // const { email } = req.body

  // TODO: (agent) Call authService.requestPasswordReset(email)
  // TODO: (agent) Return success message (don't reveal if email exists)

  res.status(501).json({
    success: false,
    message: 'Not implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

/**
 * POST /auth/confirm-password-reset
 * Confirm password reset with OTP
 * 
 * TODO: (agent) Implement handler
 */
export const confirmPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
  // TODO: (agent) Validate input: email, otp, newPassword
  // const { email, otp, newPassword } = req.body

  // TODO: (agent) Call authService.confirmPasswordReset(email, otp, newPassword)
  // TODO: (agent) Return success message

  res.status(501).json({
    success: false,
    message: 'Not implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

/**
 * POST /auth/verify-email
 * Verify email with token
 * 
 * TODO: (agent) Implement handler
 */
export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  // TODO: (agent) Validate input: email, token
  // const { email, token } = req.body

  // TODO: (agent) Call authService.verifyEmail(email, token)
  // TODO: (agent) Return success message

  res.status(501).json({
    success: false,
    message: 'Not implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

/**
 * GET /auth/me
 * Get current authenticated user
 * 
 * TODO: (agent) Implement handler
 */
export const getCurrentUserHandler = asyncHandler(async (req: Request, res: Response) => {
  // TODO: (agent) Return req.user (already set by authenticateUser middleware)
  res.status(501).json({
    success: false,
    message: 'Not implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

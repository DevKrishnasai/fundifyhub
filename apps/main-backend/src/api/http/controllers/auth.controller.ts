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
import { authService } from '../../../domain/auth';
import { z } from 'zod';
import logger from '../../../utils/logger';

/**
 * POST /auth/register
 * Register new user
 * 
 * TODO: (agent) Implement handler
 */
const registerSchema = z.object({
  email: z.string().email(),
  phoneNumber: z.string().min(10),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['CUSTOMER', 'AGENT', 'DISTRICT_ADMIN', 'STATE_ADMIN', 'SUPER_ADMIN']),
  districtIds: z.array(z.string()).optional(),
});

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const result = await authService.register(data);

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data: result,
  });
});

/**
 * POST /auth/login
 * User login
 * 
 * TODO: (agent) Implement handler
 */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  const result = await authService.login({ email, password });

  // Set refresh token in httpOnly cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

/**
 * POST /auth/refresh
 * Refresh access token
 * 
 * TODO: (agent) Implement handler
 */
export const refreshTokenHandler = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      message: 'Refresh token required',
    });
    return;
  }

  const result = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: { accessToken: result.accessToken },
  });
});

/**
 * POST /auth/logout
 * Logout user
 * 
 * TODO: (agent) Implement handler
 */
export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * POST /auth/request-password-reset
 * Request password reset
 * 
 * TODO: (agent) Implement handler
 */
const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const requestPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email } = passwordResetRequestSchema.parse(req.body);

  await authService.requestPasswordReset({ email });

  res.status(200).json({
    success: true,
    message: 'If the email exists, a password reset link has been sent.',
  });
});

/**
 * POST /auth/confirm-password-reset
 * Confirm password reset with OTP
 * 
 * TODO: (agent) Implement handler
 */
const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export const confirmPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = passwordResetConfirmSchema.parse(req.body);

  await authService.confirmPasswordReset(data);

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now login with your new password.',
  });
});

/**
 * POST /auth/verify-email
 * Verify email with token
 * 
 * TODO: (agent) Implement handler
 */
const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const { token } = verifyEmailSchema.parse(req.body);

  const result = await authService.verifyEmail(token);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
    data: result,
  });
});

/**
 * GET /auth/me
 * Get current authenticated user
 * 
 * TODO: (agent) Implement handler
 */
export const getCurrentUserHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

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
import { 
  backendRegisterSchema, 
  loginSchema, 
  forgotPasswordSchema,
  backendResetPasswordSchema,
  verifyEmailSchema,
  sendOtpSchema,
  verifyOtpSchema,
  COOKIE_NAMES, 
  API_MESSAGES 
} from '@fundifyhub/types';

/**
 * POST /auth/register
 * Register new user
 * 
 * TODO: (agent) Implement handler
 */
export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = backendRegisterSchema.parse(req.body);

  // TODO: (agent) Fix register method signature - currently doesn't accept second param
  // const result = await authService.register(data, {
  //   ipAddress: req.ip,
  //   userAgent: req.headers['user-agent'],
  // });
  const result = await authService.register(data);

  // TODO: (agent) Register doesn't return tokens - implement token generation
  // res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: 'strict',
  //   maxAge: 7 * 24 * 60 * 60 * 1000,
  // });

  // res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: 'strict',
  //   maxAge: 60 * 60 * 1000,
  // });

  res.status(201).json({
    success: true,
    message: API_MESSAGES.SUCCESS.REGISTER,
    data: result,
  });
});

/**
 * POST /auth/login
 * User login
 * 
 * TODO: (agent) Implement handler
 */
export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);

  // TODO: (agent) Fix login method signature - currently doesn't accept second param
  // const result = await authService.login({ email, password }, {
  //   ipAddress: req.ip,
  //   userAgent: req.headers['user-agent'],
  // });
  const result = await authService.login({ email, password });

  // Set refresh token in httpOnly cookie
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Changed from 'strict' to allow cross-origin cookies
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Changed from 'strict' to allow cross-origin cookies
    maxAge: 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: API_MESSAGES.SUCCESS.LOGIN,
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
  const refreshToken = req.cookies[COOKIE_NAMES.REFRESH_TOKEN] || req.body.refreshToken;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      message: API_MESSAGES.ERROR.REFRESH_TOKEN_REQUIRED,
    });
    return;
  }

  const result = await authService.refreshAccessToken(refreshToken);

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000,
  });

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
  const refreshToken = req.cookies[COOKIE_NAMES.REFRESH_TOKEN] || req.body.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  // Clear refresh token cookie
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN);
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN);

  res.status(200).json({
    success: true,
    message: API_MESSAGES.SUCCESS.LOGOUT,
  });
});

/**
 * POST /auth/request-password-reset
 * Request password reset
 * 
 * TODO: (agent) Implement handler
 */
export const requestPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const result = await authService.requestPasswordReset({ email });

  res.status(200).json({
    success: true,
    message: API_MESSAGES.SUCCESS.PASSWORD_RESET_EMAIL,
    data: result,
  });
});

/**
 * POST /auth/confirm-password-reset
 * Confirm password reset with OTP
 * 
 * TODO: (agent) Implement handler
 */
export const confirmPasswordResetHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = backendResetPasswordSchema.parse(req.body);

  await authService.confirmPasswordReset(data);

  res.status(200).json({
    success: true,
    message: API_MESSAGES.SUCCESS.PASSWORD_RESET_SUCCESS,
  });
});

/**
 * POST /auth/verify-email
 * Verify email with token
 * 
 * TODO: (agent) Implement handler
 */
export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const { token } = verifyEmailSchema.parse(req.body);

  const result = await authService.verifyEmail(token);

  res.status(200).json({
    success: true,
    message: API_MESSAGES.SUCCESS.EMAIL_VERIFIED,
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
      message: API_MESSAGES.ERROR.UNAUTHORIZED,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

export const sendOtpHandler = asyncHandler(async (req: Request, res: Response) => {
  const payload = sendOtpSchema.parse(req.body);
  const result = await authService.sendOtp(payload);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully',
    data: result,
  });
});

export const verifyOtpHandler = asyncHandler(async (req: Request, res: Response) => {
  const payload = verifyOtpSchema.parse(req.body);
  const result = await authService.verifyOtp(payload);

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    data: result,
  });
});

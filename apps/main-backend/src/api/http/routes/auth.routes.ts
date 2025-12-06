/**
 * Authentication Routes
 * 
 * POST /auth/register - User registration
 * POST /auth/login - User login
 * POST /auth/refresh - Refresh access token
 * POST /auth/logout - Logout user
 * POST /auth/request-password-reset - Request password reset
 * POST /auth/confirm-password-reset - Confirm password reset
 * POST /auth/verify-email - Verify email
 * 
 * @module api/http/routes/auth
 */

import { Router } from 'express';
import {
  authenticateUser,
  requireAuthentication,
  optionalAuth,
  logoutUser,
  asyncHandler,
} from '../middlewares';
import {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
  requestPasswordResetHandler,
  confirmPasswordResetHandler,
  verifyEmailHandler,
  getCurrentUserHandler,
  sendOtpHandler,
  verifyOtpHandler,
} from '../controllers/auth.controller';

const router: Router = Router();

/**
 * POST /auth/register
 * Register new user
 * 
 */
router.post('/register', registerHandler);

/**
 * POST /auth/login
 * User login
 * 
 */
router.post('/login', loginHandler);

/**
 * POST /auth/refresh
 * Refresh access token
 * 
 */
router.post('/refresh', refreshTokenHandler);

/**
 * POST /auth/logout
 * Logout user
 * 
 */
router.post('/logout', logoutHandler);

/**
 * POST /auth/forgot-password
 * Request password reset (alias for request-password-reset)
 * 
 */
router.post('/forgot-password', requestPasswordResetHandler);
router.post('/request-password-reset', requestPasswordResetHandler);

/**
 * POST /auth/reset-password
 * Confirm password reset with OTP (alias for confirm-password-reset)
 * 
 */
router.post('/reset-password', confirmPasswordResetHandler);
router.post('/confirm-password-reset', confirmPasswordResetHandler);

/**
 * POST /auth/verify-email
 * Verify email with token
 * 
 */
router.post('/verify-email', verifyEmailHandler);

/**
 * GET /auth/me
 * Get current authenticated user
 * 
 */
router.get('/me', getCurrentUserHandler);

/**
 * GET /auth/validate or /user/validate
 * Validate user session
 * 
 */
router.get('/validate', getCurrentUserHandler);

/**
 * POST /auth/send-otp
 * Send OTP for verification
 * 
 */
router.post('/send-otp', sendOtpHandler);

/**
 * POST /auth/verify-otp
 * Verify OTP code
 * 
 */
router.post('/verify-otp', verifyOtpHandler);

export default router;

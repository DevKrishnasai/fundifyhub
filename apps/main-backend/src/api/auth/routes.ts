import { Router, type Router as ExpressRouter } from 'express';
import {
  checkAvailabilityController,
  sendOTPController,
  verifyOTPController,
  registerController,
  loginController,
  logoutController,
} from './controllers';

/**
 * Authentication Routes
 *
 * Defines all authentication-related API endpoints:
 * - POST /check-availability - Check if email/phone is available
 * - POST /send-otp - Send OTP for email or phone verification
 * - POST /verify-otp - Verify OTP code
 * - POST /register - Complete user registration
 * - POST /login - User login
 * - POST /logout - User logout
 *
 * All routes are prefixed with /api/v1/auth in the main router.
 */
const router: ExpressRouter = Router();

// Check if email/phone is available for registration
router.post('/check-availability', checkAvailabilityController);

// Send OTP to email or phone for verification
router.post('/send-otp', sendOTPController);

// Verify OTP code against stored session
router.post('/verify-otp', verifyOTPController);

// Complete user registration (requires both email and phone OTP verification)
router.post('/register', registerController);

// Authenticate user and issue access token
router.post('/login', loginController);

// Logout user and clear access token
router.post('/logout', logoutController);

export default router;

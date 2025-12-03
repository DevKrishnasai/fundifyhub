import { Router, type Router as ExpressRouter } from 'express';
import {
  checkAvailability,
  sendOTP,
  verifyOTP,
  register,
  login,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  validateResetToken,
} from './controllers';
import { authMiddleware } from '../../utils/jwt';

const router: ExpressRouter = Router();

// Check if email/phone is available for registration
router.post('/check-availability', checkAvailability);

// Send OTP to email or phone for verification
router.post('/send-otp', sendOTP);

// Verify OTP code against stored session
router.post('/verify-otp', verifyOTP);

// Complete user registration (requires both email and phone OTP verification)
router.post('/register', register);

// Authenticate user and issue access token
router.post('/login', login);

// Logout user and clear access token
router.post('/logout', logout);

// Change password (requires authentication)
router.post('/change-password', authMiddleware, changePassword);

// Request password reset (forgot password - sends email with reset link)
router.post('/forgot-password', forgotPassword);

// Reset password with token
router.post('/reset-password', resetPassword);

// Validate reset token (check if token is valid before showing form)
router.get('/validate-reset-token', validateResetToken);

export default router;

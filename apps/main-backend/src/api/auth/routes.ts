import { Router, type Router as ExpressRouter } from 'express';
import {
  checkAvailability,
  sendOTP,
  verifyOTP,
  register,
  login,
  logout,
} from './controllers';

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

export default router;

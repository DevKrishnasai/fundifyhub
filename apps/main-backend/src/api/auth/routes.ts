import { Router, type Router as ExpressRouter } from 'express';
import {
  checkAvailabilityController,
  sendOTPController,
  verifyOTPController,
  registerController,
  loginController,
  logoutController,
} from './controllers';

const router: ExpressRouter = Router();

// Check if email/phone is available
router.post('/check-availability', checkAvailabilityController);

// Send OTP to email or phone
router.post('/send-otp', sendOTPController);

// Verify OTP code
router.post('/verify-otp', verifyOTPController);

// Complete user registration
router.post('/register', registerController);

// Login user
router.post('/login', loginController);

// Logout user
router.post('/logout', logoutController);

export default router;

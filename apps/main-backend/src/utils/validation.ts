import { z } from 'zod';

// Phone number validation (Indian format)
export const phoneSchema = z.string().regex(
  /^\+91[6-9]\d{9}$/,
  'Invalid phone number. Use format: +91XXXXXXXXXX'
);

// Email validation
export const emailSchema = z.string().email('Invalid email format');

// Password validation
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// OTP validation
export const otpSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits');

// User ID validation
export const userIdSchema = z.string().min(1, 'User ID is required');

// Name validation
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name is too long');

/**
 * Validate required fields
 */
export const validateRequired = (fields: Record<string, any>): string[] => {
  return Object.entries(fields)
    .filter(([_, value]) => !value || (typeof value === 'string' && value.trim() === ''))
    .map(([key]) => key);
};

/**
 * Validate phone number
 */
export const validatePhone = (phone: string): boolean => {
  return phoneSchema.safeParse(phone).success;
};

/**
 * Validate email
 */
export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

/**
 * Validate password
 */
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const result = passwordSchema.safeParse(password);
  return {
    isValid: result.success,
    errors: result.success ? [] : result.error.errors.map(err => err.message)
  };
};

/**
 * Validate OTP
 */
export const validateOTP = (otp: string): boolean => {
  return otpSchema.safeParse(otp).success;
};
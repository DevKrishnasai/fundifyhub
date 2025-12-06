/**
 * API Constants
 * @module api/api.constants
 */

export const COOKIE_NAMES = {
  REFRESH_TOKEN: 'refreshToken',
  ACCESS_TOKEN: 'accessToken',
} as const;

export const HEADER_NAMES = {
  AUTHORIZATION: 'Authorization',
  X_REQUEST_ID: 'X-Request-ID',
} as const;

export const API_MESSAGES = {
  SUCCESS: {
    REGISTER: 'Registration successful. Please check your email to verify your account.',
    LOGIN: 'Login successful',
    LOGOUT: 'Logout successful',
    PASSWORD_RESET_EMAIL: 'Password reset email sent',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    EMAIL_VERIFIED: 'Email verified successfully',
    OTP_SENT: 'OTP sent successfully',
    OTP_VERIFIED: 'OTP verified successfully',
  },
  ERROR: {
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Forbidden access',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    REFRESH_TOKEN_REQUIRED: 'Refresh token required',
    INVALID_TOKEN: 'Invalid or expired token',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_NOT_VERIFIED: 'Email not verified. Please verify your email first.',
    ACCOUNT_INACTIVE: 'Your account is inactive. Please contact support.',
    EMAIL_EXISTS: 'Email already registered',
    WEAK_PASSWORD: 'Password must be at least 8 characters',
    INVALID_OTP: 'Invalid or expired OTP',
    OTP_MAX_ATTEMPTS: 'Maximum OTP verification attempts exceeded',
  },
} as const;


// ============================================
// RATE LIMITING
// ============================================

export const RATE_LIMIT_CONFIG = {
  // General API rate limits
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute
  },

  // Authentication endpoints (stricter)
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500, // 500 attempts per 15 minutes (increased for development)
  },

  // OTP/verification endpoints (very strict)
  OTP: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 requests per minute
  },

  // File upload endpoints
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
  },

  // Payment endpoints
  PAYMENT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 payment requests per minute
  },

  // Admin endpoints (more lenient)
  ADMIN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 2000, // 200 requests per minute
  },
};

export const RATE_LIMIT_PREFIX = 'rate-limit:';

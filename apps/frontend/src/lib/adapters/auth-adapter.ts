/**
 * Auth Adapter
 *
 * Abstraction layer for authentication API calls.
 *
 * @module lib/adapters/auth
 */

import { postWithResult, getWithResult } from '../api-client';
import { BACKEND_API_CONFIG } from '../urls';
import type { UserType } from '@fundifyhub/types';

/**
 * Registration payload
 */
export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: string;
}

/**
 * Login payload
 */
export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * OTP verification payload
 */
export interface VerifyOtpPayload {
  identifier: string; // email or phone
  otp: string;
  type: 'email' | 'phone';
}

/**
 * Password change payload
 */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/**
 * Password reset request payload
 */
export interface ForgotPasswordPayload {
  email: string;
}

/**
 * Password reset confirmation payload
 */
export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/**
 * Check availability payload
 */
export interface CheckAvailabilityPayload {
  email?: string;
  phoneNumber?: string;
}

/**
 * Auth response with user
 */
export interface AuthResponse {
  user: UserType;
  token?: string;
}

export const authAdapter = {
  /**
   * Register a new user
   */
  async register(payload: RegisterPayload) {
    return postWithResult<AuthResponse, RegisterPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.REGISTER,
      payload
    );
  },

  /**
   * Login with email and password
   */
  async login(payload: LoginPayload) {
    return postWithResult<AuthResponse, LoginPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      payload
    );
  },

  /**
   * Logout current user
   */
  async logout() {
    return postWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.LOGOUT
    );
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    return getWithResult<UserType>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.VALIDATE
    );
  },

  /**
   * Check if email or phone is available
   */
  async checkAvailability(payload: CheckAvailabilityPayload) {
    return postWithResult<{ available: boolean }, CheckAvailabilityPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.CHECK_AVAILABILITY,
      payload
    );
  },

  /**
   * Send OTP to email or phone
   */
  async sendOtp(payload: { identifier: string; type: 'email' | 'phone' }) {
    return postWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.SEND_OTP,
      payload
    );
  },

  /**
   * Verify OTP
   */
  async verifyOtp(payload: VerifyOtpPayload) {
    return postWithResult<{ success: boolean; verified: boolean }, VerifyOtpPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP,
      payload
    );
  },

  /**
   * Resend OTP
   */
  async resendOtp(payload: { identifier: string; type: 'email' | 'phone' }) {
    return postWithResult<{ success: boolean }>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.RESEND_OTP,
      payload
    );
  },

  /**
   * Change password for authenticated user
   */
  async changePassword(payload: ChangePasswordPayload) {
    return postWithResult<{ success: boolean }, ChangePasswordPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD,
      payload
    );
  },

  /**
   * Request password reset (forgot password)
   */
  async forgotPassword(payload: ForgotPasswordPayload) {
    return postWithResult<{ success: boolean }, ForgotPasswordPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
      payload
    );
  },

  /**
   * Reset password with token
   */
  async resetPassword(payload: ResetPasswordPayload) {
    return postWithResult<{ success: boolean }, ResetPasswordPayload>(
      BACKEND_API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
      payload
    );
  },
};

/**
 * Authentication Adapter
 * 
 * Handles all authentication-related API calls:
 * - Login/Register
 * - Password reset
 * - OTP verification
 * - Session validation
 * 
 * @module lib/adapters/auth
 */

import { post, get, patchWithResult, type ApiResult } from '@/lib/api-client';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import type { UserType } from '@fundifyhub/types';

const { ENDPOINTS } = BACKEND_API_CONFIG;

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

export interface LoginResponse {
  user: UserType;
  token: string;
  refreshToken?: string;
}

export interface RegisterResponse {
  user: UserType;
  token: string;
  refreshToken?: string;
}

export interface CheckAvailabilityPayload {
  email?: string;
  phone?: string;
}

export interface CheckAvailabilityResponse {
  available: boolean;
  field: string;
}

export interface SendOtpPayload {
  email?: string;
  phone?: string;
  purpose?: 'verification' | 'password-reset';
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  expiresIn?: number;
}

export interface VerifyOtpPayload {
  email?: string;
  phone?: string;
  otp: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
  token?: string;
}

export interface ResendOtpPayload {
  email?: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface ValidateResponse {
  user: UserType;
  isValid: boolean;
}

export const authAdapter = {
  /**
   * Register new user
   */
  async register(payload: RegisterPayload): Promise<ApiResult<RegisterResponse>> {
    try {
      const response = await post<RegisterResponse>(ENDPOINTS.AUTH.REGISTER, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Registration failed',
          fieldErrors: error?.response?.data?.errors,
        },
      };
    }
  },

  /**
   * Login with email and password
   */
  async login(payload: LoginPayload): Promise<ApiResult<LoginResponse>> {
    try {
      const response = await post<LoginResponse>(ENDPOINTS.AUTH.LOGIN, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Login failed',
        },
      };
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResult<{ success: boolean }>> {
    try {
      const response = await post<{ success: boolean }>(ENDPOINTS.AUTH.LOGOUT);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Logout failed',
        },
      };
    }
  },

  /**
   * Check email/phone availability
   */
  async checkAvailability(payload: CheckAvailabilityPayload): Promise<ApiResult<CheckAvailabilityResponse>> {
    try {
      const params = new URLSearchParams();
      if (payload.email) params.append('email', payload.email);
      if (payload.phone) params.append('phone', payload.phone);

      const response = await get<CheckAvailabilityResponse>(
        `${ENDPOINTS.AUTH.CHECK_AVAILABILITY}?${params.toString()}`
      );
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Availability check failed',
        },
      };
    }
  },

  /**
   * Send OTP for verification or password reset
   */
  async sendOtp(payload: SendOtpPayload): Promise<ApiResult<SendOtpResponse>> {
    try {
      const response = await post<SendOtpResponse>(ENDPOINTS.AUTH.SEND_OTP, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to send OTP',
        },
      };
    }
  },

  /**
   * Verify OTP
   */
  async verifyOtp(payload: VerifyOtpPayload): Promise<ApiResult<VerifyOtpResponse>> {
    try {
      const response = await post<VerifyOtpResponse>(ENDPOINTS.AUTH.VERIFY_OTP, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'OTP verification failed',
        },
      };
    }
  },

  /**
   * Resend OTP
   */
  async resendOtp(payload: ResendOtpPayload): Promise<ApiResult<SendOtpResponse>> {
    try {
      const response = await post<SendOtpResponse>(ENDPOINTS.AUTH.RESEND_OTP, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Failed to resend OTP',
        },
      };
    }
  },

  /**
   * Validate current session
   */
  async validate(): Promise<ApiResult<ValidateResponse>> {
    try {
      const response = await get<ValidateResponse>(ENDPOINTS.AUTH.VALIDATE);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Session validation failed',
        },
      };
    }
  },

  /**
   * Change password
   */
  async changePassword(payload: ChangePasswordPayload): Promise<ApiResult<{ success: boolean }>> {
    try {
      const response = await post<{ success: boolean }>(ENDPOINTS.AUTH.CHANGE_PASSWORD, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Password change failed',
        },
      };
    }
  },

  /**
   * Initiate forgot password flow
   */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<ApiResult<{ success: boolean }>> {
    try {
      const response = await post<{ success: boolean }>(ENDPOINTS.AUTH.FORGOT_PASSWORD, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Password reset request failed',
        },
      };
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<ApiResult<{ success: boolean }>> {
    try {
      const response = await post<{ success: boolean }>(ENDPOINTS.AUTH.RESET_PASSWORD, payload);
      return { ok: true, data: response };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          message: error?.response?.data?.message || 'Password reset failed',
        },
      };
    }
  },
};

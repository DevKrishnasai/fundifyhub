import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { BACKEND_API_CONFIG } from "./urls";
import { post } from './api-client';

/**
 * Logout user (clears httpOnly cookies via API call)
 */
export async function logout(): Promise<void> {
    await post(BACKEND_API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL,
  ENDPOINTS: {
    AUTH: {
      REGISTER: '/api/v1/auth/register',
      LOGIN: '/api/v1/auth/login',
      LOGOUT: '/api/v1/auth/logout',
      VERIFY_OTP: '/api/v1/auth/verify-otp',
      RESEND_OTP: '/api/v1/auth/resend-otp',
    },
    ADMIN: {
      GET_ACTIVE_LOANS: '/api/v1/admin/get-active-loans',
      GET_PENDING_REQUESTS: '/api/v1/admin/get-pending-requests',
      SERVICES: '/api/v1/admin/service',
      USERS: '/api/v1/admin/users',
      USER_BY_ID: (id: string) => `/api/v1/admin/users/${id}`,
      SERVICE_ENABLE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/enable`,
      SERVICE_DISABLE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/disable`,
      SERVICE_DISCONNECT: (serviceName: string) => `/api/v1/admin/service/${serviceName}/disconnect`,
      SERVICE_CONFIGURE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/configure`,
    },
    USER: {
      PROFILE: '/api/v1/user/profile',
      UPDATE_PROFILE: '/api/v1/user/profile/update',
      UPLOAD_ASSET: '/api/v1/user/add-asset',
      UPDATE_ASSET: '/api/v1/user/update-asset',
      ACTIVE_LOANS_COUNT: '/api/v1/user/active-loans-count',
      PENDING_LOANS_COUNT: '/api/v1/user/pending-loans-count',
      TOTAL_BORROW: '/api/v1/user/total-borrow',

    },
  }
}

export const apiUrl = (path: string) => {
  const url = `${API_CONFIG.BASE_URL}${path}`
  console.log('API URL:', url) // Debug log
  return url
}


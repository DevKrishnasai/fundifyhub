import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
      SERVICES: '/api/v1/admin/service',
      USERS: '/api/v1/admin/users',
      USER_BY_ID: (id: string) => `/api/v1/admin/users/${id}`,
      SERVICE_ENABLE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/enable`,
      SERVICE_DISABLE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/disable`,
      SERVICE_DISCONNECT: (serviceName: string) => `/api/v1/admin/service/${serviceName}/disconnect`,
      SERVICE_CONFIGURE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/configure`,
    }
  }
}

export const apiUrl = (path: string) => {
  const url = `${API_CONFIG.BASE_URL}${path}`
  console.log('API URL:', url) // Debug log
  return url
}

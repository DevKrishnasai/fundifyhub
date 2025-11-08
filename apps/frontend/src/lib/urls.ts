/**
 * Centralized API endpoint definitions
 */
export const BACKEND_API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL,
  ENDPOINTS: {
    AUTH: {
      REGISTER: '/api/v1/auth/register',
      LOGIN: '/api/v1/auth/login',
      LOGOUT: '/api/v1/auth/logout',
      CHECK_AVAILABILITY: '/api/v1/auth/check-availability',
      SEND_OTP: '/api/v1/auth/send-otp',
      VERIFY_OTP: '/api/v1/auth/verify-otp',
      RESEND_OTP: '/api/v1/auth/resend-otp',
      VALIDATE: '/api/v1/user/validate',
    },
    ADMIN: {
      SERVICES: '/api/v1/admin/service',
      USERS: '/api/v1/admin/users',
      USER_BY_ID: (id: string) => `/api/v1/admin/users/${id}`,
      SERVICE_ENABLE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/enable`,
      SERVICE_DISABLE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/disable`,
      SERVICE_DISCONNECT: (serviceName: string) => `/api/v1/admin/service/${serviceName}/disconnect`,
      SERVICE_CONFIGURE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/configure`,
      GET_ACTIVE_LOANS: '/api/v1/admin/active-loans-count',
      GET_PENDING_REQUESTS: '/api/v1/admin/pending-loans-count',
    },
    USER: {
      PROFILE: '/api/v1/user/profile',
      UPDATE_PROFILE: '/api/v1/user/profile/update',
      UPLOAD_ASSET: '/api/v1/user/add-asset',
      UPDATE_ASSET: '/api/v1/user/update-asset',
      ACTIVE_LOANS_COUNT: '/api/v1/user/active-loans-count',
      PENDING_LOANS_COUNT: '/api/v1/user/pending-loans-count',
      TOTAL_BORROW: '/api/v1/user/total-borrow'
    },
    DOCUMENTS: {
      CREATE: '/api/v1/documents',
      CREATE_BULK: '/api/v1/documents/bulk',
      LIST: '/api/v1/documents',
      GET_BY_ID: (id: string) => `/api/v1/documents/${id}`,
      GET_SIGNED_URL: (id: string) => `/api/v1/documents/${id}/url`,
      GET_SIGNED_URL_BY_FILEKEY: (fileKey: string) => `/api/v1/documents/signed-url-by-filekey/${fileKey}`,
      GET_BULK_SIGNED_URLS: '/api/v1/documents/signed-urls',
      DELETE: (id: string) => `/api/v1/documents/${id}`,
      VERIFY: (id: string) => `/api/v1/documents/${id}/verify`,
    },
  }
}

export const FRONTEND_API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_FRONTEND_API_URL,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register'
    },
    CUSTOMER: {
      DASHBOARD: '/dashboard',
    },
    DISTRICT_ADMIN: {
      DASHBOARD: '/admin/dashboard',
    },
    AGENT: {
      DASHBOARD: '/agent/dashboard',
    }
  }
}

/* 
 * Public endpoints for frontend that don't require authentication
 */
export const FrontendPublicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/forgot-password',
];
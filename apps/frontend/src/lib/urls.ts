/**
 * Centralized API endpoint definitions
 */
import frontendConfig from './config';

export const BACKEND_API_CONFIG = {
  BASE_URL: frontendConfig.public.apiUrl,
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
  GET_ACTIVE_LOANS: '/api/v1/admin/get-active-loans',
  GET_PENDING_REQUESTS: '/api/v1/admin/get-pending-requests',
      REQUESTS_LIST: '/api/v1/admin/requests',
    },
    USER: {
      PROFILE: '/api/v1/user/profile',
      UPDATE_PROFILE: '/api/v1/user/profile/update',
      UPLOAD_ASSET: '/api/v1/user/add-asset',
      UPDATE_ASSET: '/api/v1/user/update-asset',
      LIST_REQUESTS: '/api/v1/user/requests',
  GET_REQUEST_BY_IDENTIFIER: (identifier: string) => `/api/v1/user/request/${identifier}`,
      POST_COMMENT: (identifier: string) => `/api/v1/user/request/${identifier}/comment`,
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
      SIGNED_URL: (fileKey: string) => `/api/v1/documents/${fileKey}/signed-url`,
    },
    REQUESTS: {
      GET_BY_ID: (id: string) => `/api/v1/requests/${id}`,
      GET_AGENTS_BY_DISTRICT: (district: string) => `/api/v1/requests/agents/${district}`,
      ASSIGN_AGENT: (id: string) => `/api/v1/requests/${id}/assign`,
      CREATE_OFFER: (id: string) => `/api/v1/requests/${id}/offer`,
      UPDATE_STATUS: (id: string) => `/api/v1/requests/${id}/status`,
      UPDATE_BANK_DETAILS: (id: string) => `/api/v1/requests/${id}/bank-details`,
      GENERATE_AGREEMENT: (id: string) => `/api/v1/requests/${id}/generate-agreement`,
      UPLOAD_SIGNED_AGREEMENT: (id: string) => `/api/v1/requests/${id}/upload-signed-agreement`,
      OFFER_PREVIEW: (id: string, amount: number, tenureMonths: number, interestRate: number) => `/api/v1/requests/${id}/offer-preview?amount=${amount}&tenureMonths=${tenureMonths}&interestRate=${interestRate}`,
      ADD_COMMENT: (id: string) => `/api/v1/user/request/${id}/comment`,
      CONFIRM_OFFER: (id: string) => `/api/v1/requests/${id}/offers/admin-offer/confirm`,
    },
    PAYMENTS: {
      RAZORPAY_CREATE_ORDER: '/api/v1/payments/razorpay/create-order',
    },
  }
}

export const FRONTEND_API_CONFIG = {
  BASE_URL: frontendConfig.public.apiUrl,
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
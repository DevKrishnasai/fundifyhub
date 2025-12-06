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
      VALIDATE: '/api/v1/auth/validate',
      CHANGE_PASSWORD: '/api/v1/auth/change-password',
      FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
      RESET_PASSWORD: '/api/v1/auth/reset-password',
    },
    ADMIN: {
      SERVICES: '/api/v1/admin/service',
      USERS: '/api/v1/admin/users',
      USER_BY_ID: (id: string) => `/api/v1/admin/users/${id}`,
      SERVICE_ENABLE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/enable`,
      SERVICE_DISABLE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/disable`,
      SERVICE_DISCONNECT: (serviceName: string) => `/api/v1/admin/service/${serviceName}/disconnect`,
      SERVICE_CONFIGURE: (serviceName: string) => `/api/v1/admin/service/${serviceName}/configure`,
      SERVICE_TEST: (serviceName: string) => `/api/v1/admin/service/${serviceName}/test`,
      GET_ACTIVE_LOANS: '/api/v1/admin/get-active-loans',
      GET_PENDING_REQUESTS: '/api/v1/admin/get-pending-requests',
      REQUESTS_LIST: '/api/v1/admin/requests',
      // Analytics endpoints
      ANALYTICS_SUMMARY: '/api/v1/admin/analytics/summary',
      ANALYTICS_TRENDS: '/api/v1/admin/analytics/trends',
      ANALYTICS_DISTRICT_BREAKDOWN: '/api/v1/admin/analytics/district-breakdown',
      ANALYTICS_REQUEST_STATUS: '/api/v1/admin/analytics/request-status',
      // Audit logs endpoints
      AUDIT_LOGS: '/api/v1/admin/audit-logs',
      AUDIT_LOGS_STATS: '/api/v1/admin/audit-logs/stats',
      AUDIT_LOG_BY_ID: (id: string) => `/api/v1/admin/audit-logs/${id}`,
      AUDIT_LOGS_ENTITY: (entityType: string, entityId: string) => `/api/v1/admin/audit-logs/entity/${entityType}/${entityId}`,
    },
    USER: {
      PROFILE: '/api/v1/user/profile',
      UPDATE_PROFILE: '/api/v1/user/profile',
      UPLOAD_ASSET: '/api/v1/user/add-asset',
      UPDATE_ASSET: '/api/v1/user/update-asset',
      LIST_REQUESTS: '/api/v1/user/requests',
      GET_REQUEST_BY_IDENTIFIER: (identifier: string) => `/api/v1/user/request/${identifier}`,
      POST_COMMENT: (identifier: string) => `/api/v1/user/request/${identifier}/comment`,
      ACTIVE_LOANS_COUNT: '/api/v1/user/active-loans-count',
      PENDING_LOANS_COUNT: '/api/v1/user/pending-loans-count',
      TOTAL_BORROW: '/api/v1/user/total-borrow',
      DASHBOARD_STATS: '/api/v1/user/dashboard-stats',
    },
    DOCUMENTS: {
      CREATE: '/api/v1/documents',
      CREATE_BULK: '/api/v1/documents/bulk',
      DELETE_BY_FILEKEYS: '/api/v1/documents/delete-by-filekeys',
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
      ASSIGNED_REQUESTS: '/api/v1/requests/assigned',
      GET_BY_ID: (id: string) => `/api/v1/requests/${id}`,
      GET_AGENTS_BY_DISTRICT: (district: string) => `/api/v1/requests/agents/${district}`,
      ASSIGN_AGENT: (id: string) => `/api/v1/requests/${id}/assign`,
      SELF_ASSIGN_ADMIN: (id: string) => `/api/v1/requests/${id}/self-assign`,
      ASSIGN_ADMIN: (id: string) => `/api/v1/requests/${id}/assign-admin`,
      GET_ADMINS_BY_DISTRICT: (district: string) => `/api/v1/requests/admins/${district}`,
      CREATE_OFFER: (id: string) => `/api/v1/requests/${id}/offer`,
      CURRENT_OFFER: (id: string) => `/api/v1/requests/${id}/current-offer`,
      UPDATE_STATUS: (id: string) => `/api/v1/requests/${id}/status`,
  UPDATE_COMMENTS_ENABLED: (id: string) => `/api/v1/requests/${id}/comments-enabled`,
      UPDATE_BANK_DETAILS: (id: string) => `/api/v1/requests/${id}/bank-details`,
      GENERATE_AGREEMENT: (id: string) => `/api/v1/requests/${id}/generate-agreement`,
      SIGN_AGREEMENT: (id: string) => `/api/v1/requests/${id}/sign-agreement`,
      UPLOAD_SIGNED_AGREEMENT: (id: string) => `/api/v1/requests/${id}/upload-signed-agreement`,
  COMPLETE_INSPECTION: (id: string) => `/api/v1/requests/${id}/inspections/complete`,
      OFFER_PREVIEW: (id: string, amount: number, tenureMonths: number, interestRate: number) => `/api/v1/requests/${id}/offer-preview?amount=${amount}&tenureMonths=${tenureMonths}&interestRate=${interestRate}`,
      ADD_COMMENT: (id: string) => `/api/v1/user/request/${id}/comment`,
      CONFIRM_OFFER: (id: string) => `/api/v1/requests/${id}/offers/admin-offer/confirm`,
    },
    PAYMENTS: {
      BASE: '/api/v1/payments',
      RAZORPAY_CREATE_ORDER: '/api/v1/payments/razorpay/create-order',
      RAZORPAY_VERIFY: '/api/v1/payments/razorpay/verify',
      EMI_PAY: '/api/v1/payments/emi/pay',
      EMI_BREAKDOWN: (emiId: string) => `/api/v1/payments/emi/${emiId}/breakdown`,
      EMI_HISTORY: (emiId: string) => `/api/v1/payments/emi/${emiId}/history`,
    },
    LOANS: {
      LIST: '/api/v1/loans',
      GET_BY_ID: (id: string) => `/api/v1/loans/${id}`,
      EMI_SCHEDULE: (id: string) => `/api/v1/loans/${id}/emi-schedule`,
      PAYMENTS: (id: string) => `/api/v1/loans/${id}/payments`,
    },
    NOTIFICATIONS: {
      LIST: '/api/v1/notifications',
      UNREAD_COUNT: '/api/v1/notifications/unread-count',
      MARK_READ: (id: string) => `/api/v1/notifications/${id}/read`,
      MARK_ALL_READ: '/api/v1/notifications/read-all',
      ARCHIVE: (id: string) => `/api/v1/notifications/${id}/archive`,
      DELETE: (id: string) => `/api/v1/notifications/${id}`,
    },
    // Geography management endpoints
    GEOGRAPHY: {
      // Countries
      COUNTRIES: '/api/v1/geography/countries',
      COUNTRY_BY_ID: (id: string) => `/api/v1/geography/countries/${id}`,
      // States
      STATES: '/api/v1/geography/states',
      STATE_BY_ID: (id: string) => `/api/v1/geography/states/${id}`,
      STATES_BY_COUNTRY: (countryId: string) => `/api/v1/geography/countries/${countryId}/states`,
      // Districts
      DISTRICTS: '/api/v1/geography/districts',
      DISTRICT_BY_ID: (id: string) => `/api/v1/geography/districts/${id}`,
      DISTRICTS_BY_STATE: (stateId: string) => `/api/v1/geography/states/${stateId}/districts`,
      // Warehouses
      WAREHOUSES: '/api/v1/geography/warehouses',
      WAREHOUSE_BY_ID: (id: string) => `/api/v1/geography/warehouses/${id}`,
      WAREHOUSES_BY_DISTRICT: (districtId: string) => `/api/v1/geography/districts/${districtId}/warehouses`,
    },
    // User assignment endpoints (state/district admin, agent assignments)
    ASSIGNMENTS: {
      // State admin assignments
      STATE_ADMINS: '/api/v1/assignments/state-admins',
      ASSIGN_STATE: (userId: string) => `/api/v1/assignments/users/${userId}/states`,
      REMOVE_STATE_ASSIGNMENT: (userId: string, stateId: string) => `/api/v1/assignments/users/${userId}/states/${stateId}`,
      // District admin/agent assignments
      DISTRICT_ADMINS: '/api/v1/assignments/district-admins',
      ASSIGN_DISTRICT: (userId: string) => `/api/v1/assignments/users/${userId}/districts`,
      REMOVE_DISTRICT_ASSIGNMENT: (userId: string, districtId: string) => `/api/v1/assignments/users/${userId}/districts/${districtId}`,
      // Get all assignments for a user
      USER_ASSIGNMENTS: (userId: string) => `/api/v1/assignments/users/${userId}`,
      // Get admins/agents for a specific geography
      ADMINS_BY_STATE: (stateId: string) => `/api/v1/assignments/states/${stateId}/admins`,
      ADMINS_BY_DISTRICT: (districtId: string) => `/api/v1/assignments/districts/${districtId}/admins`,
      AGENTS_BY_DISTRICT: (districtId: string) => `/api/v1/assignments/districts/${districtId}/agents`,
    },
    // Asset management endpoints
    ASSETS: {
      LIST: '/api/v1/assets',
      STATS: '/api/v1/assets/stats',
      GET_BY_ID: (id: string) => `/api/v1/assets/${id}`,
      BY_REQUEST: (requestId: string) => `/api/v1/assets/by-request/${requestId}`,
      UPDATE: (id: string) => `/api/v1/assets/${id}`,
      UPDATE_STATUS: (id: string) => `/api/v1/assets/${id}/status`,
      MOVEMENTS: (assetId: string) => `/api/v1/assets/${assetId}/movements`,
      CREATE_MOVEMENT: (assetId: string) => `/api/v1/assets/${assetId}/movements`,
      WAREHOUSE_INVENTORY: (warehouseId: string) => `/api/v1/assets/warehouses/${warehouseId}/inventory`,
    },
    // Auction endpoints
    AUCTIONS: {
      LIST: '/api/v1/auctions',
      GET_BY_ID: (id: string) => `/api/v1/auctions/${id}`,
      CREATE: '/api/v1/auctions',
      UPDATE: (id: string) => `/api/v1/auctions/${id}`,
      PLACE_BID: (auctionId: string) => `/api/v1/auctions/${auctionId}/bids`,
      BID_HISTORY: (auctionId: string) => `/api/v1/auctions/${auctionId}/bids`,
      MY_BIDS: '/api/v1/auctions/my-bids',
      MY_WINS: '/api/v1/auctions/my-wins',
      CANCEL: (id: string) => `/api/v1/auctions/${id}/cancel`,
      COMPLETE: (id: string) => `/api/v1/auctions/${id}/complete`,
    },
  }
}

export const FRONTEND_API_CONFIG = {
  BASE_URL: frontendConfig.public.apiUrl,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/login',
      REGISTER: '/register'
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
  '/login',
  '/register',
  '/reset-password',
  '/reset-password/confirm',
];
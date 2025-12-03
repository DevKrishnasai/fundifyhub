/**
 * Notification constants
 * @module notification/notification.constants
 */

// ============================================
// SERVICE NAMES
// ============================================

export enum SERVICE_NAMES {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

// ============================================
// TEMPLATE NAMES
// ============================================

export enum TEMPLATE_NAMES {
  WELCOME = 'WELCOME',
  OTP_VERIFICATION = 'OTP_VERIFICATION',
  LOGIN_ALERT = 'LOGIN_ALERT',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ADMIN_USER_CREATED = 'ADMIN_USER_CREATED',
  ASSET_PLEDGE = 'ASSET_PLEDGE',
  EMI_REMINDER = 'EMI_REMINDER',
  EMI_OVERDUE = 'EMI_OVERDUE',
  REQUEST_STATUS_NOTIFICATIONS = 'REQUEST_STATUS_NOTIFICATIONS',
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
}

// ============================================
// QUEUE NAMES
// ============================================

export enum QUEUE_NAMES {
  EMI_CRON_QUEUE = 'EMI_CRON_QUEUE',
  NOTIFICATION_QUEUE = 'NOTIFICATION_QUEUE',
  SERVICE_CONTROL_QUEUE = 'SERVICE_CONTROL_QUEUE',
}

// ============================================
// JOB TYPES
// ============================================

export enum JOB_TYPES {
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  UPDATE_OVERDUE_EMIS = 'UPDATE_OVERDUE_EMIS',
  SERVICE_CONTROL = 'SERVICE_CONTROL',
}

// ============================================
// SERVICE CONTROL
// ============================================

export enum SERVICE_CONTROL_ACTIONS {
  START = 'START',
  STOP = 'STOP',
  RESTART = 'RESTART',
  DISCONNECT = 'DISCONNECT',
  TEST = 'TEST',
}

export enum CONNECTION_STATUS {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  CONNECTING = 'CONNECTING',
  WAITING_FOR_QR_SCAN = 'WAITING_FOR_QR_SCAN',
  AUTHENTICATED = 'AUTHENTICATED',
  INITIALIZING = 'INITIALIZING',
}

// Shared service actions for queue jobs
export const SERVICE_ACTIONS = {
  START: 'START',
  STOP: 'STOP',
  RESTART: 'RESTART',
  DISCONNECT: 'DISCONNECT',
} as const;

// Shared queue and job name constants so all services use the same names
export const QUEUE_NAMES = {
  OTP: 'otp',
  EMAIL: 'email',
  SERVICE_CONTROL: 'service-control',
  NOTIFICATIONS: 'notifications',
  // Add more queues here (e.g., 'reports', 'analytics')
} as const;

export const JOB_NAMES = {
  SEND_OTP: 'send-otp',
  WELCOME_EMAIL: 'welcome',
  SERVICE_CONTROL: 'service-control',
  EMAIL_CONFIG_UPDATED: 'email-config-updated',
  WHATSAPP_CONFIG_UPDATED: 'whatsapp-config-updated',
  SERVICE_STATUS_UPDATED: 'service-status-updated',
  // Add more job/event names here as needed
} as const;

// Shared connection status constants
export const CONNECTION_STATUS = {
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  INITIALIZING: 'INITIALIZING',
  WAITING_FOR_QR_SCAN: 'WAITING_FOR_QR_SCAN',
  AUTHENTICATED: 'AUTHENTICATED',
  AUTH_FAILURE: 'AUTH_FAILURE',
  TIMEOUT: 'TIMEOUT',
  DISABLED: 'DISABLED',
  ERROR: 'ERROR',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  removeOnComplete: 100,
  removeOnFail: 500,
};

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES] | string;
export type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES] | string;

export default { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS };

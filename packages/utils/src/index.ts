// Expose env helpers and the new template-driven enqueue helper
export { appConfig, validateConfig } from './env';
export { enqueue, enqueueServiceControl } from './enqueue';

// Simple template name collections used by callers
export const EMAIL_TEMPLATES = {
  WELCOME_EMAIL: 'welcome-email',
  WELCOME: 'welcome-email',
  OTP: 'otpVerification',
  LOGIN_ALERT: 'loginAlert',
};
export const WHATSAPP_TEMPLATES = {
  OTP: 'otpVerification',
  LOGIN_ALERT: 'loginAlert',
};

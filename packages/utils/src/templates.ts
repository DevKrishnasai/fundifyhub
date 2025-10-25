/**
 * Shared templates for email / WhatsApp jobs
 * Keep templates minimal and use {{placeholders}} which the job-worker adapters will replace
 */
export const EMAIL_TEMPLATES = {
  VERIFICATION: {
    meta: { category: 'OTP', templateType: 'VERIFICATION' },
    subject: 'Your verification code',
    body: 'Hello {{firstName}},\n\nYour verification code is {{otp}}. It will expire in 10 minutes.\n\nIf you did not request this, ignore this message.',
  },
  LOGIN: {
    meta: { category: 'OTP', templateType: 'LOGIN' },
    subject: 'Login code',
    body: 'Hello {{firstName}},\n\nYour login code is {{otp}}. Use this to sign in.',
  },
  RESET_PASSWORD: {
    meta: { category: 'OTP', templateType: 'RESET_PASSWORD' },
    subject: 'Reset your password',
    body: 'Hello {{firstName}},\n\nUse the following code to reset your password: {{otp}}',
  },
  WELCOME: {
    meta: { category: 'GENERIC', templateType: 'WELCOME' },
    subject: 'Welcome to FundifyHub',
    body: 'Hi {{firstName}},\n\nWelcome to FundifyHub. We are excited to have you onboard.',
  },
};

export const WHATSAPP_TEMPLATES = {
  VERIFICATION: {
    meta: { category: 'OTP', templateType: 'VERIFICATION' },
    message: 'Hi {{firstName}}, your verification code is {{otp}}. Expires in 10 mins.',
  },
  LOGIN: {
    meta: { category: 'OTP', templateType: 'LOGIN' },
    message: 'Hi {{firstName}}, your login code is {{otp}}.',
  },
  RESET_PASSWORD: {
    meta: { category: 'OTP', templateType: 'RESET_PASSWORD' },
    message: 'Hi {{firstName}}, reset code: {{otp}}',
  },
};

export default {
  EMAIL_TEMPLATES,
  WHATSAPP_TEMPLATES,
};

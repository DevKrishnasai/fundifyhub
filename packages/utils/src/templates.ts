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
    subject: 'Welcome to FundifyHub - Your Account is Ready!',
    body: `Hi {{firstName}},

Welcome to FundifyHub! We're excited to have you join our community.

Your account has been successfully created and is now active. You can now:

• Access your personalized dashboard
• Explore loan options and financial services
• Manage your profile and preferences
• Contact our support team for any assistance

To get started, simply log in to your account using your email and password.

If you have any questions or need help, our support team is here to assist you.

Best regards,
The FundifyHub Team

---
This is an automated message. Please do not reply to this email.`,
  },
  USER_DEACTIVATED: {
    meta: { category: 'GENERIC', templateType: 'USER_DEACTIVATED' },
    subject: 'Your FundifyHub Account Has Been Deactivated',
    body: `Hi {{firstName}},

We're writing to inform you that your FundifyHub account has been deactivated by an administrator.

This means you will no longer be able to:
• Access your account dashboard
• Apply for new loans or services
• View your account history

If you believe this deactivation was made in error or if you have any questions, please contact our support team immediately.

We value you as a member of our community and hope to resolve this matter quickly.

Best regards,
The FundifyHub Team

---
This is an automated message. Please do not reply to this email.`,
  },
  USER_ACTIVATED: {
    meta: { category: 'GENERIC', templateType: 'USER_ACTIVATED' },
    subject: 'Your FundifyHub Account Has Been Reactivated',
    body: `Hi {{firstName}},

Great news! Your FundifyHub account has been reactivated.

You can now:
• Access your account dashboard
• Apply for loans and services
• View your account history
• Use all platform features

Welcome back! If you have any questions, our support team is here to help.

Best regards,
The FundifyHub Team

---
This is an automated message. Please do not reply to this email.`,
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
  WELCOME: {
    meta: { category: 'GENERIC', templateType: 'WELCOME' },
    message: 'Hi {{firstName}}, welcome to FundifyHub! Your account is now active. Visit your dashboard to explore our services.',
  },
  USER_DEACTIVATED: {
    meta: { category: 'GENERIC', templateType: 'USER_DEACTIVATED' },
    message: 'Hi {{firstName}}, your FundifyHub account has been deactivated. Contact support if you believe this was an error.',
  },
  USER_ACTIVATED: {
    meta: { category: 'GENERIC', templateType: 'USER_ACTIVATED' },
    message: 'Hi {{firstName}}, your FundifyHub account has been reactivated! Welcome back - you can now access all features.',
  },
};

export default {
  EMAIL_TEMPLATES,
  WHATSAPP_TEMPLATES,
};

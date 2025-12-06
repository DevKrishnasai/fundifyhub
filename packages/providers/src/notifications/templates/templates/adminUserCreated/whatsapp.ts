import { AdminUserCreatedPayload } from '@fundifyhub/types';

export const renderAdminUserCreatedWhatsApp = (vars: AdminUserCreatedPayload) => {
  const {
    name,
    temporaryPassword,
    loginUrl,
    companyName,
    role,
  } = vars;

  const roleText = role
    ? `\n• *Role:* ${role}`
    : '';

  return `🎉 *Welcome to ${companyName}!*

Hi ${name},

An account has been created for you.

📋 *Your Login Details:*
${temporaryPassword ? `Temporary Password: *${temporaryPassword}*` : ''}
${roleText}

🔗 Login here: ${loginUrl}

⚠️ *Important:* Please change your password after your first login for security.

Need help? Contact our support team.`;
};

export default renderAdminUserCreatedWhatsApp;

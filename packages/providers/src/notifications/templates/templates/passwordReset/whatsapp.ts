import { PasswordResetPayload } from '@fundifyhub/types';

interface PasswordResetWhatsAppProps {
  customerName: string;
  resetUrl: string;
  expiresInMinutes: number;
  companyName: string;
  supportUrl: string;
}

export const renderPasswordResetWhatsApp = (vars: PasswordResetPayload) => {
  const props: PasswordResetWhatsAppProps = {
    customerName: vars.customerName,
    resetUrl: vars.resetUrl,
    expiresInMinutes: vars.expiresInMinutes,
    companyName: vars.companyName,
    supportUrl: vars.supportUrl ?? 'support',
  };

  return `🔑 *${props.companyName} Password Reset*

Hi ${props.customerName},

We received a request to reset your password.

Click the link below to create a new password:
${props.resetUrl}

⏰ This link expires in *${props.expiresInMinutes} minutes*.

🔒 *Security Notice:*
• If you didn't request this, please ignore this message
• Never share this link with anyone
• ${props.companyName} will never ask for your password

Need help? Visit ${props.supportUrl}`;
};

export default renderPasswordResetWhatsApp;

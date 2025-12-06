import { OTPVerificationPayload } from "@fundifyhub/types";

interface OtpWhatsAppProps {
  otpCode: string;
  expiresInMinutes?: number;
  companyName?: string;
  supportUrl?: string;
}

export const renderOtpWhatsApp = (vars: OTPVerificationPayload) => {
  const props: OtpWhatsAppProps = {
    otpCode: vars.otpCode,
    expiresInMinutes: vars.expiresInMinutes,
    companyName: vars.companyName,
    supportUrl: vars.supportUrl,
  };

  return `🔐 *${props.companyName} Verification*

Your OTP is:
*${props.otpCode}*

⏰ This code will expire in ${props.expiresInMinutes} minutes.

For your security:
• Never share this code with anyone
• ${props.companyName} will never ask for your password
• If you didn't request this code, please ignore this message

Need help? Visit ${props.supportUrl}`;
};

export default renderOtpWhatsApp;

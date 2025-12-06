import { LoginAlertPayload } from "@fundifyhub/types";

export const renderLoginWhatsApp = (vars: LoginAlertPayload) => {
  const props: LoginAlertPayload = {
    email: vars.email,
    phoneNumber: vars.phoneNumber,
    customerName: vars.customerName,
    device: vars.device,
    location: vars.location,
    loginTime: vars.loginTime,
    supportUrl: vars.supportUrl,
    resetPasswordUrl: vars.resetPasswordUrl,
    companyName: vars.companyName
  };

  return `⚠️ *${props.companyName} Login Alert*

Hi ${props.customerName},

A new login to your ${props.companyName} account was detected:

• *Device:* ${props.device}
• *Location:* ${props.location}
• *Time:* ${props.loginTime}

If this was you, no action is required. Otherwise, secure your account immediately:
${props.resetPasswordUrl}

Need help? Visit ${props.supportUrl} for support.`;
};

export default renderLoginWhatsApp;

interface LoginWhatsAppProps {
  customerName?: string;
  device?: string;
  location?: string;
  time?: string;
  supportUrl?: string;
  resetPasswordUrl?: string;
  companyName?: string;
}

export const renderLoginWhatsApp = (vars: Record<string, any>) => {
  const props: LoginWhatsAppProps = {
    customerName: vars.customerName || 'User',
    device: vars.device || 'Unknown Device',
    location: vars.location || 'Unknown Location',
    time: vars.time || new Date().toLocaleString(),
    supportUrl: vars.supportUrl,
    resetPasswordUrl: vars.resetPasswordUrl,
    companyName: vars.companyName
  };

  return `⚠️ *${props.companyName} Login Alert*

Hi ${props.customerName},

A new login to your ${props.companyName} account was detected:

• *Device:* ${props.device}
• *Location:* ${props.location}
• *Time:* ${props.time}

If this was you, no action is required. Otherwise, secure your account immediately:
${props.resetPasswordUrl}

Need help? Visit ${props.supportUrl} for support.`;
};

export default renderLoginWhatsApp;

interface WelcomeWhatsAppProps {
  customerName: string;
  companyName: string;
  companyUrl: string;
  supportUrl: string;
}

export const renderWelcomeWhatsApp = (vars: Record<string, any>) => {
  const props: WelcomeWhatsAppProps = {
    customerName: vars.customerName || 'User',
    companyName: vars.companyName,
    companyUrl: vars.companyUrl,
    supportUrl: vars.supportUrl,
  };

  return `🌟 Hello ${props.customerName}, welcome to *${props.companyName}*! 🌟

We’re thrilled to have you join us. With ${props.companyName}, managing and growing your finances has never been easier.

💡 Get started now and explore smart tools to track, invest, and plan for a brighter financial future:
👉 ${props.companyUrl}/get-started

Need assistance? Our support team is always ready to help:
📞 ${props.supportUrl}

Let's make your financial journey exciting and effortless! 🚀`;
};

export default renderWelcomeWhatsApp;

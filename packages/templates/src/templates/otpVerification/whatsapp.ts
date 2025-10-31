export const renderWhatsApp = (vars: Record<string, any>) => {
  const otp = vars.otp || '';
  const name = vars.userName || '';
  return `Hi ${name}, your OTP is ${otp}. It expires in ${vars.expiryMinutes ?? 10} minutes.`;
};

export default renderWhatsApp;
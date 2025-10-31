export const renderWhatsApp = (vars: Record<string, any>) => {
  const firstName = vars.firstName || '';
  const lastName = vars.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || 'User';
  const loginAt = vars.loginAt ? new Date(vars.loginAt).toLocaleString() : 'Unknown time';
  const ip = vars.ip || 'Unknown IP';

  return `Hi ${name}, we noticed a new login to your account on ${loginAt} from IP ${ip}. If this wasn't you, please secure your account.`;
};

export default renderWhatsApp;
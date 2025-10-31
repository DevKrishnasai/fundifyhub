import renderEmail from './email';
import renderWhatsApp from './whatsapp';
import { ServiceName } from '@fundifyhub/types';
import type { Template } from '@fundifyhub/types';

const tpl = {
  name: 'otpVerification',
  supportedServices: [ServiceName.EMAIL, ServiceName.WHATSAPP],
  requiredVariables: ['recipient', 'otp', 'userName'],
  optionalVariables: ['expiryMinutes', 'email'],
  defaults: { priority: 2, attempts: 3, delay: 0 },
  renderEmail,
  renderWhatsApp,
};

export default tpl as unknown as Template;
export { renderEmail, renderWhatsApp };

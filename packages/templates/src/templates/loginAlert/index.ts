import renderEmail from './email';
import renderWhatsApp from './whatsapp';
import { ServiceName } from '@fundifyhub/types';
import type { Template } from '@fundifyhub/types';

const tpl = {
  name: 'loginAlert',
  supportedServices: [ServiceName.EMAIL, ServiceName.WHATSAPP],
  requiredVariables: ['recipient', 'userId', 'firstName', 'lastName', 'loginAt', 'ip', 'userAgent'],
  optionalVariables: [],
  defaults: { priority: 2, attempts: 2, delay: 0 },
  renderEmail,
  renderWhatsApp,
};

export default tpl as unknown as Template;
export { renderEmail, renderWhatsApp };

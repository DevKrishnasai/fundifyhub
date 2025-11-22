import { SERVICE_NAMES } from '@fundifyhub/types';
import renderEmail from './email';

const tpl = {
  supportedServices: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
  defaults: { priority: 1, attempts: 3, delay: 0 },
  renderEmail,
};

export default tpl;

import { SERVICE_NAMES } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl = {
  supportedServices: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
   defaults: { priority: 2, attempts: 2, delay: 0 },
   renderEmail,
   renderWhatsApp,
};

export default tpl;

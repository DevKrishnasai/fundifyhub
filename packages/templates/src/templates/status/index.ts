import { SERVICE_NAMES, TEMPLATE_NAMES, TemplateDefinitionType } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: TemplateDefinitionType<TEMPLATE_NAMES.STATUS> = {
  supportedServices: [SERVICE_NAMES.WHATSAPP, SERVICE_NAMES.EMAIL],
  defaults: { priority: 2, attempts: 2, delay: 0 },
  renderEmail,
  renderWhatsApp,
};

export default tpl;

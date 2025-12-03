import { SERVICE_NAMES, TEMPLATE_NAMES, TemplateDefinitionType } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: TemplateDefinitionType<TEMPLATE_NAMES.PASSWORD_RESET> = {
  supportedServices: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
  defaults: { priority: 1, attempts: 2, delay: 0 },
  getSubject: (payload) => `Reset Your ${payload.companyName} Password`,
  renderEmail,
  renderWhatsApp,
};

export default tpl;

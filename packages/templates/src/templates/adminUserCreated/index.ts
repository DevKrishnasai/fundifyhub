import { SERVICE_NAMES, TEMPLATE_NAMES, TemplateDefinitionType } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: TemplateDefinitionType<TEMPLATE_NAMES.ADMIN_USER_CREATED> = {
  supportedServices: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
  defaults: { priority: 1, attempts: 2, delay: 0 },
  getSubject: (payload) => `Your ${payload.companyName} Account Has Been Created`,
  renderEmail,
  renderWhatsApp,
};

export default tpl;

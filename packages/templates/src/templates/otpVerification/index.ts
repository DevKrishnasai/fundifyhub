import { SERVICE_NAMES, TEMPLATE_NAMES, TemplateDefinitionType } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl : TemplateDefinitionType<TEMPLATE_NAMES.OTP_VERIFICATION> = {
  supportedServices: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
   defaults: { priority: 2, attempts: 2, delay: 0 },
   getSubject: (payload) => `Your OTP Code for ${payload.companyName}`,
   renderEmail,
   renderWhatsApp,
};

export default tpl;

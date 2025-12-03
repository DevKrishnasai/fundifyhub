import { SERVICE_NAMES, TEMPLATE_NAMES, TemplateDefinitionType, EMIOverduePayloadType } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: TemplateDefinitionType<TEMPLATE_NAMES.EMI_OVERDUE> = {
  supportedServices: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
  defaults: { priority: 1, attempts: 3, delay: 0 },
  renderEmail,
  renderWhatsApp,
  getSubject: (vars: EMIOverduePayloadType) =>
    `⚠️ EMI Overdue: ₹${vars.totalDue.toLocaleString('en-IN')} payment required`,
};

export default tpl;

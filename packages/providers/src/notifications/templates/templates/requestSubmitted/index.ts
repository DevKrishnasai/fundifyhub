import { SERVICE_NAMES, TEMPLATE_NAMES, TemplateDefinitionType, RequestSubmittedPayloadType } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: TemplateDefinitionType<TEMPLATE_NAMES.REQUEST_SUBMITTED> = {
  supportedServices: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
  defaults: { priority: 2, attempts: 2, delay: 0 },
  getSubject: (payload) => `Request ${payload.requestId} submitted — ${payload.companyName ?? 'FundifyHub'}`,
  renderEmail,
  renderWhatsApp,
};

export default tpl;

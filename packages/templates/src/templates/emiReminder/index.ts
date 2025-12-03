import { SERVICE_NAMES, TEMPLATE_NAMES, TemplateDefinitionType, EMIReminderPayloadType } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: TemplateDefinitionType<TEMPLATE_NAMES.EMI_REMINDER> = {
  supportedServices: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
  defaults: { priority: 1, attempts: 3, delay: 0 },
  renderEmail,
  renderWhatsApp,
  getSubject: (vars: EMIReminderPayloadType) =>
    `EMI Reminder: Payment of ₹${vars.emiAmount.toLocaleString('en-IN')} due on ${vars.dueDate}`,
};

export default tpl;

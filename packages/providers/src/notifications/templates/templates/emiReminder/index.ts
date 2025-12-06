import { NotificationTemplateName, NotificationChannel, NotificationCategory, NotificationPriority, NotificationTemplateDefinition, EMIReminderPayload } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: NotificationTemplateDefinition<NotificationTemplateName.EMI_REMINDER> = {
  name: NotificationTemplateName.EMI_REMINDER,
  description: 'Notification sent to remind about upcoming EMI',
  supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  defaultCategory: NotificationCategory.REMINDER,
  defaultPriority: NotificationPriority.NORMAL,
  renderers: {
    [NotificationChannel.EMAIL]: async (vars) => ({ content: await renderEmail(vars) }),
    [NotificationChannel.WHATSAPP]: (vars) => ({ content: renderWhatsApp(vars) }),
  },
  getSubject: (vars: EMIReminderPayload) =>
    `EMI Reminder: Payment of ₹${vars.emiAmount.toLocaleString('en-IN')} due on ${vars.dueDate}`,
};

export default tpl;

import { NotificationTemplateName, NotificationChannel, NotificationCategory, NotificationPriority, NotificationTemplateDefinition, EMIOverduePayload } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: NotificationTemplateDefinition<NotificationTemplateName.EMI_OVERDUE> = {
  name: NotificationTemplateName.EMI_OVERDUE,
  description: 'Notification sent when an EMI is overdue',
  supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  defaultCategory: NotificationCategory.REMINDER,
  defaultPriority: NotificationPriority.HIGH,
  renderers: {
    [NotificationChannel.EMAIL]: async (vars) => ({ content: await renderEmail(vars) }),
    [NotificationChannel.WHATSAPP]: (vars) => ({ content: renderWhatsApp(vars) }),
  },
  getSubject: (vars: EMIOverduePayload) =>
    `⚠️ EMI Overdue: ₹${vars.totalDue.toLocaleString('en-IN')} payment required`,
};

export default tpl;

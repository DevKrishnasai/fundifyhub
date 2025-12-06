import { NotificationTemplateName, NotificationChannel, NotificationCategory, NotificationPriority, NotificationTemplateDefinition } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: NotificationTemplateDefinition<NotificationTemplateName.PASSWORD_RESET> = {
  name: NotificationTemplateName.PASSWORD_RESET,
  description: 'Notification sent for password reset',
  supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  defaultCategory: NotificationCategory.SECURITY,
  defaultPriority: NotificationPriority.HIGH,
  renderers: {
    [NotificationChannel.EMAIL]: async (vars) => ({ content: await renderEmail(vars) }),
    [NotificationChannel.WHATSAPP]: (vars) => ({ content: renderWhatsApp(vars) }),
  },
  getSubject: (payload) => `Reset Your ${payload.companyName} Password`,
};

export default tpl;

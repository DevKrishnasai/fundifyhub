import { NotificationTemplateName, NotificationChannel, NotificationCategory, NotificationPriority, NotificationTemplateDefinition } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: NotificationTemplateDefinition<NotificationTemplateName.ADMIN_USER_CREATED> = {
  name: NotificationTemplateName.ADMIN_USER_CREATED,
  description: 'Notification sent when a new admin user is created',
  supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  defaultCategory: NotificationCategory.SECURITY,
  defaultPriority: NotificationPriority.HIGH,
  renderers: {
    [NotificationChannel.EMAIL]: async (vars) => ({ content: await renderEmail(vars) }),
    [NotificationChannel.WHATSAPP]: (vars) => ({ content: renderWhatsApp(vars) }),
  },
  getSubject: (payload) => `Your ${payload.companyName} Account Has Been Created`,
};

export default tpl;

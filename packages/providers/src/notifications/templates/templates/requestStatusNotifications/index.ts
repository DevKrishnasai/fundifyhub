import { NotificationTemplateName, NotificationChannel, NotificationCategory, NotificationPriority, NotificationTemplateDefinition } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: NotificationTemplateDefinition<NotificationTemplateName.REQUEST_STATUS_UPDATE> = {
  name: NotificationTemplateName.REQUEST_STATUS_UPDATE,
  description: 'Notification sent when a request status is updated',
  supportedChannels: [NotificationChannel.WHATSAPP, NotificationChannel.EMAIL],
  defaultCategory: NotificationCategory.TRANSACTIONAL,
  defaultPriority: NotificationPriority.NORMAL,
  renderers: {
    [NotificationChannel.EMAIL]: async (vars) => ({ content: await renderEmail(vars) }),
    [NotificationChannel.WHATSAPP]: (vars) => ({ content: renderWhatsApp(vars) }),
  },
};

export default tpl;

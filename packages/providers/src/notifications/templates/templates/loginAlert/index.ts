import { LoginAlertPayload, NotificationTemplateName, NotificationChannel, NotificationCategory, NotificationPriority, NotificationTemplateDefinition } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl : NotificationTemplateDefinition<NotificationTemplateName.LOGIN_ALERT> = {
  name: NotificationTemplateName.LOGIN_ALERT,
  description: 'Notification sent when a new login is detected',
  supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  defaultCategory: NotificationCategory.SECURITY,
  defaultPriority: NotificationPriority.HIGH,
  renderers: {
    [NotificationChannel.EMAIL]: async (vars) => ({ content: await renderEmail(vars) }),
    [NotificationChannel.WHATSAPP]: (vars) => ({ content: renderWhatsApp(vars) }),
  },
  getSubject: (payload: LoginAlertPayload) => `New Login Alert for ${payload.customerName}`,
};

export default tpl;

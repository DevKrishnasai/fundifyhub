import { NotificationTemplateName, NotificationChannel, NotificationCategory, NotificationPriority, NotificationTemplateDefinition } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl : NotificationTemplateDefinition<NotificationTemplateName.OTP_VERIFICATION> = {
  name: NotificationTemplateName.OTP_VERIFICATION,
  description: 'Notification sent for OTP verification',
  supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  defaultCategory: NotificationCategory.SECURITY,
  defaultPriority: NotificationPriority.CRITICAL,
  renderers: {
    [NotificationChannel.EMAIL]: async (vars) => ({ content: await renderEmail(vars) }),
    [NotificationChannel.WHATSAPP]: (vars) => ({ content: renderWhatsApp(vars) }),
  },
  getSubject: (payload) => `Your OTP Code for ${payload.companyName}`,
};

export default tpl;

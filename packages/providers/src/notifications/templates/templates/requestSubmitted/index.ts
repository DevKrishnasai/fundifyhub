import { NotificationTemplateName, NotificationChannel, NotificationCategory, NotificationPriority, NotificationTemplateDefinition, RequestSubmittedPayload } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: NotificationTemplateDefinition<NotificationTemplateName.REQUEST_SUBMITTED> = {
  name: NotificationTemplateName.REQUEST_SUBMITTED,
  description: 'Notification sent when a request is submitted',
  supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  defaultCategory: NotificationCategory.TRANSACTIONAL,
  defaultPriority: NotificationPriority.NORMAL,
  renderers: {
    [NotificationChannel.EMAIL]: async (vars) => ({ content: await renderEmail(vars) }),
    [NotificationChannel.WHATSAPP]: (vars) => ({ content: renderWhatsApp(vars) }),
  },
  getSubject: (payload) => `Request ${payload.requestId} submitted — ${payload.companyName ?? 'FundifyHub'}`,
};

export default tpl;

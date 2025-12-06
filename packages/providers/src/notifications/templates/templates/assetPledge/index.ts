import { NotificationTemplateName, NotificationChannel, NotificationCategory, NotificationPriority, NotificationTemplateDefinition, AssetPledgePayload } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: NotificationTemplateDefinition<NotificationTemplateName.ASSET_PLEDGE> = {
  name: NotificationTemplateName.ASSET_PLEDGE,
  description: 'Notification sent when a new asset is pledged',
  supportedChannels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
  defaultCategory: NotificationCategory.TRANSACTIONAL,
  defaultPriority: NotificationPriority.NORMAL,
  renderers: {
    [NotificationChannel.EMAIL]: async (vars) => ({ content: await renderEmail(vars) }),
    [NotificationChannel.WHATSAPP]: (vars) => ({ content: renderWhatsApp(vars) }),
  },
  getSubject: (vars: AssetPledgePayload) => 
    `New Asset Pledge: ${vars.assetName} by ${vars.customerName || 'Customer'}`,
};

export default tpl;

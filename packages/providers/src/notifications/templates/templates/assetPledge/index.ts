import { SERVICE_NAMES, TEMPLATE_NAMES, TemplateDefinitionType, AssetPledgePayloadType } from '@fundifyhub/types';
import renderEmail from './email';
import renderWhatsApp from './whatsapp';

const tpl: TemplateDefinitionType<TEMPLATE_NAMES.ASSET_PLEDGE> = {
  supportedServices: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
  defaults: { priority: 2, attempts: 2, delay: 0 },
  renderEmail,
  renderWhatsApp,
  getSubject: (vars: AssetPledgePayloadType) => 
    `New Asset Pledge: ${vars.assetName} by ${vars.customerName || 'Customer'}`,
};

export default tpl;

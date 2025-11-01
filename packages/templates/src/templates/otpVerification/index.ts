import renderEmail from './email';
import renderWhatsApp from './whatsapp';
import type { Template } from '@fundifyhub/types';
import { config } from './config';

const tpl = {
  ...config,
  renderEmail,
  renderWhatsApp,
};

export default tpl as unknown as Template;
export { renderEmail, renderWhatsApp };

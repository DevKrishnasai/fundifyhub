import renderEmail from './email';
import type { Template } from '@fundifyhub/types';
import { config } from './config';

const tpl = {
  ...config,
  renderEmail,
};

export default tpl as unknown as Template;
export { renderEmail };

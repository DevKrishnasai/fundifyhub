import { SERVICE_NAMES } from '@fundifyhub/types';
import renderEmail from './email';

const tpl = {
 supportedServices: [SERVICE_NAMES.EMAIL],
 defaults: { priority: 2, attempts: 2, delay: 0 },
 renderEmail,
};

export default tpl

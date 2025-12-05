import { TEMPLATE_NAMES, type TemplateDefinitionType } from '@fundifyhub/types';

import adminUserCreated from './templates/adminUserCreated';
import assetPledge from './templates/assetPledge';
import emiOverdue from './templates/emiOverdue';
import emiReminder from './templates/emiReminder';
import loginAlert from './templates/loginAlert';
import otpVerification from './templates/otpVerification';
import passwordReset from './templates/passwordReset';
import requestStatusNotifications from './templates/requestStatusNotifications';
import requestSubmitted from './templates/requestSubmitted';
import welcome from './templates/welcome';

type TemplateRegistry = Partial<{ [K in TEMPLATE_NAMES]: TemplateDefinitionType<K> }>;

const TEMPLATE_REGISTRY: TemplateRegistry = {
	[TEMPLATE_NAMES.ADMIN_USER_CREATED]: adminUserCreated,
	[TEMPLATE_NAMES.ASSET_PLEDGE]: assetPledge,
	[TEMPLATE_NAMES.EMI_OVERDUE]: emiOverdue,
	[TEMPLATE_NAMES.EMI_REMINDER]: emiReminder,
	[TEMPLATE_NAMES.LOGIN_ALERT]: loginAlert,
	[TEMPLATE_NAMES.OTP_VERIFICATION]: otpVerification,
	[TEMPLATE_NAMES.PASSWORD_RESET]: passwordReset,
	[TEMPLATE_NAMES.REQUEST_STATUS_NOTIFICATIONS]: requestStatusNotifications,
	[TEMPLATE_NAMES.REQUEST_SUBMITTED]: requestSubmitted,
	[TEMPLATE_NAMES.WELCOME]: welcome,
};

export default TEMPLATE_REGISTRY;
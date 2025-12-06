import { NotificationTemplateName, type NotificationTemplateDefinition } from '@fundifyhub/types';

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

type TemplateRegistry = Partial<{ [K in NotificationTemplateName]: NotificationTemplateDefinition<K> }>;

const TEMPLATE_REGISTRY: TemplateRegistry = {
	[NotificationTemplateName.ADMIN_USER_CREATED]: adminUserCreated,
	[NotificationTemplateName.ASSET_PLEDGE]: assetPledge,
	[NotificationTemplateName.EMI_OVERDUE]: emiOverdue,
	[NotificationTemplateName.EMI_REMINDER]: emiReminder,
	[NotificationTemplateName.LOGIN_ALERT]: loginAlert,
	[NotificationTemplateName.OTP_VERIFICATION]: otpVerification,
	[NotificationTemplateName.PASSWORD_RESET]: passwordReset,
	[NotificationTemplateName.REQUEST_STATUS_UPDATE]: requestStatusNotifications,
	[NotificationTemplateName.REQUEST_SUBMITTED]: requestSubmitted,
	[NotificationTemplateName.WELCOME]: welcome,
};

export default TEMPLATE_REGISTRY;
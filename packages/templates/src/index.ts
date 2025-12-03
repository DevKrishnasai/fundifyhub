import { TEMPLATE_NAMES, TemplateDefinitionType } from '@fundifyhub/types';
import loginAlert from './templates/loginAlert';
import otpVerification from './templates/otpVerification';
import welcome from './templates/welcome';
import assetPledge from './templates/assetPledge';
import emiReminder from './templates/emiReminder';
import emiOverdue from './templates/emiOverdue';
import requestStatusNotifications from './templates/requestStatusNotifications';
import requestSubmitted from './templates/requestSubmitted';
import passwordReset from './templates/passwordReset';
import adminUserCreated from './templates/adminUserCreated';

const TEMPLATE_REGISTRY: { [K in TEMPLATE_NAMES]: TemplateDefinitionType<K> } = {
  LOGIN_ALERT: loginAlert,
  OTP_VERIFICATION: otpVerification,
  WELCOME: welcome,
  ASSET_PLEDGE: assetPledge,
  EMI_REMINDER: emiReminder,
  EMI_OVERDUE: emiOverdue,
  REQUEST_STATUS_NOTIFICATIONS: requestStatusNotifications,
  REQUEST_SUBMITTED: requestSubmitted,
  PASSWORD_RESET: passwordReset,
  ADMIN_USER_CREATED: adminUserCreated,
};

export default TEMPLATE_REGISTRY;
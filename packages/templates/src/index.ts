import { TEMPLATE_NAMES, TemplateDefinitionType } from '@fundifyhub/types';
import loginAlert from './templates/loginAlert';
import otpVerification from './templates/otpVerification';
import welcome from './templates/welcome';
import assetPledge from './templates/assetPledge';
import emiReminder from './templates/emiReminder';
import emiOverdue from './templates/emiOverdue';
import requestStatusNotifications from './templates/requestStatusNotifications';
import requestSubmitted from './templates/requestSubmitted';

const TEMPLATE_REGISTRY: { [K in TEMPLATE_NAMES]: TemplateDefinitionType<K> } = {
  LOGIN_ALERT: loginAlert,
  OTP_VERIFICATION: otpVerification,
  WELCOME: welcome,
  ASSET_PLEDGE: assetPledge,
  EMI_REMINDER: emiReminder,
  EMI_OVERDUE: emiOverdue,
  REQUEST_STATUS_NOTIFICATIONS: requestStatusNotifications,
  REQUEST_SUBMITTED: requestSubmitted,
};

export default TEMPLATE_REGISTRY;
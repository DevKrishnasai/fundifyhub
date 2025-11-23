import { TEMPLATE_NAMES, TemplateDefinitionType } from '@fundifyhub/types';
import loginAlert from './templates/loginAlert';
import otpVerification from './templates/otpVerification';
import welcome from './templates/welcome';
import assetPledge from './templates/assetPledge';
import requestStatusNotificationsatus from './templates/requestStatusNotifications';
import requestSubmitted from './templates/requestSubmitted';

const TEMPLATE_REGISTRY: { [K in TEMPLATE_NAMES]: TemplateDefinitionType<K> } = {
  LOGIN_ALERT: loginAlert,
  OTP_VERIFICATION: otpVerification,
  WELCOME: welcome,
  ASSET_PLEDGE: assetPledge,
  REQUEST_STATUS_NOTIFICATIONS: requestStatusNotificationsatus,
  REQUEST_SUBMITTED: requestSubmitted
};

export default TEMPLATE_REGISTRY;
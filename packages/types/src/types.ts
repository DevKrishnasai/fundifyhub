import { CONNECTION_STATUS, SERVICE_CONTROL_ACTIONS, SERVICE_NAMES, TEMPLATE_NAMES } from "./constants";

export interface UtilsEnvConfigType {
  redis: {
    host: string;
    port: number;
    url?: string;
  };
}

export interface UserType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  // Districts assigned to the user. Always an array.
  districts: string[];
  isActive: boolean;
}

export interface JWTPayloadType extends UserType {}

// ---------- TEMPLATE RELATED ---------------

// TODO [P-3]: Fix any type usage below
export interface TemplateDefinitionType<T extends TEMPLATE_NAMES> {
  supportedServices: SERVICE_NAMES[];
  defaults?: JobOptionsType;
  getSubject?: (payload: TemplatePayloadMapType[T]) => string;
  renderEmail?: (payload: TemplatePayloadMapType[T]) => Promise<string> | string;
  renderWhatsApp?: (payload: TemplatePayloadMapType[T]) => Promise<string> | string;
}

export interface OTPVerificationPayloadType {
  email: string;
  phoneNumber: string;
  otpCode: string;
  expiresInMinutes: number;
  companyName: string;
  supportUrl: string;
  verifyUrl: string;
  logoUrl: string;
  companyUrl: string;
}

export interface WelcomePayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  supportUrl: string;
  companyUrl: string;
  companyName: string;
  logoUrl: string;
}

export interface LoginAlertPayloadType {
  email: string;
  phoneNumber: string;
  customerName: string;
  device: string;
  location: string;
  time: string;
  supportUrl: string;
  resetPasswordUrl: string;
  companyName: string;
}

export interface AssetPledgePayloadType {
  customerName?: string;
  assetName: string;
  amount: number;
  district: string;
  requestId: string;
  companyName: string;
  timestamp: string;
  additionalDescription?: string;
  recipient?: string;
  email?: string;
  phoneNumber?: string;
  adminDashboardUrl?: string;
  supportUrl?: string;
}

export type TemplatePayloadMapType = {
  [TEMPLATE_NAMES.OTP_VERIFICATION]: OTPVerificationPayloadType;
  [TEMPLATE_NAMES.WELCOME]: WelcomePayloadType;
  [TEMPLATE_NAMES.LOGIN_ALERT]: LoginAlertPayloadType;
  [TEMPLATE_NAMES.ASSET_PLEDGE]: AssetPledgePayloadType;
};

// -----------TEMPLATE RELATED END-----------

// ------- JOB RELATED --------------
export interface JobOptionsType {
  services?: SERVICE_NAMES[];
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {type: 'fixed' | 'exponential'; delay: number;};
}

export interface AddJobResultType {
  jobId: string | number;
  error?: string;
}

export interface AddJobType<T extends TEMPLATE_NAMES> {
  templateName: T;
  variables: TemplatePayloadMapType[T];
  options?: JobOptionsType;
}

export interface AddServiceControlJobType {
  action: SERVICE_CONTROL_ACTIONS;
  serviceName: SERVICE_NAMES;
  reason?: string;
  triggeredBy?: string;
}

export interface AddServiceStatusJobResultType extends AddJobResultType {}

export interface ServiceStatusJobDataType {
  serviceName: SERVICE_NAMES;
  isActive: boolean;
  connectionStatus: CONNECTION_STATUS;
  lastError?: string;
  timestamp: Date;
}


// ------- JOB RELATED END ----------
import loginAlert from './templates/loginAlert';
import otpVerification from './templates/otpVerification';
import type { Template } from '@fundifyhub/types';

const REGISTRY: Record<string, Template> = {
  [loginAlert.name]: loginAlert as Template,
  [otpVerification.name]: otpVerification as Template,
};

export const getTemplate = (name: string) => REGISTRY[name];
export const listTemplates = () => Object.keys(REGISTRY);
export const getTemplateMetadata = (name: string) => {
  const tpl = REGISTRY[name];
  if (!tpl) return undefined;
  return {
    name: tpl.name,
    supportedServices: tpl.supportedServices,
    requiredVariables: tpl.requiredVariables,
    defaults: tpl.defaults,
  };
};

export default REGISTRY;
export const TEMPLATE_NAMES = Object.keys(REGISTRY);
export type TEMPLATE_NAMES = keyof typeof REGISTRY;
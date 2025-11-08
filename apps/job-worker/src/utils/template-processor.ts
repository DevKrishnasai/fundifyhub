import { TEMPLATE_NAMES, TemplatePayloadMapType } from '@fundifyhub/types';
import TEMPLATE_REGISTRY from '@fundifyhub/templates';

export type TemplateProcessor<T extends TEMPLATE_NAMES> = {
  process: (variables: TemplatePayloadMapType[T]) => Promise<{ to: string; content: string, subject?: string }>;
};

export function createEmailProcessor<T extends TEMPLATE_NAMES>(templateName: T): TemplateProcessor<T> {
  return {
    process: async (variables: TemplatePayloadMapType[T]) => {
      const template = TEMPLATE_REGISTRY[templateName];
      const html = template.renderEmail ? await template.renderEmail(variables) : '';
      const subject = template.getSubject ? template.getSubject(variables) : '';
      return {
        to: variables.email,
        content: html,
        subject: subject
      };
    }
  };
}

export function createWhatsAppProcessor<T extends TEMPLATE_NAMES>(templateName: T): TemplateProcessor<T> {
  return {
    process: async (variables: TemplatePayloadMapType[T]) => {
      const template = TEMPLATE_REGISTRY[templateName];
      const text = template.renderWhatsApp ? await template.renderWhatsApp(variables) : '';
      return {
        to: variables.phoneNumber,
        content: text
      };
    }
  };
}
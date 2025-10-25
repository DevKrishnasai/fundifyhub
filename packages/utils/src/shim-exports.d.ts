declare module '@fundifyhub/utils' {
  export const QUEUE_NAMES: any;
  export const JOB_NAMES: any;
  export const DEFAULT_JOB_OPTIONS: any;
  export const EMAIL_TEMPLATES: any;
  export const WHATSAPP_TEMPLATES: any;
  export function testEmailConfiguration(cfg: any): Promise<any>;
  export function createTransporter(cfg: any): any;
  export function formatCurrency(amount: number, currency?: string): string;
  // Fallback for other utils exports used across the monorepo
  export * from './index';
}

import { TemplateDefinition, ServiceName } from './queue-types';

export interface Template extends TemplateDefinition {
  /** renderers return string or Promise<string> */
  renderEmail?: (variables: Record<string, unknown>) => string | Promise<string>;
  renderWhatsApp?: (variables: Record<string, unknown>) => string | Promise<string>;
}

export type TemplateRegistry = Record<string, Template>;

export { ServiceName };

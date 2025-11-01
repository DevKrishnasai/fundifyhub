import { Job } from 'bullmq';
import { BaseWorker } from './base-worker';
import { SimpleLogger } from '@fundifyhub/logger';
import { getTemplate } from '@fundifyhub/templates';
import { sendWhatsApp } from '../services/whatsapp-service';
import { serviceManager } from '../services/service-manager';
import { ServiceControlJobData, ServiceControlAction } from '@fundifyhub/types';
import { startWhatsAppService, stopWhatsAppService } from '../services/whatsapp-service';

export class WhatsAppWorker extends BaseWorker<any> {
  constructor(queueName: string, logger: SimpleLogger) {
    super(queueName, logger);
  }

  protected async processJob(job: Job<any>): Promise<any> {
    const data = job.data || {};
    
    // Check if this is a service control job
    if (data.action) {
      return this.handleServiceControl(job, data as ServiceControlJobData);
    }

    // Regular template job
    const { templateName, variables } = data;

    const template = getTemplate(templateName);
    if (!template) {
      const contextLogger = this.logger.child('[whatsapp-worker]');
      contextLogger.error(`Template not found: ${templateName}`);
      throw new Error('Template not found');
    }

    try {
      const available = await serviceManager.isWhatsAppAvailable();
      if (!available) {
        const contextLogger = this.logger.child(`[Job ${job.id}] [whatsapp-worker]`);
        contextLogger.warn('WhatsApp service not available - will retry automatically');
        // Throw error to trigger BullMQ's built-in retry mechanism
        throw new Error('WhatsApp service not available - will retry automatically');
      }
      const text = template.renderWhatsApp ? await template.renderWhatsApp(variables) : '';
      const to = variables.phone || variables.recipient;

      await sendWhatsApp({ to, text });
      // Success - logged at completion
      return true;
    } catch (err) {
      const contextLogger = this.logger.child(`[Job ${job.id}] [whatsapp-worker]`);
      contextLogger.error(`Failed to process WhatsApp job (template: ${data.templateName}, recipient: ${variables.phone || variables.recipient}):`, err as Error);
      throw err;
    }
  }

  private async handleServiceControl(job: Job<any>, data: ServiceControlJobData): Promise<any> {
    const { action, serviceName } = data;
    const contextLogger = this.logger.child(`[Job ${job.id}] [whatsapp-service-control]`);

    try {
      switch (action) {
        case ServiceControlAction.START:
          await startWhatsAppService();
          return { success: true, action: ServiceControlAction.START };

        case ServiceControlAction.STOP:
        case ServiceControlAction.DISCONNECT:
          await stopWhatsAppService();
          return { success: true, action };

        case ServiceControlAction.RESTART:
          await stopWhatsAppService();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await startWhatsAppService();
          return { success: true, action: ServiceControlAction.RESTART };

        default:
          contextLogger.warn(`Unknown service control action: ${action}`);
          return { success: false, error: 'Unknown action' };
      }
    } catch (err) {
      contextLogger.error('Service control failed:', err as Error);
      throw err;
    }
  }
}

export default WhatsAppWorker;

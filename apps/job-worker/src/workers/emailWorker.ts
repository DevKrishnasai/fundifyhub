import { Job } from 'bullmq';
import { BaseWorker } from './base-worker';
import { getTemplate } from '@fundifyhub/templates';
import { sendEmail } from '../services/email-service';
import { serviceManager } from '../services/service-manager';
import { ServiceControlJobData, ServiceControlAction } from '@fundifyhub/types';
import { startEmailService, stopEmailService } from '../services/email-service';
import { SimpleLogger } from '@fundifyhub/logger';

export class EmailWorker extends BaseWorker<any> {
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
      const contextLogger = this.logger.child('[email-worker]');
      contextLogger.error(`Template not found: ${templateName}`);
      throw new Error('Template not found');
    }

    try {
      const available = await serviceManager.isEmailAvailable();
      if (!available) {
        const contextLogger = this.logger.child(`[Job ${job.id}] [email-worker]`);
        contextLogger.warn('Email service not available - will retry automatically');
        // Throw error to trigger BullMQ's built-in retry mechanism
        throw new Error('Email service not available - will retry automatically');
      }
      const html = template.renderEmail ? await template.renderEmail(variables) : '';
      const to = variables.email || variables.recipient;
      const subject = variables.subject || `Notification: ${templateName}`;

      await sendEmail({ to, subject, html, text: '' });
      // Success - logged at completion
      return true;
    } catch (err) {
      const contextLogger = this.logger.child(`[Job ${job.id}] [email-worker]`);
      contextLogger.error(`Failed to process email job (template: ${data.templateName}, recipient: ${variables.email || variables.recipient}):`, err as Error);
      throw err;
    }
  }

  private async handleServiceControl(job: Job<any>, data: ServiceControlJobData): Promise<any> {
    const { action, serviceName } = data;
    const contextLogger = this.logger.child(`[Job ${job.id}] [email-service-control]`);

    try {
      switch (action) {
        case ServiceControlAction.START:
          await startEmailService();
          return { success: true, action: ServiceControlAction.START };

        case ServiceControlAction.STOP:
        case ServiceControlAction.DISCONNECT:
          await stopEmailService();
          return { success: true, action };

        case ServiceControlAction.RESTART:
          await stopEmailService();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await startEmailService();
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

export default EmailWorker;

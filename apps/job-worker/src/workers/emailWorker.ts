import { Job } from 'bullmq';
import { BaseWorker } from '../utils/base-worker-class';
import { sendEmail } from '../services/email-service';
import { serviceManager } from '../services/service-manager';
import { startEmailService, stopEmailService } from '../services/email-service';
import { SimpleLogger } from '@fundifyhub/logger';
import { AddJobType, AddServiceControlJobType, QUEUE_NAMES, SERVICE_CONTROL_ACTIONS, TEMPLATE_NAMES } from '@fundifyhub/types';
import { createEmailProcessor } from '../utils/template-processor';

export class EmailWorker extends BaseWorker<AddJobType<TEMPLATE_NAMES> | AddServiceControlJobType> {
  constructor(queueName: QUEUE_NAMES, logger: SimpleLogger) {
    super(queueName, logger);
  }

  protected async processJob(job: Job<AddJobType<TEMPLATE_NAMES> | AddServiceControlJobType>): Promise<{ success: boolean; error?: string; }> {
    const data = job.data;

    // Check if this is a service control job
    if ('action' in data) {
      return this.handleServiceControl(data);
    }

    // Otherwise, it's a regular email job
    const { templateName, variables } = data;

    try {
      const available = await serviceManager.isEmailAvailable();
      if (!available)
        throw new Error('Email service unavailable');

      const processor = createEmailProcessor(templateName);
      const { to, content, subject = '' } = await processor.process(variables);

      await sendEmail({ to, subject, html: content });

      return { success: true };
    } catch (err) {
      throw { success: false, error: (err as Error).message };
    }
  }

  private async handleServiceControl(data: AddServiceControlJobType): Promise<{ success: boolean; error?: string; action?: SERVICE_CONTROL_ACTIONS }> {
    const { action } = data;
    try {
      switch (action) {
        case SERVICE_CONTROL_ACTIONS.START:
          await startEmailService();
          return { success: true, action: SERVICE_CONTROL_ACTIONS.START };

        case SERVICE_CONTROL_ACTIONS.STOP:
        case SERVICE_CONTROL_ACTIONS.DISCONNECT:
          await stopEmailService();
          return { success: true, action };

        case SERVICE_CONTROL_ACTIONS.RESTART:
          await stopEmailService();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await startEmailService();
          return { success: true, action: SERVICE_CONTROL_ACTIONS.RESTART };

        default:
          return { success: false, error: 'Unknown action' };
      }
    } catch (err) {
      throw { success: false, error: (err as Error).message };
    }
  }
}

export default EmailWorker;

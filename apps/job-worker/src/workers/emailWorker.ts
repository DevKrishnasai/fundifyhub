import { Job } from 'bullmq';
import { BaseWorker } from '../utils/base-worker-class';
import { sendEmail } from '../services/email-service';
import { serviceManager } from '../services/service-manager';
import { startEmailService, stopEmailService } from '../services/email-service';
import { SimpleLogger } from '@fundifyhub/logger';
import { AddJobType, AddServiceControlJobType, QUEUE_NAMES, SERVICE_CONTROL_ACTIONS, TEMPLATE_NAMES, SERVICE_NAMES } from '@fundifyhub/types';
import { createEmailProcessor } from '../utils/template-processor';

export class EmailWorker extends BaseWorker<AddJobType<TEMPLATE_NAMES> | AddServiceControlJobType> {
  constructor(queueName: QUEUE_NAMES, logger: SimpleLogger) {
    super(queueName, logger);

    // Setup pause/resume lifecycle based on Email service availability
    // Delegate to an async helper for clarity and testability
    this.setupPauseResume(logger, queueName).catch((err) => {
      const ctx = logger.child(`[${queueName}]`);
      ctx.warn(String(err));
    });
  }

  /**
   * Setup logic to pause/resume the worker when the Email service becomes
   * unavailable/available. Separated from the constructor to keep the
   * constructor synchronous and the control flow easier to read.
   */
  private async setupPauseResume(logger: SimpleLogger, queueName: QUEUE_NAMES): Promise<void> {
    const contextLogger = logger.child(`[${queueName}]`);

    // On startup, if the service is unavailable, pause the worker so jobs
    // don't repeatedly fail. The periodic service-manager checks will emit
    // status changes and the registered listener will resume the worker.
    try {
      const available = await serviceManager.isEmailAvailable();
      if (!available) {
        contextLogger.info('Email service not available at startup — pausing worker until available');
        await this.worker.pause();
      }
    } catch (err) {
      contextLogger.warn(String(err));
    }

    // Subscribe to service-manager status changes and pause/resume the worker
    serviceManager.onServiceStatus(async ({ serviceName, available }) => {
      if (serviceName !== SERVICE_NAMES.EMAIL) return;

      if (available) {
        contextLogger.info('Email service became available — resuming worker');
        try {
          await this.worker.resume();
        } catch (e: any) {
          contextLogger.error(String(e));
        }
      } else {
        contextLogger.info('Email service became unavailable — pausing worker');
        try {
          await this.worker.pause();
        } catch (e: any) {
          contextLogger.error(String(e));
        }
      }
    });
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
      const msg = err instanceof Error ? err.message : (err ? JSON.stringify(err) : 'Unknown error')
      throw new Error(msg)
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
      const msg = err instanceof Error ? err.message : (err ? JSON.stringify(err) : 'Unknown error')
      throw new Error(msg)
    }
  }
}

export default EmailWorker;

import { Job } from 'bullmq';
import { BaseWorker } from '../utils/base-worker-class';
import { SimpleLogger } from '@fundifyhub/logger';
import { sendWhatsApp } from '../services/whatsapp-service';
import { serviceManager } from '../services/service-manager';
import { startWhatsAppService, stopWhatsAppService } from '../services/whatsapp-service';
import { AddJobType, AddServiceControlJobType, QUEUE_NAMES, SERVICE_CONTROL_ACTIONS, TEMPLATE_NAMES, SERVICE_NAMES } from '@fundifyhub/types';
import { createWhatsAppProcessor } from '../utils/template-processor';

export class WhatsAppWorker extends BaseWorker<AddJobType<TEMPLATE_NAMES> | AddServiceControlJobType> {
  constructor(queueName: QUEUE_NAMES, logger: SimpleLogger) {
    super(queueName, logger);

    // Delegate async pause/resume setup to a helper to keep constructor sync
    this.setupPauseResume(logger, queueName).catch((err) => {
      const ctx = logger.child(`[${queueName}]`);
      ctx.warn(String(err));
    });
  }

  /**
   * Setup logic to pause/resume the worker when the WhatsApp service
   * becomes unavailable/available. Separated from the constructor for
   * readability and testability.
   */
  private async setupPauseResume(logger: SimpleLogger, queueName: QUEUE_NAMES): Promise<void> {
    const contextLogger = logger.child(`[${queueName}]`);

    try {
      const available = await serviceManager.isWhatsAppAvailable();
      if (!available) {
        contextLogger.info('WhatsApp service not available at startup — pausing worker until available');
        await this.worker.pause();
      }
    } catch (err) {
      contextLogger.warn(String(err));
    }

    // Subscribe to service status events and pause/resume accordingly
    serviceManager.onServiceStatus(async ({ serviceName, available }) => {
      if (serviceName !== SERVICE_NAMES.WHATSAPP) return;

      if (available) {
        contextLogger.info('WhatsApp service became available — resuming worker');
        try {
          await this.worker.resume();
        } catch (e: any) {
          contextLogger.error(String(e));
        }
      } else {
        contextLogger.info('WhatsApp service became unavailable — pausing worker');
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

    // Otherwise, it's a regular WhatsApp job
    const { templateName, variables } = data;

    try {
      const available = await serviceManager.isWhatsAppAvailable();
      if (!available)
        throw new Error('WhatsApp service not available');

      const processor = createWhatsAppProcessor(templateName);
      const { to, content } = await processor.process(variables);

      await sendWhatsApp({ to, text: content });

      return { success: true };
    } catch (err) {
      // Normalize and throw an Error so upstream logging gets the message
      const msg = err instanceof Error ? err.message : (err ? JSON.stringify(err) : 'Unknown error')
      throw new Error(msg)
    }
  }

  private async handleServiceControl(data: AddServiceControlJobType): Promise<{ success: boolean; error?: string; action?: SERVICE_CONTROL_ACTIONS }> {
    const { action } = data;

    try {
      switch (action) {
        case SERVICE_CONTROL_ACTIONS.START:
          await startWhatsAppService();
          return { success: true, action: SERVICE_CONTROL_ACTIONS.START };

        case SERVICE_CONTROL_ACTIONS.STOP:
        case SERVICE_CONTROL_ACTIONS.DISCONNECT:
          await stopWhatsAppService();
          return { success: true, action };

        case SERVICE_CONTROL_ACTIONS.RESTART:
          await stopWhatsAppService();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await startWhatsAppService();
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

export default WhatsAppWorker;

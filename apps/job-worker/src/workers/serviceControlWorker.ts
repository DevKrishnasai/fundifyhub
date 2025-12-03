import { Job } from 'bullmq';
import { BaseWorker } from '../utils/base-worker-class';
import type { Logger } from '@fundifyhub/logger';
import { QUEUE_NAMES, SERVICE_NAMES, SERVICE_CONTROL_ACTIONS } from '@fundifyhub/types';
import type { ServiceControlJobData } from '@fundifyhub/utils/server';

/**
 * ServiceControlWorker
 *
 * Handles immediate service control actions like starting/stopping services.
 * This worker enables instant service management without waiting for periodic checks.
 */
export class ServiceControlWorker extends BaseWorker<ServiceControlJobData> {
  constructor(queueName: QUEUE_NAMES, logger: Logger) {
    super(queueName, logger);
  }

  protected async processJob(job: Job<ServiceControlJobData>): Promise<void> {
    const { serviceName, action, config } = job.data;
    const contextLogger = this.logger.child(`[service-control]`);

    contextLogger.info(`Processing service control: ${serviceName} -> ${action}`);

    try {
      switch (serviceName) {
        case SERVICE_NAMES.WHATSAPP:
          await this.handleWhatsAppControl(action, config, contextLogger);
          break;
        case SERVICE_NAMES.EMAIL:
          await this.handleEmailControl(action, config, contextLogger);
          break;
        default:
          contextLogger.warn(`Unknown service: ${serviceName}`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      contextLogger.error(`Service control failed for ${serviceName}:`, error);
      throw error;
    }
  }

  private async handleWhatsAppControl(action: SERVICE_CONTROL_ACTIONS, config: Record<string, unknown> | undefined, logger: Logger): Promise<void> {
    const { startWhatsAppService, stopWhatsAppService, sendWhatsApp } = await import('../services/whatsapp-service');

    switch (action) {
      case SERVICE_CONTROL_ACTIONS.START:
        logger.info('Starting WhatsApp service immediately');
        await startWhatsAppService();
        break;
      case SERVICE_CONTROL_ACTIONS.STOP:
      case SERVICE_CONTROL_ACTIONS.DISCONNECT:
        logger.info('Stopping WhatsApp service');
        await stopWhatsAppService();
        break;
      case SERVICE_CONTROL_ACTIONS.RESTART:
        logger.info('Restarting WhatsApp service');
        await stopWhatsAppService();
        await startWhatsAppService();
        break;
      case SERVICE_CONTROL_ACTIONS.TEST:
        logger.info('Testing WhatsApp service');
        const phoneNumber = config?.phoneNumber as string;
        if (!phoneNumber) {
          throw new Error('Phone number is required for WhatsApp test');
        }
        await sendWhatsApp({
          to: phoneNumber,
          text: '✅ FundifyHub WhatsApp Test\n\nYour WhatsApp service is working correctly!\n\nSent at: ' + new Date().toLocaleString(),
        });
        logger.info(`Test message sent to ${phoneNumber}`);
        break;
      default:
        logger.warn(`Unknown action for WhatsApp: ${action}`);
    }
  }

  private async handleEmailControl(
    action: SERVICE_CONTROL_ACTIONS,
    config: Record<string, unknown> | undefined,
    logger: Logger
  ): Promise<void> {
    const { startEmailService, stopEmailService } = await import('../services/email-service');

    switch (action) {
      case SERVICE_CONTROL_ACTIONS.START:
        logger.info('Starting Email service immediately');
        await startEmailService();
        break;
      case SERVICE_CONTROL_ACTIONS.STOP:
      case SERVICE_CONTROL_ACTIONS.DISCONNECT:
        logger.info('Stopping Email service');
        await stopEmailService();
        break;
      case SERVICE_CONTROL_ACTIONS.RESTART:
        logger.info('Restarting Email service');
        await stopEmailService();
        await startEmailService();
        break;
      default:
        logger.warn(`Unknown action for Email: ${action}`);
    }
  }
}

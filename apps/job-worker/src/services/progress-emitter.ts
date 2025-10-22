import { Queue } from 'bullmq';
import { createLogger } from '@fundifyhub/logger';
import { config } from '../config';

const logger = createLogger({ serviceName: 'progress-emitter' });

export interface ServiceStatusEvent {
  serviceName: 'WHATSAPP' | 'EMAIL';
  status: 'INITIALIZING' | 'WAITING_FOR_QR_SCAN' | 'AUTHENTICATED' | 'CONNECTED' | 'DISCONNECTED' | 'AUTH_FAILURE' | 'DISABLED' | 'TIMEOUT';
  message?: string;
  qrCode?: string; // Base64 QR code image
  qrText?: string; // QR code text
  timestamp: Date;
}

/**
 * Service to emit progress events through BullMQ
 * This allows the main-backend to receive real-time updates via QueueEvents
 */
class ProgressEmitter {
  private statusQueue: Queue<ServiceStatusEvent>;

  constructor() {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    // Create a dedicated queue for status updates
    this.statusQueue = new Queue('service-status', { connection });

    logger.info('Progress emitter initialized');
  }

  /**
   * Emit WhatsApp status update
   */
  async emitWhatsAppStatus(
    status: ServiceStatusEvent['status'],
    options?: {
      message?: string;
      qrCode?: string;
      qrText?: string;
    }
  ): Promise<void> {
    try {
      const event: ServiceStatusEvent = {
        serviceName: 'WHATSAPP',
        status,
        message: options?.message,
        qrCode: options?.qrCode,
        qrText: options?.qrText,
        timestamp: new Date()
      };

      // Add as a job with progress reporting
      const job = await this.statusQueue.add('status-update', event, {
        removeOnComplete: true,
        removeOnFail: false
      });

      // Immediately update progress to trigger event
      await job.updateProgress(event);

      logger.info(`📡 Emitted WhatsApp status: ${status}`);
    } catch (error) {
      logger.error('Error emitting WhatsApp status:', error as Error);
    }
  }

  /**
   * Emit Email status update
   */
  async emitEmailStatus(
    status: ServiceStatusEvent['status'],
    options?: {
      message?: string;
    }
  ): Promise<void> {
    try {
      const event: ServiceStatusEvent = {
        serviceName: 'EMAIL',
        status,
        message: options?.message,
        timestamp: new Date()
      };

      // Add as a job with progress reporting
      const job = await this.statusQueue.add('status-update', event, {
        removeOnComplete: true,
        removeOnFail: false
      });

      // Immediately update progress to trigger event
      await job.updateProgress(event);

      logger.info(`📡 Emitted Email status: ${status}`);
    } catch (error) {
      logger.error('Error emitting Email status:', error as Error);
    }
  }

  /**
   * Close queue
   */
  async close(): Promise<void> {
    await this.statusQueue.close();
    logger.info('Progress emitter closed');
  }
}

// Singleton instance
export const progressEmitter = new ProgressEmitter();
export default progressEmitter;

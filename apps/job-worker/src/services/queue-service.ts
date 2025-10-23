import { createLogger } from '@fundifyhub/logger';
import { Queue, QueueEvents } from 'bullmq';
import { appConfig } from '@fundifyhub/utils';

const logger = createLogger({ serviceName: 'job-worker-queue' });

// Redis connection configuration for BullMQ
const redisConnection = {
  host: appConfig.redis.host,
  port: appConfig.redis.port,
};

/**
 * Queue Service for Job Worker
 * Manages BullMQ queues for WhatsApp and Email events/status
 */
class QueueService {
  // Queues for sending events TO backend
  private whatsappEventsQueue: Queue;
  private emailEventsQueue: Queue;

  constructor() {
    // Initialize queues to send events to backend
    this.whatsappEventsQueue = new Queue('whatsapp-events', {
      connection: redisConnection,
    });

    this.emailEventsQueue = new Queue('email-events', {
      connection: redisConnection,
    });

    logger.info('✅ Job Worker Queue Service initialized with BullMQ');
  }

  /**
   * Publish WhatsApp event to main backend
   */
  async publishWhatsAppEvent(event: {
    type: 'QR_CODE' | 'AUTHENTICATED' | 'READY' | 'DISCONNECTED' | 'AUTH_FAILURE';
    data: {
      qrCode?: string;
      qrText?: string;
      message?: string;
      timestamp: Date;
      connectionStatus: string;
    };
  }): Promise<void> {
    try {
      await this.whatsappEventsQueue.add('whatsapp-event', event, {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
      });
      logger.info(`📡 Published WhatsApp event: ${event.type}`);
    } catch (error) {
      logger.error('Error publishing WhatsApp event:', error as Error);
    }
  }

  /**
   * Publish Email event to main backend
   */
  async publishEmailEvent(event: {
    type: 'READY' | 'ERROR' | 'DISCONNECTED';
    data: {
      message?: string;
      timestamp: Date;
      connectionStatus: string;
    };
  }): Promise<void> {
    try {
      await this.emailEventsQueue.add('email-event', event, {
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      logger.info(`📡 Published Email event: ${event.type}`);
    } catch (error) {
      logger.error('Error publishing Email event:', error as Error);
    }
  }

  /**
   * Close all queue connections
   */
  async close(): Promise<void> {
    await Promise.all([
      this.whatsappEventsQueue.close(),
      this.emailEventsQueue.close(),
    ]);
    logger.info('Job worker queue service connections closed');
  }
}

// Singleton instance
export const queueService = new QueueService();
export default queueService;

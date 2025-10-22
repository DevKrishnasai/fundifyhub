import { Queue } from 'bullmq';
import { createLogger } from '@fundifyhub/logger';
import { config } from '../config';

const logger = createLogger({ serviceName: 'service-control' });

export interface ServiceControlCommand {
  command: 'INITIALIZE' | 'DESTROY' | 'STATUS_CHECK';
  serviceName: 'WHATSAPP' | 'EMAIL';
  config?: any;
  timestamp: Date;
}

/**
 * Service to control WhatsApp and Email services via BullMQ
 */
class ServiceControlService {
  private controlQueue: Queue<ServiceControlCommand>;

  constructor() {
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
    };

    // Create a dedicated queue for service control commands
    this.controlQueue = new Queue('service-control', { connection });

    logger.info('Service control service initialized');
  }

  /**
   * Trigger WhatsApp initialization
   */
  async initializeWhatsApp(clientConfig?: any): Promise<void> {
    try {
      await this.controlQueue.add(
        'control-command',
        {
          command: 'INITIALIZE',
          serviceName: 'WHATSAPP',
          config: clientConfig,
          timestamp: new Date()
        },
        {
          removeOnComplete: 5,
          removeOnFail: 10
        }
      );

      logger.info('📡 WhatsApp initialization command queued');
    } catch (error) {
      logger.error('Error queueing WhatsApp initialization:', error as Error);
      throw error;
    }
  }

  /**
   * Trigger WhatsApp destruction
   */
  async destroyWhatsApp(): Promise<void> {
    try {
      await this.controlQueue.add(
        'control-command',
        {
          command: 'DESTROY',
          serviceName: 'WHATSAPP',
          timestamp: new Date()
        },
        {
          removeOnComplete: 5,
          removeOnFail: 10
        }
      );

      logger.info('📡 WhatsApp destruction command queued');
    } catch (error) {
      logger.error('Error queueing WhatsApp destruction:', error as Error);
      throw error;
    }
  }

  /**
   * Trigger Email initialization
   */
  async initializeEmail(smtpConfig?: any): Promise<void> {
    try {
      await this.controlQueue.add(
        'control-command',
        {
          command: 'INITIALIZE',
          serviceName: 'EMAIL',
          config: smtpConfig,
          timestamp: new Date()
        },
        {
          removeOnComplete: 5,
          removeOnFail: 10
        }
      );

      logger.info('📡 Email initialization command queued');
    } catch (error) {
      logger.error('Error queueing Email initialization:', error as Error);
      throw error;
    }
  }

  /**
   * Trigger Email destruction
   */
  async destroyEmail(): Promise<void> {
    try {
      await this.controlQueue.add(
        'control-command',
        {
          command: 'DESTROY',
          serviceName: 'EMAIL',
          timestamp: new Date()
        },
        {
          removeOnComplete: 5,
          removeOnFail: 10
        }
      );

      logger.info('📡 Email destruction command queued');
    } catch (error) {
      logger.error('Error queueing Email destruction:', error as Error);
      throw error;
    }
  }

  /**
   * Close control queue
   */
  async close(): Promise<void> {
    await this.controlQueue.close();
    logger.info('Service control service closed');
  }
}

// Singleton instance
export const serviceControlService = new ServiceControlService();
export default serviceControlService;

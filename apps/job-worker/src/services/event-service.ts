import { createLogger } from '@fundifyhub/logger';
import Redis from 'ioredis';
import { appConfig } from '@fundifyhub/utils';

const logger = createLogger({ serviceName: 'job-worker-events' });

export interface WhatsAppEvent {
  type: 'QR_CODE' | 'AUTHENTICATED' | 'READY' | 'DISCONNECTED' | 'AUTH_FAILURE';
  data: {
    qrCode?: string; // Base64 QR code image
    qrText?: string; // QR code text for manual scanning
    message?: string;
    timestamp: Date;
    connectionStatus: string;
  };
}

class JobWorkerEventService {
  private publisher: Redis;
  private subscriber: Redis;

  constructor() {
    this.publisher = new Redis({
      host: appConfig.redis.host,
      port: appConfig.redis.port
    });

    this.subscriber = new Redis({
      host: appConfig.redis.host,
      port: appConfig.redis.port
    });

    logger.info('Job worker event service initialized');
  }

  /**
   * Publish WhatsApp event to main backend
   */
  async publishWhatsAppEvent(event: WhatsAppEvent): Promise<void> {
    try {
      await this.publisher.publish('whatsapp-events', JSON.stringify(event));
      logger.info(`📡 Published WhatsApp event: ${event.type}`);
    } catch (error) {
      logger.error('Error publishing WhatsApp event:', error as Error);
    }
  }

  /**
   * Subscribe to WhatsApp commands from main backend
   */
  subscribeToWhatsAppCommands(callback: (command: { command: string; timestamp: Date }) => void): void {
    this.subscriber.subscribe('whatsapp-commands', (err: any) => {
      if (err) {
        logger.error('Error subscribing to WhatsApp commands:', err);
        return;
      }
      logger.info('📡 Subscribed to WhatsApp commands');
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === 'whatsapp-commands') {
        try {
          const command = JSON.parse(message);
          logger.info(`📨 Received WhatsApp command: ${command.command}`);
          callback(command);
        } catch (error) {
          logger.error('Error parsing WhatsApp command:', error as Error);
        }
      }
    });
  }

  /**
   * Subscribe to Email commands from main backend
   */
  subscribeToEmailCommands(callback: (command: { command: string; timestamp: Date }) => void): void {
    this.subscriber.subscribe('email-commands', (err: any) => {
      if (err) {
        logger.error('Error subscribing to Email commands:', err);
        return;
      }
      logger.info('📡 Subscribed to Email commands');
    });

    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === 'email-commands') {
        try {
          const command = JSON.parse(message);
          logger.info(`📨 Received Email command: ${command.command}`);
          callback(command);
        } catch (error) {
          logger.error('Error parsing Email command:', error as Error);
        }
      }
    });
  }

  /**
   * Close Redis connections
   */
  async close(): Promise<void> {
    await Promise.all([
      this.publisher.quit(),
      this.subscriber.quit()
    ]);
    logger.info('Job worker event service connections closed');
  }
}

// Singleton instance
export const jobWorkerEventService = new JobWorkerEventService();
export default jobWorkerEventService;
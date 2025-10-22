import { createLogger } from '@fundifyhub/logger';
import Redis from 'ioredis';
import { config } from '../config';

const logger = createLogger({ serviceName: 'event-service' });

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

class EventService {
  private redis: Redis;
  private publisher: Redis;
  private subscriber: Redis;

  constructor() {
    // Create Redis connections for pub/sub
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: 3
    });

    this.publisher = new Redis({
      host: config.redis.host,
      port: config.redis.port
    });

    this.subscriber = new Redis({
      host: config.redis.host,
      port: config.redis.port
    });

    logger.info('Event service initialized with Redis pub/sub');
  }

  /**
   * Publish WhatsApp event (called by job-worker)
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
   * Subscribe to WhatsApp events (called by main backend)
   */
  subscribeToWhatsAppEvents(callback: (event: WhatsAppEvent) => void): void {
    this.subscriber.subscribe('whatsapp-events', (err) => {
      if (err) {
        logger.error('Error subscribing to WhatsApp events:', err);
        return;
      }
      logger.info('📡 Subscribed to WhatsApp events');
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'whatsapp-events') {
        try {
          const event: WhatsAppEvent = JSON.parse(message);
          callback(event);
        } catch (error) {
          logger.error('Error parsing WhatsApp event:', error as Error);
        }
      }
    });
  }

  /**
   * Get current WhatsApp status from Redis cache
   */
  async getWhatsAppStatus(): Promise<{
    connectionStatus: string;
    lastQrCode?: string;
    lastUpdate: Date;
  } | null> {
    try {
      const statusData = await this.redis.get('whatsapp-status');
      return statusData ? JSON.parse(statusData) : null;
    } catch (error) {
      logger.error('Error getting WhatsApp status:', error as Error);
      return null;
    }
  }

  /**
   * Update WhatsApp status in Redis cache
   */
  async updateWhatsAppStatus(status: {
    connectionStatus: string;
    qrCode?: string;
    message?: string;
  }): Promise<void> {
    try {
      const statusData = {
        connectionStatus: status.connectionStatus,
        lastQrCode: status.qrCode,
        lastMessage: status.message,
        lastUpdate: new Date()
      };

      await this.redis.setex('whatsapp-status', 300, JSON.stringify(statusData)); // Cache for 5 minutes
      logger.info(`💾 Updated WhatsApp status cache: ${status.connectionStatus}`);
    } catch (error) {
      logger.error('Error updating WhatsApp status:', error as Error);
    }
  }

  /**
   * Generic publish method for any event
   */
  async publish(channel: string, data: any): Promise<void> {
    try {
      await this.publisher.publish(channel, JSON.stringify({
        ...data,
        timestamp: new Date()
      }));
      logger.info(`📡 Published event to channel: ${channel}`);
    } catch (error) {
      logger.error(`Error publishing to channel ${channel}:`, error as Error);
      throw error;
    }
  }

  /**
   * Trigger WhatsApp initialization (called by admin API)
   */
  async triggerWhatsAppInit(): Promise<void> {
    try {
      await this.publisher.publish('whatsapp-commands', JSON.stringify({
        command: 'INITIALIZE',
        timestamp: new Date()
      }));
      logger.info('📡 Triggered WhatsApp initialization');
    } catch (error) {
      logger.error('Error triggering WhatsApp init:', error as Error);
    }
  }

  /**
   * Trigger Email initialization (called by admin API)
   */
  async triggerEmailInit(): Promise<void> {
    try {
      await this.publisher.publish('email-commands', JSON.stringify({
        command: 'INITIALIZE',
        timestamp: new Date()
      }));
      logger.info('📡 Triggered Email initialization');
    } catch (error) {
      logger.error('Error triggering Email init:', error as Error);
    }
  }

  /**
   * Trigger WhatsApp service destruction (called by admin API)
   */
  async triggerWhatsAppDestroy(): Promise<void> {
    try {
      await this.publisher.publish('whatsapp-commands', JSON.stringify({
        command: 'DESTROY',
        timestamp: new Date()
      }));
      logger.info('📡 Triggered WhatsApp service destruction');
    } catch (error) {
      logger.error('Error triggering WhatsApp destroy:', error as Error);
    }
  }

  /**
   * Trigger Email service destruction (called by admin API)
   */
  async triggerEmailDestroy(): Promise<void> {
    try {
      await this.publisher.publish('email-commands', JSON.stringify({
        command: 'DESTROY',
        timestamp: new Date()
      }));
      logger.info('📡 Triggered Email service destruction');
    } catch (error) {
      logger.error('Error triggering Email destroy:', error as Error);
    }
  }

  /**
   * Subscribe to WhatsApp commands (called by job-worker)
   */
  subscribeToWhatsAppCommands(callback: (command: { command: string; timestamp: Date }) => void): void {
    this.subscriber.subscribe('whatsapp-commands', (err) => {
      if (err) {
        logger.error('Error subscribing to WhatsApp commands:', err);
        return;
      }
      logger.info('📡 Subscribed to WhatsApp commands');
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'whatsapp-commands') {
        try {
          const command = JSON.parse(message);
          callback(command);
        } catch (error) {
          logger.error('Error parsing WhatsApp command:', error as Error);
        }
      }
    });
  }

  /**
   * Close Redis connections
   */
  async close(): Promise<void> {
    await Promise.all([
      this.redis.quit(),
      this.publisher.quit(),
      this.subscriber.quit()
    ]);
    logger.info('Event service connections closed');
  }
}

// Singleton instance
export const eventService = new EventService();
export default eventService;
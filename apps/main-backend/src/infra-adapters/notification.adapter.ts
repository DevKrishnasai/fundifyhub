/**
 * Notification Adapter
 * 
 * Wraps @fundifyhub/providers/notifications for event-driven notifications.
 * Publishes domain events → job-worker consumes and routes to channels.
 * 
 * @module infra-adapters/notification
 */

import { createNotification } from '@fundifyhub/providers';
import { NotificationChannel } from '@fundifyhub/types';
import { eventBus } from '../domain/events';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@fundifyhub/types';
import type { NotificationJobData } from '@fundifyhub/utils/server';
import logger from '../utils/logger';

/**
 * Event-driven notification orchestrator wrapper
 * 
 * Pushes notification jobs to BullMQ queue for job-worker processing.
 */
export class NotificationAdapter {
  private notificationQueue: Queue<NotificationJobData>;

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');

    this.notificationQueue = new Queue<NotificationJobData>(QUEUE_NAMES.NOTIFICATION_QUEUE, {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    logger.info('[NotificationAdapter] Initialized with BullMQ queue', { queue: QUEUE_NAMES.NOTIFICATION_QUEUE });
  }
  /**
   * Publish domain event for notification processing
   * 
   * Pushes job to BullMQ queue for job-worker to process.
   * Maps domain events to notification templates and channels.
   * 
   * @example
   * ```ts
   * await notificationAdapter.publishEvent({
   *   eventType: 'request.created',
   *   userId: '123',
   *   metadata: { requestId: 'req_123', customerEmail: 'user@example.com' }
   * })
   * ```
   */
  async publishEvent(event: {
    eventType: string;
    userId: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      // Map event type to template and determine channels based on event type
      const { templateName, channels } = this.mapEventToNotification(event.eventType);

      // Create proper job data structure
      const jobData: NotificationJobData = {
        correlationId: `${event.eventType}-${event.userId}-${Date.now()}`,
        templateName,
        variables: event.metadata,
        channels,
        deliveryMode: 'INDEPENDENT' as any, // Try all channels independently
        priority: 'NORMAL' as any,
        recipient: {
          userId: event.userId,
          email: event.metadata.customerEmail || event.metadata.email,
          phoneNumber: event.metadata.customerPhone || event.metadata.phone,
          name: event.metadata.customerName || event.metadata.name,
        },
        metadata: {
          eventType: event.eventType,
          triggeredAt: new Date().toISOString(),
        },
      };

      // Push to BullMQ queue
      await this.notificationQueue.add('notification', jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      logger.info('[NotificationAdapter] Job queued', { eventType: event.eventType, userId: event.userId, template: templateName });

      // Also emit to local event bus for immediate in-process reactions
      eventBus.emit('notification.requested', {
        type: event.eventType,
        data: event.metadata,
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error('[NotificationAdapter] Failed to queue job', { error: err, eventType: event.eventType });
      // Don't re-throw - notifications are optional
    }
  }

  /**
   * Map domain event type to notification template and channels
   */
  private mapEventToNotification(eventType: string): { templateName: string; channels: NotificationChannel[] } {
    const mappings: Record<string, { templateName: string; channels: NotificationChannel[] }> = {
      'request.created': {
        templateName: 'request-created',
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      },
      'request.submitted': {
        templateName: 'request-submitted',
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      },
      'request.assigned': {
        templateName: 'request-assigned',
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
      },
      'loan.disbursed': {
        templateName: 'loan-disbursed',
        channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP, NotificationChannel.IN_APP],
      },
      'payment.recorded': {
        templateName: 'payment-received',
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
      },
      'payment.failed': {
        templateName: 'payment-failed',
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
      },
    };

    return mappings[eventType] || {
      templateName: 'generic-notification',
      channels: [NotificationChannel.IN_APP],
    };
  }

  /**
   * Send direct notification (bypass event system)
   * 
   * Use only for critical notifications that can't wait for async processing.
   */
  async sendDirect(
    recipientContact: string,
    channel: 'email' | 'whatsapp' | 'sms' | 'push' | 'in-app',
    message: string
  ): Promise<void> {
    try {
      // Map channel name to NotificationChannel enum
      const channelMap: Record<string, NotificationChannel> = {
        email: NotificationChannel.EMAIL,
        whatsapp: NotificationChannel.WHATSAPP,
        sms: NotificationChannel.SMS,
        push: NotificationChannel.PUSH,
        'in-app': NotificationChannel.IN_APP,
      };

      const jobData: NotificationJobData = {
        correlationId: `direct-${channel}-${recipientContact}-${Date.now()}`,
        templateName: 'plain-text', // Use plain text template for direct messages
        variables: { message },
        channels: [channelMap[channel]],
        deliveryMode: 'SINGLE' as any,
        priority: 'HIGH' as any,
        recipient: {
          [channel === 'email' ? 'email' : 'phoneNumber']: recipientContact,
        },
        metadata: {
          direct: true,
          triggeredAt: new Date().toISOString(),
        },
      };

      await this.notificationQueue.add(`direct-${channel}`, jobData, {
        priority: 1,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      logger.info('[NotificationAdapter] Direct notification queued', {
        recipient: recipientContact,
        channel: channelMap[channel],
      });
    } catch (err) {
      logger.error('[NotificationAdapter] Failed to queue direct notification', { error: err, channel });
      // Don't re-throw - notifications are optional
    }
  }

  /**
   * Send email directly (synchronous path)
   * 
   * Use for critical emails that need immediate delivery.
   */
  async sendEmail(
    toEmail: string,
    templateName: string,
    variables: Record<string, any>
  ): Promise<void> {
    try {
      // Create job data for immediate email delivery
      const jobData: NotificationJobData = {
        correlationId: `email-direct-${toEmail}-${Date.now()}`,
        templateName,
        variables,
        channels: [NotificationChannel.EMAIL],
        deliveryMode: 'SINGLE' as any,
        priority: 'HIGH' as any,
        recipient: {
          email: toEmail,
          name: variables.customerName || variables.name,
          userId: variables.userId,
        },
        metadata: {
          direct: true,
          triggeredAt: new Date().toISOString(),
        },
      };

      // Push to queue with high priority
      await this.notificationQueue.add('email-direct', jobData, {
        priority: 1, // High priority
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      logger.info('[NotificationAdapter] Email queued', { toEmail, template: templateName });
    } catch (err) {
      logger.error('[NotificationAdapter] Failed to queue email', { error: err, toEmail });
    }
  }

  /**
   * Send WhatsApp message
   * 
   * Uses notification provider's WhatsApp channel.
   * 
   * @param phoneNumber - Recipient phone number (with country code)
   * @param templateName - WhatsApp template name
   * @param variables - Template variables
   */
  async sendWhatsApp(
    phoneNumber: string,
    templateName: string,
    variables: Record<string, any>
  ): Promise<void> {
    try {
      // Import WhatsApp channel from providers
      const { notificationChannels } = await import('@fundifyhub/providers/dist/notifications');

      // Send via WhatsApp channel
      await notificationChannels.whatsapp.send({
        to: phoneNumber,
        template: templateName,
        variables,
      });

      logger.info('[NotificationAdapter] WhatsApp sent', { phoneNumber, template: templateName });
    } catch (err) {
      logger.error('[NotificationAdapter] Failed to send WhatsApp', { error: err, phoneNumber });
      throw err;
    }
  }

  /**
   * Send SMS
   * 
   * Uses notification provider's SMS channel.
   * 
   * @param phoneNumber - Recipient phone number (with country code)
   * @param message - SMS message text
   */
  async sendSMS(phoneNumber: string, message: string): Promise<void> {
    try {
      // Import SMS channel from providers
      const { notificationChannels } = await import('@fundifyhub/providers/dist/notifications');

      // Send via SMS channel
      await notificationChannels.sms.send({
        to: phoneNumber,
        message,
      });

      logger.info('[NotificationAdapter] SMS sent', { phoneNumber });
    } catch (err) {
      logger.error('[NotificationAdapter] Failed to send SMS', { error: err, phoneNumber });
      throw err;
    }
  }

  /**
   * Send push notification
   * 
   * Uses notification provider's push channel.
   * Fetches user's device tokens from database and sends to all devices.
   * 
   * @param userId - User ID to send push notification to
   * @param title - Notification title
   * @param message - Notification message
   */
  async sendPush(userId: string, title: string, message: string): Promise<void> {
    try {
      // Import push channel from providers
      const { notificationChannels } = await import('@fundifyhub/providers/dist/notifications');

      // Get user's device tokens from database
      // TODO: Add DeviceToken model to Prisma schema
      // For now, using stub
      const deviceTokens: string[] = [];

      if (deviceTokens.length === 0) {
        logger.warn('[NotificationAdapter] No device tokens found for user', { userId });
        return;
      }

      // Send via push channel
      await notificationChannels.push.send({
        deviceTokens,
        title,
        message,
        data: {
          userId,
        },
      });

      logger.info('[NotificationAdapter] Push notification sent', { userId, deviceCount: deviceTokens.length });
    } catch (err) {
      logger.error('[NotificationAdapter] Failed to send push notification', { error: err, userId });
      throw err;
    }
  }
}

export const notificationAdapter = new NotificationAdapter();

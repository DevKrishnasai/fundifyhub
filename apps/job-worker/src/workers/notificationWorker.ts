import { Job } from 'bullmq';
import { BaseWorker } from '../utils/base-worker-class';
import type { Logger } from '@fundifyhub/logger';
import { QUEUE_NAMES, NotificationChannel, SERVICE_NAMES } from '@fundifyhub/types';
import {
  sendNotification,
  type NotificationRequest,
} from '../services/notification-dispatcher';
import type { NotificationJobData } from '@fundifyhub/utils/server';
import { serviceManager } from '../services/service-manager';

/**
 * NotificationWorker
 *
 * Unified worker for processing all notification jobs.
 * This worker:
 * - Processes jobs from the NOTIFICATION_QUEUE
 * - Uses simple notification dispatcher for multi-channel delivery
 * - Handles Email, WhatsApp, and In-App notifications
 */
export class NotificationWorker extends BaseWorker<NotificationJobData> {
  constructor(queueName: QUEUE_NAMES, logger: Logger) {
    super(queueName, logger);

    // Setup pause/resume based on service availability
    this.setupServiceAvailabilityHandler(logger, queueName).catch((err) => {
      const ctx = logger.child(`[${queueName}]`);
      ctx.warn(String(err));
    });
  }

  /**
   * Setup pause/resume based on service availability
   * 
   * NOTE: Worker should NEVER pause because In-App notifications are always available
   * as long as the database is up. Email/WhatsApp availability only affects those channels.
   */
  private async setupServiceAvailabilityHandler(logger: Logger, queueName: QUEUE_NAMES): Promise<void> {
    const contextLogger = logger.child(`[${queueName}]`);

    // Log service status changes for monitoring, but don't pause the worker
    // In-App notifications are always available when the database is up
    serviceManager.onServiceStatus(async ({ serviceName, available }) => {
      // Only care about email and whatsapp services
      if (serviceName !== SERVICE_NAMES.EMAIL && serviceName !== SERVICE_NAMES.WHATSAPP) {
        return;
      }

      // Check channel availability for logging
      const emailAvailable = await serviceManager.isEmailAvailable().catch(() => false);
      const whatsAppAvailable = await serviceManager.isWhatsAppAvailable().catch(() => false);

      contextLogger.info(`Service status update: ${serviceName}=${available ? 'available' : 'unavailable'}`, {
        email: emailAvailable,
        whatsapp: whatsAppAvailable,
        // In-App is always available when DB is up
        inApp: true,
      });

      // Ensure worker is running - In-App is always available
      try {
        await this.worker.resume();
      } catch (e) {
        // Ignore if already running
      }
    });
  }

  /**
   * Process notification jobs
   */
  protected async processJob(job: Job<NotificationJobData>): Promise<{ success: boolean; error?: string }> {
    const data = job.data;
    const contextLogger = this.logger.child(`[Job ${job.id}] [${this.queueName}]`);

    try {
      // Check if notification has expired
      if (data.expiresAt) {
        const expiryTime = new Date(data.expiresAt).getTime();
        if (Date.now() > expiryTime) {
          contextLogger.warn(`Notification expired: ${data.correlationId}`);
          return { success: false, error: 'Notification expired' };
        }
      }

      // Build notification request
      const request: NotificationRequest = {
        correlationId: data.correlationId,
        templateName: data.templateName,
        variables: data.variables,
        channels: data.channels,
        deliveryMode: data.deliveryMode,
        priority: data.priority,
        recipient: data.recipient,
        metadata: {
          ...data.metadata,
          jobId: job.id,
          attemptNumber: job.attemptsMade + 1,
        },
      };

      // Check channel availability and filter channels
      const availableChannels = await this.getAvailableChannels(data.channels);
      if (availableChannels.length === 0) {
        throw new Error('No channels available for delivery');
      }

      // Update request with available channels
      request.channels = availableChannels;

      // Send notification using simple dispatcher
      const result = await sendNotification(request);

      if (result.success) {
        contextLogger.info(`Notification sent successfully: ${data.correlationId}`);
        return { success: true };
      } else {
        const failedChannels = result.channelResults
          .filter(r => r.status !== 'SENT')
          .map(r => `${r.channel}: ${r.error}`)
          .join(', ');

        // Check if only in-app notifications failed - these are often due to data issues
        // and shouldn't fail the entire notification job if other channels succeeded
        const inAppFailures = result.channelResults.filter(r => 
          r.channel === 'IN_APP' && r.status !== 'SENT'
        );
        const otherChannelSuccesses = result.channelResults.filter(r => 
          r.channel !== 'IN_APP' && r.status === 'SENT'
        );

        // If in-app failed but other channels succeeded, consider it a success
        if (inAppFailures.length > 0 && otherChannelSuccesses.length > 0) {
          contextLogger.warn(`In-app notification failed but other channels succeeded: ${failedChannels}`);
          return { success: true };
        }

        // If all channels failed, or only in-app was attempted and failed
        throw new Error(`Failed to send to some channels: ${failedChannels}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      contextLogger.error(`Failed to process notification: ${msg}`);
      throw new Error(msg);
    }
  }

  /**
   * Get available channels from the requested channels
   */
  private async getAvailableChannels(requestedChannels: NotificationChannel[]): Promise<NotificationChannel[]> {
    const available: NotificationChannel[] = [];

    for (const channel of requestedChannels) {
      switch (channel) {
        case NotificationChannel.EMAIL:
          if (await serviceManager.isEmailAvailable().catch(() => false)) {
            available.push(channel);
          }
          break;
        case NotificationChannel.WHATSAPP:
          if (await serviceManager.isWhatsAppAvailable().catch(() => false)) {
            available.push(channel);
          }
          break;
        case NotificationChannel.IN_APP:
          // In-app is always available if database is up
          available.push(channel);
          break;
        // SMS and PUSH not yet implemented
        default:
          break;
      }
    }

    return available;
  }

  /**
   * Higher concurrency for notification processing
   */
  protected getConcurrency(): number {
    return 5;
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    await super.close();
  }
}

export default NotificationWorker;

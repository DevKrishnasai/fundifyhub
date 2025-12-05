/**
 * Notification Service
 *
 * The main entry point for sending notifications across multiple channels.
 * Handles:
 * - Multi-channel delivery (Email, WhatsApp, SMS, Push, In-App)
 * - Three delivery modes: BROADCAST, INDEPENDENT, FALLBACK, SINGLE
 * - Automatic retry with exponential backoff
 * - Notification logging and tracking
 * - User preference management
 * - Template rendering
 */

import { createLogger } from '@fundifyhub/logger';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  DeliveryMode,
  BackoffStrategy,
  type NotificationRequest,
  type NotificationResult,
  type ChannelDeliveryResult,
  type RetryConfig,
  DEFAULT_RETRY_CONFIGS,
} from '@fundifyhub/types';
import TEMPLATE_REGISTRY from './templates';
import { getEmailAdapter } from './channel-adapters/email-adapter';
import { getWhatsAppAdapter } from './channel-adapters/whatsapp-adapter';
import { getInAppAdapter } from './channel-adapters/in-app-adapter';
import type { IChannelAdapter, ChannelSendParams } from './channel-adapters/base-adapter';

const logger = createLogger({ serviceName: 'NotificationService' });

/** Service configuration */
export interface NotificationServiceConfig {
  /** Enable/disable specific channels globally */
  enabledChannels?: NotificationChannel[];
  /** Whether to respect user preferences (quiet hours, etc.) */
  respectUserPreferences?: boolean;
  /** Dry run mode - log but don't actually send */
  dryRun?: boolean;
  /** Default retry configuration override */
  defaultRetryConfig?: Partial<RetryConfig>;
}

/**
 * Main Notification Service
 *
 * @example
 * ```typescript
 * const notificationService = NotificationService.getInstance();
 *
 * // Simple email
 * await notificationService.send({
 *   templateName: 'WELCOME',
 *   recipient: { email: 'user@example.com', name: 'John' },
 *   variables: { userName: 'John', companyName: 'FundifyHub' },
 *   channels: [NotificationChannel.EMAIL],
 * });
 *
 * // OTP with independent mode (different OTP per channel)
 * await notificationService.send({
 *   templateName: 'OTP_VERIFICATION',
 *   recipient: { email: 'user@example.com', phoneNumber: '+919876543210' },
 *   variables: { /* base variables *\/ },
 *   channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
 *   deliveryMode: DeliveryMode.INDEPENDENT,
 *   variableGenerator: (channel) => ({
 *     ...baseVars,
 *     otpCode: generateOTP(), // Different OTP per channel
 *   }),
 * });
 * ```
 */
export class NotificationService {
  private static instance: NotificationService | null = null;
  private config: NotificationServiceConfig;
  private adapters: Map<NotificationChannel, IChannelAdapter>;
  private initialized = false;

  private constructor(config: NotificationServiceConfig = {}) {
    this.config = {
      enabledChannels: [
        NotificationChannel.EMAIL,
        NotificationChannel.WHATSAPP,
        NotificationChannel.IN_APP,
      ],
      respectUserPreferences: true,
      dryRun: false,
      ...config,
    };
    this.adapters = new Map();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: NotificationServiceConfig): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(config);
    }
    return NotificationService.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    NotificationService.instance = null;
  }

  /**
   * Initialize the service and all adapters
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing notification service...');

    // Initialize adapters for enabled channels
    const initPromises: Promise<void>[] = [];

    if (this.config.enabledChannels?.includes(NotificationChannel.EMAIL)) {
      const emailAdapter = getEmailAdapter();
      initPromises.push(emailAdapter.initialize().then(() => {
        this.adapters.set(NotificationChannel.EMAIL, emailAdapter);
      }));
    }

    if (this.config.enabledChannels?.includes(NotificationChannel.WHATSAPP)) {
      const whatsAppAdapter = getWhatsAppAdapter();
      initPromises.push(whatsAppAdapter.initialize().then(() => {
        this.adapters.set(NotificationChannel.WHATSAPP, whatsAppAdapter);
      }));
    }

    if (this.config.enabledChannels?.includes(NotificationChannel.IN_APP)) {
      const inAppAdapter = getInAppAdapter();
      initPromises.push(inAppAdapter.initialize().then(() => {
        this.adapters.set(NotificationChannel.IN_APP, inAppAdapter);
      }));
    }

    if (this.config.enabledChannels?.includes(NotificationChannel.PUSH)) {
      const { getPushAdapter } = await import('./channel-adapters/push-adapter');
      const pushAdapter = getPushAdapter();
      initPromises.push(pushAdapter.initialize().then(() => {
        this.adapters.set(NotificationChannel.PUSH, pushAdapter);
      }));
    }

    await Promise.all(initPromises);

    this.initialized = true;
    logger.info(`Notification service initialized with ${this.adapters.size} channels`);
  }

  /**
   * Send a notification
   */
  async send<T extends string>(request: NotificationRequest<T>): Promise<NotificationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const correlationId = request.correlationId || this.generateCorrelationId();
    const channelResults: ChannelDeliveryResult[] = [];

    logger.info(`[${correlationId}] Processing notification: template=${request.templateName}, mode=${request.deliveryMode || 'BROADCAST'}`);

    // Check dry run mode
    if (this.config.dryRun) {
      logger.info(`[${correlationId}] DRY RUN - Would send to channels: ${request.channels.join(', ')}`);
      return {
        correlationId,
        success: true,
        channelResults: request.channels.map(channel => ({
          channel,
          status: NotificationStatus.SENT,
          messageId: `dry_run_${channel}_${Date.now()}`,
          lastAttemptAt: new Date().toISOString(),
          attempts: 1,
        })),
      };
    }

    // Filter to enabled channels
    const targetChannels = request.channels.filter(ch =>
      this.config.enabledChannels?.includes(ch) && this.adapters.has(ch)
    );

    if (targetChannels.length === 0) {
      return {
        correlationId,
        success: false,
        channelResults: [],
        error: 'No enabled channels available for this notification',
      };
    }

    // Get template
    const template = this.getTemplate(request.templateName);
    if (!template) {
      return {
        correlationId,
        success: false,
        channelResults: [],
        error: `Template not found: ${request.templateName}`,
      };
    }

    // Process based on delivery mode
    const deliveryMode = request.deliveryMode || DeliveryMode.BROADCAST;

    switch (deliveryMode) {
      case DeliveryMode.BROADCAST:
        // Same content to all channels
        for (const channel of targetChannels) {
          const result = await this.sendToChannel(
            channel,
            request,
            request.variables,
            correlationId
          );
          channelResults.push(result);
        }
        break;

      case DeliveryMode.INDEPENDENT:
        // Generate unique content/variables per channel
        for (const channel of targetChannels) {
          let variables = request.variables;
          if (request.variableGenerator) {
            variables = await request.variableGenerator(channel, request.variables);
          }
          const result = await this.sendToChannel(channel, request, variables, correlationId);
          channelResults.push(result);
        }
        break;

      case DeliveryMode.FALLBACK:
        // Try channels in order, stop on first success
        for (const channel of targetChannels) {
          const result = await this.sendToChannel(
            channel,
            request,
            request.variables,
            correlationId
          );
          channelResults.push(result);
          if (result.status === NotificationStatus.SENT) {
            break;
          }
        }
        break;

      case DeliveryMode.SINGLE:
        // Send to first channel only
        if (targetChannels.length > 0) {
          const result = await this.sendToChannel(
            targetChannels[0],
            request,
            request.variables,
            correlationId
          );
          channelResults.push(result);
        }
        break;
    }

    // Determine overall success based on mode
    const success = this.evaluateSuccess(deliveryMode, channelResults);

    logger.info(`[${correlationId}] Notification complete: success=${success}, channels=${channelResults.length}`);

    return {
      correlationId,
      success,
      channelResults,
    };
  }

  /**
   * Send to a specific channel
   */
  private async sendToChannel<T extends string>(
    channel: NotificationChannel,
    request: NotificationRequest<T>,
    variables: Record<string, unknown>,
    correlationId: string
  ): Promise<ChannelDeliveryResult> {
    const adapter = this.adapters.get(channel);
    if (!adapter || !adapter.isAvailable) {
      return {
        channel,
        status: NotificationStatus.FAILED,
        error: `Channel ${channel} not available`,
        lastAttemptAt: new Date().toISOString(),
        attempts: 0,
      };
    }

    try {
      // Render content for this channel
      const renderedContent = await this.renderTemplate(
        request.templateName,
        channel,
        variables
      );

      if (!renderedContent) {
        return {
          channel,
          status: NotificationStatus.FAILED,
          error: `Template ${request.templateName} does not support channel ${channel}`,
          errorCode: 'unsupported_channel',
          lastAttemptAt: new Date().toISOString(),
          attempts: 0,
        };
      }

      // Get recipient for this channel
      const recipient = this.getRecipientForChannel(channel, request.recipient);
      if (!recipient) {
        return {
          channel,
          status: NotificationStatus.FAILED,
          error: `No recipient info for channel ${channel}`,
          errorCode: 'missing_recipient',
          lastAttemptAt: new Date().toISOString(),
          attempts: 0,
        };
      }

      // Prepare send params
      const sendParams: ChannelSendParams & { userId?: string; title?: string; actionUrl?: string; requestId?: string } = {
        recipient,
        subject: renderedContent.subject,
        content: renderedContent.plainText || renderedContent.content,
        htmlContent: renderedContent.content,
        priority: request.priority || NotificationPriority.NORMAL,
        metadata: {
          correlationId,
          templateName: request.templateName,
          ...request.metadata,
        },
      };

      // For in-app notifications, pass additional required properties
      if (channel === NotificationChannel.IN_APP) {
        sendParams.userId = request.recipient.userId;
        sendParams.title = renderedContent.subject || request.templateName;
        sendParams.actionUrl = (variables.link as string) || (variables.dashboardUrl as string);
        sendParams.requestId = (variables.requestId as string) || undefined;
      }

      // Send through adapter
      const result = await adapter.send(sendParams);

      logger.info(`[${correlationId}] Sent to ${channel}: success=${result.success}`);

      return {
        channel,
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        messageId: result.messageId,
        error: result.error,
        errorCode: result.errorCode,
        lastAttemptAt: result.timestamp.toISOString(),
        attempts: 1,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[${correlationId}] Error sending to ${channel}: ${errorMessage}`);

      return {
        channel,
        status: NotificationStatus.FAILED,
        error: errorMessage,
        lastAttemptAt: new Date().toISOString(),
        attempts: 1,
      };
    }
  }

  /**
   * Render template content for a specific channel
   */
  private async renderTemplate(
    templateName: string,
    channel: NotificationChannel,
    variables: Record<string, unknown>
  ): Promise<{ content: string; subject?: string; plainText?: string } | null> {
    const template = this.getTemplate(templateName);
    if (!template) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vars = variables as any;

    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          if (template.renderEmail) {
            const html = await template.renderEmail(vars);
            const subject = template.getSubject?.(vars) || '';
            return { content: html, subject };
          }
          break;

        case NotificationChannel.WHATSAPP:
        case NotificationChannel.SMS:
          if (template.renderWhatsApp) {
            const text = await template.renderWhatsApp(vars);
            return { content: text, plainText: text };
          }
          break;

        case NotificationChannel.IN_APP:
          // For in-app, use WhatsApp text or email subject as content
          if (template.renderWhatsApp) {
            const text = await template.renderWhatsApp(vars);
            return { content: text };
          }
          if (template.getSubject) {
            return { content: template.getSubject(vars) };
          }
          break;
      }
    } catch (error) {
      logger.error(`Error rendering template ${templateName} for ${channel}: ${error}`);
    }

    return null;
  }

  /**
   * Get template from registry
   */
  private getTemplate(templateName: string): (typeof TEMPLATE_REGISTRY)[keyof typeof TEMPLATE_REGISTRY] | null {
    return (TEMPLATE_REGISTRY as Record<string, (typeof TEMPLATE_REGISTRY)[keyof typeof TEMPLATE_REGISTRY]>)[templateName] || null;
  }

  /**
   * Get recipient identifier for a specific channel
   */
  private getRecipientForChannel(
    channel: NotificationChannel,
    recipient: NotificationRequest['recipient']
  ): string | null {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return recipient.email || null;
      case NotificationChannel.WHATSAPP:
      case NotificationChannel.SMS:
        return recipient.phoneNumber || null;
      case NotificationChannel.PUSH:
        return recipient.deviceToken || null;
      case NotificationChannel.IN_APP:
        return recipient.userId || null;
      default:
        return null;
    }
  }

  /**
   * Evaluate overall success based on delivery mode
   */
  private evaluateSuccess(mode: DeliveryMode, results: ChannelDeliveryResult[]): boolean {
    if (results.length === 0) return false;

    const successCount = results.filter(r => r.status === NotificationStatus.SENT).length;

    switch (mode) {
      case DeliveryMode.BROADCAST:
        // All channels must succeed
        return successCount === results.length;

      case DeliveryMode.INDEPENDENT:
        // At least one channel must succeed
        return successCount > 0;

      case DeliveryMode.FALLBACK:
        // At least one channel must succeed (we stop on first success)
        return successCount > 0;

      case DeliveryMode.SINGLE:
        // The single channel must succeed
        return successCount === 1;

      default:
        return successCount > 0;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attemptNumber: number, config: RetryConfig): number {
    let delay: number;

    switch (config.backoffStrategy) {
      case BackoffStrategy.FIXED:
        delay = config.initialDelay;
        break;

      case BackoffStrategy.LINEAR:
        delay = config.initialDelay * attemptNumber;
        break;

      case BackoffStrategy.EXPONENTIAL:
      default:
        delay = config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1);
        break;
    }

    // Apply max delay cap
    delay = Math.min(delay, config.maxDelay);

    // Apply jitter
    if (config.jitter > 0) {
      const jitterRange = delay * config.jitter;
      delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
    }

    return Math.round(delay);
  }

  /**
   * Get retry configuration for a priority level
   */
  getRetryConfig(priority: NotificationPriority, override?: Partial<RetryConfig>): RetryConfig {
    const baseConfig = DEFAULT_RETRY_CONFIGS[priority] || DEFAULT_RETRY_CONFIGS[NotificationPriority.NORMAL];
    return { ...baseConfig, ...this.config.defaultRetryConfig, ...override };
  }

  /**
   * Generate a correlation ID
   */
  private generateCorrelationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Shutdown all adapters
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down notification service...');

    const shutdownPromises: Promise<void>[] = [];
    for (const adapter of this.adapters.values()) {
      shutdownPromises.push(adapter.shutdown());
    }

    await Promise.all(shutdownPromises);
    this.adapters.clear();
    this.initialized = false;

    logger.info('Notification service shutdown complete');
  }

  /**
   * Health check for all channels
   */
  async healthCheck(): Promise<Record<NotificationChannel, boolean>> {
    const results: Partial<Record<NotificationChannel, boolean>> = {};

    for (const [channel, adapter] of this.adapters) {
      try {
        results[channel] = await adapter.healthCheck();
      } catch {
        results[channel] = false;
      }
    }

    return results as Record<NotificationChannel, boolean>;
  }
}

/** Export singleton accessor */
export const getNotificationService = NotificationService.getInstance;

export default NotificationService;

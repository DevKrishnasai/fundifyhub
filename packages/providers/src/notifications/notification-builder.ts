/**
 * Notification Builder
 *
 * Fluent builder pattern for constructing notification requests.
 * Provides type-safe, intuitive API for creating notifications.
 */

import {
  NotificationChannel,
  NotificationPriority,
  NotificationCategory,
  DeliveryMode,
  type NotificationRequest,
  type NotificationRecipient,
  type ChannelOptions,
  type RetryConfig,
} from '@fundifyhub/types';

/**
 * Builder for creating notification requests with fluent API
 *
 * @example
 * ```typescript
 * const notification = new NotificationBuilder('OTP_VERIFICATION')
 *   .to({ email: 'user@example.com', phoneNumber: '+919876543210' })
 *   .withVariables({ otpCode: '123456', expiresInMinutes: 10 })
 *   .viaChannels([NotificationChannel.EMAIL, NotificationChannel.WHATSAPP])
 *   .withMode(DeliveryMode.INDEPENDENT) // Different OTP per channel
 *   .withPriority(NotificationPriority.HIGH)
 *   .build();
 * ```
 */
export class NotificationBuilder<T extends string = string> {
  private request: Partial<NotificationRequest<T>>;

  constructor(templateName: T) {
    this.request = {
      templateName,
      channels: [],
      deliveryMode: DeliveryMode.BROADCAST,
      priority: NotificationPriority.NORMAL,
    };
  }

  /**
   * Set the recipient
   */
  to(recipient: NotificationRecipient): this {
    this.request.recipient = recipient;
    return this;
  }

  /**
   * Shorthand: Set recipient by email
   */
  toEmail(email: string, name?: string): this {
    this.request.recipient = { email, name };
    return this;
  }

  /**
   * Shorthand: Set recipient by phone
   */
  toPhone(phoneNumber: string, name?: string): this {
    this.request.recipient = { phoneNumber, name };
    return this;
  }

  /**
   * Shorthand: Set recipient by user ID
   */
  toUser(userId: string, name?: string): this {
    this.request.recipient = { userId, name };
    return this;
  }

  /**
   * Set template variables
   */
  withVariables(variables: Record<string, unknown>): this {
    this.request.variables = variables;
    return this;
  }

  /**
   * Set delivery channels
   */
  viaChannels(channels: NotificationChannel[]): this {
    this.request.channels = channels;
    return this;
  }

  /**
   * Shorthand: Send via email only
   */
  viaEmail(): this {
    this.request.channels = [NotificationChannel.EMAIL];
    this.request.deliveryMode = DeliveryMode.SINGLE;
    return this;
  }

  /**
   * Shorthand: Send via WhatsApp only
   */
  viaWhatsApp(): this {
    this.request.channels = [NotificationChannel.WHATSAPP];
    this.request.deliveryMode = DeliveryMode.SINGLE;
    return this;
  }

  /**
   * Shorthand: Send via both email and WhatsApp
   */
  viaEmailAndWhatsApp(): this {
    this.request.channels = [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP];
    return this;
  }

  /**
   * Set delivery mode
   */
  withMode(mode: DeliveryMode): this {
    this.request.deliveryMode = mode;
    return this;
  }

  /**
   * Shorthand: Use broadcast mode (same content to all channels)
   */
  broadcast(): this {
    this.request.deliveryMode = DeliveryMode.BROADCAST;
    return this;
  }

  /**
   * Shorthand: Use independent mode (different content/OTP per channel)
   */
  independent(): this {
    this.request.deliveryMode = DeliveryMode.INDEPENDENT;
    return this;
  }

  /**
   * Shorthand: Use fallback mode (try channels in order)
   */
  withFallback(): this {
    this.request.deliveryMode = DeliveryMode.FALLBACK;
    return this;
  }

  /**
   * Set priority level
   */
  withPriority(priority: NotificationPriority): this {
    this.request.priority = priority;
    return this;
  }

  /**
   * Shorthand: Critical priority
   */
  critical(): this {
    this.request.priority = NotificationPriority.CRITICAL;
    return this;
  }

  /**
   * Shorthand: High priority
   */
  highPriority(): this {
    this.request.priority = NotificationPriority.HIGH;
    return this;
  }

  /**
   * Shorthand: Low priority
   */
  lowPriority(): this {
    this.request.priority = NotificationPriority.LOW;
    return this;
  }

  /**
   * Set category
   */
  withCategory(category: NotificationCategory): this {
    this.request.category = category;
    return this;
  }

  /**
   * Set channel-specific options
   */
  withChannelOptions(options: ChannelOptions): this {
    this.request.channelOptions = options;
    return this;
  }

  /**
   * Set email subject (convenience method)
   */
  withSubject(subject: string): this {
    this.request.channelOptions = {
      ...this.request.channelOptions,
      [NotificationChannel.EMAIL]: {
        ...this.request.channelOptions?.[NotificationChannel.EMAIL],
        subject,
      },
    };
    return this;
  }

  /**
   * Set custom retry configuration
   */
  withRetry(config: Partial<RetryConfig>): this {
    this.request.retryConfig = config;
    return this;
  }

  /**
   * Schedule for future delivery
   */
  scheduleAt(date: Date | string): this {
    this.request.scheduledAt = typeof date === 'string' ? date : date.toISOString();
    return this;
  }

  /**
   * Set expiry time
   */
  expiresAt(date: Date | string): this {
    this.request.expiresAt = typeof date === 'string' ? date : date.toISOString();
    return this;
  }

  /**
   * Set idempotency key to prevent duplicate sends
   */
  withIdempotencyKey(key: string): this {
    this.request.idempotencyKey = key;
    return this;
  }

  /**
   * Set correlation ID for tracking
   */
  withCorrelationId(id: string): this {
    this.request.correlationId = id;
    return this;
  }

  /**
   * Add metadata
   */
  withMetadata(metadata: Record<string, unknown>): this {
    this.request.metadata = { ...this.request.metadata, ...metadata };
    return this;
  }

  /**
   * Set variable generator for independent mode
   * Called for each channel to generate channel-specific variables
   */
  withVariableGenerator(
    generator: (channel: NotificationChannel, baseVariables: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>
  ): this {
    this.request.variableGenerator = generator;
    return this;
  }

  /**
   * Build and validate the notification request
   */
  build(): NotificationRequest<T> {
    // Validate required fields
    if (!this.request.templateName) {
      throw new Error('Template name is required');
    }
    if (!this.request.recipient) {
      throw new Error('Recipient is required');
    }
    if (!this.request.channels || this.request.channels.length === 0) {
      throw new Error('At least one channel is required');
    }
    if (!this.request.variables) {
      throw new Error('Template variables are required');
    }

    // Validate recipient has contact info for requested channels
    const recipient = this.request.recipient;
    for (const channel of this.request.channels) {
      if (channel === NotificationChannel.EMAIL && !recipient.email && !recipient.userId) {
        throw new Error('Email address or user ID is required for email channel');
      }
      if (channel === NotificationChannel.WHATSAPP && !recipient.phoneNumber && !recipient.userId) {
        throw new Error('Phone number or user ID is required for WhatsApp channel');
      }
      if (channel === NotificationChannel.SMS && !recipient.phoneNumber && !recipient.userId) {
        throw new Error('Phone number or user ID is required for SMS channel');
      }
      if (channel === NotificationChannel.PUSH && !recipient.deviceToken && !recipient.userId) {
        throw new Error('Device token or user ID is required for push channel');
      }
      if (channel === NotificationChannel.IN_APP && !recipient.userId) {
        throw new Error('User ID is required for in-app channel');
      }
    }

    // Generate correlation ID if not provided
    if (!this.request.correlationId) {
      this.request.correlationId = this.generateCorrelationId();
    }

    return this.request as NotificationRequest<T>;
  }

  /**
   * Generate a correlation ID
   */
  private generateCorrelationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Factory function to create a new notification builder
 */
export function createNotification<T extends string = string>(templateName: T): NotificationBuilder<T> {
  return new NotificationBuilder(templateName);
}

export default NotificationBuilder;

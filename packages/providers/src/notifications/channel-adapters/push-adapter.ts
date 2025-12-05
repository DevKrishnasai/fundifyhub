/**
 * Push Notification Channel Adapter
 *
 * Handles sending push notifications via Web Push (VAPID).
 * Uses the web-push library for sending notifications to browsers and PWAs.
 * 
 * Features:
 * - VAPID-based authentication
 * - Subscription validation
 * - Payload encryption
 * - TTL (time-to-live) support
 * - Urgency levels mapping
 * 
 * @example
 * ```typescript
 * const pushAdapter = getPushAdapter();
 * await pushAdapter.initialize({
 *   vapidPublicKey: process.env.VAPID_PUBLIC_KEY!,
 *   vapidPrivateKey: process.env.VAPID_PRIVATE_KEY!,
 *   vapidSubject: 'mailto:admin@fundifyhub.com',
 * });
 * 
 * const result = await pushAdapter.send({
 *   recipient: JSON.stringify(subscription), // PushSubscription object
 *   subject: 'New Payment Received',
 *   content: 'Your EMI payment of ₹5,000 has been received.',
 *   priority: NotificationPriority.HIGH,
 *   metadata: {
 *     title: 'Payment Received',
 *     icon: '/icons/payment.png',
 *     actionUrl: '/dashboard/payments',
 *   },
 * });
 * ```
 */

import { createLogger } from '@fundifyhub/logger';
import { NotificationChannel, NotificationPriority } from '@fundifyhub/types';
import {
  BaseChannelAdapter,
  type ChannelSendParams,
  type ChannelSendResult,
} from './base-adapter';

const logger = createLogger({ serviceName: 'PushAdapter' });

/**
 * Web Push subscription object (from browser's PushManager.subscribe())
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription
 */
export interface PushSubscription {
  /** Push service endpoint URL */
  endpoint: string;
  /** Subscription expiration time (milliseconds since epoch, or null) */
  expirationTime?: number | null;
  /** Encryption keys for the subscription */
  keys: {
    /** Base64-encoded p256dh key */
    p256dh: string;
    /** Base64-encoded auth secret */
    auth: string;
  };
}

/**
 * Push notification payload structure
 */
export interface PushPayload {
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Icon URL */
  icon?: string;
  /** Badge URL (for small notification badge) */
  badge?: string;
  /** Image URL for large image */
  image?: string;
  /** Action URL when notification is clicked */
  actionUrl?: string;
  /** Vibration pattern (array of milliseconds) */
  vibrate?: number[];
  /** Tag for notification grouping/replacement */
  tag?: string;
  /** Whether to require interaction */
  requireInteraction?: boolean;
  /** Renotify even if same tag exists */
  renotify?: boolean;
  /** Custom data payload */
  data?: Record<string, unknown>;
  /** Action buttons */
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Push adapter configuration
 */
export interface PushAdapterConfig {
  /** VAPID public key (base64-encoded) */
  vapidPublicKey: string;
  /** VAPID private key (base64-encoded) */
  vapidPrivateKey: string;
  /** VAPID subject (mailto: or https: URL) */
  vapidSubject: string;
  /** Default TTL in seconds (default: 86400 = 24 hours) */
  defaultTtl?: number;
  /** Default urgency level */
  defaultUrgency?: 'very-low' | 'low' | 'normal' | 'high';
}

/** Map priority to Web Push urgency */
const PRIORITY_TO_URGENCY: Record<NotificationPriority, 'very-low' | 'low' | 'normal' | 'high'> = {
  [NotificationPriority.CRITICAL]: 'high',
  [NotificationPriority.HIGH]: 'high',
  [NotificationPriority.NORMAL]: 'normal',
  [NotificationPriority.LOW]: 'low',
  [NotificationPriority.BULK]: 'very-low',
};

/** Map priority to TTL (in seconds) */
const PRIORITY_TO_TTL: Record<NotificationPriority, number> = {
  [NotificationPriority.CRITICAL]: 60 * 60,       // 1 hour
  [NotificationPriority.HIGH]: 4 * 60 * 60,       // 4 hours
  [NotificationPriority.NORMAL]: 24 * 60 * 60,    // 24 hours
  [NotificationPriority.LOW]: 7 * 24 * 60 * 60,   // 7 days
  [NotificationPriority.BULK]: 30 * 24 * 60 * 60, // 30 days
};

/**
 * Extended send params for push notifications
 */
export interface PushSendParams extends ChannelSendParams {
  /** Notification title */
  title?: string;
  /** Action URL when clicked */
  actionUrl?: string;
  /** Icon URL */
  icon?: string;
  /** Image URL */
  image?: string;
  /** Tag for grouping */
  tag?: string;
  /** Custom data */
  data?: Record<string, unknown>;
}

/**
 * Minimal interface for web-push library (for type safety without the dependency)
 */
interface WebPushModule {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(
    subscription: PushSubscription,
    payload: string,
    options?: { TTL?: number; urgency?: string; topic?: string }
  ): Promise<{ statusCode: number }>;
}

/**
 * Push notification adapter using Web Push protocol
 * 
 * This adapter handles sending push notifications to browsers and PWAs
 * using the Web Push protocol with VAPID authentication.
 * 
 * Note: Requires the 'web-push' package to be installed in the worker service.
 * The adapter is designed to queue push notifications that will be processed
 * by the job-worker service which has web-push installed.
 */
export class PushAdapter extends BaseChannelAdapter {
  readonly channel = NotificationChannel.PUSH;
  private config: PushAdapterConfig | null = null;
  private webPush: WebPushModule | null = null;

  /**
   * Initialize the adapter with VAPID credentials
   */
  async initialize(config?: PushAdapterConfig): Promise<void> {
    if (this._initialized) return;

    // Config is optional - if not provided, adapter works in queue-only mode
    if (config) {
      this.config = {
        ...config,
        defaultTtl: config.defaultTtl ?? 86400,
        defaultUrgency: config.defaultUrgency ?? 'normal',
      };

      // Validate VAPID keys format
      if (!this.isValidBase64(config.vapidPublicKey)) {
        throw new Error('Invalid VAPID public key: must be base64-encoded');
      }
      if (!this.isValidBase64(config.vapidPrivateKey)) {
        throw new Error('Invalid VAPID private key: must be base64-encoded');
      }
      if (!config.vapidSubject.startsWith('mailto:') && !config.vapidSubject.startsWith('https://')) {
        throw new Error('Invalid VAPID subject: must start with mailto: or https://');
      }

      // Try to load web-push (may not be available in all environments)
      // Uses require to avoid TypeScript module resolution issues
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const webPushModule = require('web-push') as WebPushModule;
        this.webPush = webPushModule;
        this.webPush.setVapidDetails(
          config.vapidSubject,
          config.vapidPublicKey,
          config.vapidPrivateKey
        );
        logger.info('Push adapter initialized with web-push');
      } catch {
        logger.warn('web-push not available, operating in queue-only mode');
        this.webPush = null;
      }
    }

    this._initialized = true;
    this._isAvailable = true;
    logger.info('Push adapter initialized');
  }

  /**
   * Send a push notification
   * 
   * @param params - Send parameters including subscription and content
   * @returns Result of the send operation
   */
  async send(params: ChannelSendParams): Promise<ChannelSendResult> {
    if (!this._initialized) {
      return this.failureResult('Adapter not initialized', 'not_initialized');
    }

    const pushParams = params as PushSendParams;
    const { recipient, subject, content, priority, metadata } = params;

    // Parse subscription from recipient
    let subscription: PushSubscription;
    try {
      subscription = JSON.parse(recipient) as PushSubscription;
    } catch {
      return this.failureResult('Invalid subscription format: must be JSON', 'invalid_subscription');
    }

    // Validate subscription
    const validationError = this.validateSubscription(subscription);
    if (validationError) {
      return this.failureResult(validationError, 'invalid_subscription');
    }

    // Check if subscription has expired
    if (subscription.expirationTime && subscription.expirationTime < Date.now()) {
      return this.failureResult('Subscription has expired', 'subscription_expired');
    }

    // Build payload
    const payload: PushPayload = {
      title: pushParams.title || subject || 'Notification',
      body: content,
      icon: pushParams.icon || (metadata?.icon as string),
      image: pushParams.image || (metadata?.image as string),
      actionUrl: pushParams.actionUrl || (metadata?.actionUrl as string),
      tag: pushParams.tag || (metadata?.tag as string),
      data: {
        ...pushParams.data,
        url: pushParams.actionUrl || (metadata?.actionUrl as string),
      },
    };

    // Calculate TTL and urgency based on priority
    const ttl = PRIORITY_TO_TTL[priority] || PRIORITY_TO_TTL[NotificationPriority.NORMAL];
    const urgency = PRIORITY_TO_URGENCY[priority] || 'normal';

    // If web-push is available, send directly
    if (this.webPush && this.config) {
      try {
        const result = await this.webPush.sendNotification(
          subscription,
          JSON.stringify(payload),
          {
            TTL: ttl,
            urgency,
            topic: payload.tag,
          }
        );

        const messageId = this.generateMessageId();

        logger.info(`Push notification sent to ${this.maskEndpoint(subscription.endpoint)}`);

        return this.successResult(messageId, {
          endpoint: this.maskEndpoint(subscription.endpoint),
          statusCode: result.statusCode,
          ttl,
          urgency,
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = this.mapErrorToCode(error);

        // Handle specific web-push errors
        if (errorCode === 'subscription_expired' || errorCode === 'subscription_invalid') {
          return this.failureResult(
            `Subscription is no longer valid: ${errorMessage}`,
            errorCode
          );
        }

        return this.failureResult(errorMessage, errorCode);
      }
    }

    // Queue-only mode: return success and let worker handle it
    const messageId = this.generateMessageId();
    logger.info(`Push notification queued for ${this.maskEndpoint(subscription.endpoint)}`);

    return this.successResult(messageId, {
      mode: 'queued',
      endpoint: this.maskEndpoint(subscription.endpoint),
      payload,
      ttl,
      urgency,
    });
  }

  /**
   * Check if push service is healthy
   */
  async healthCheck(): Promise<boolean> {
    // Push is stateless, so just check initialization
    return this._isAvailable;
  }

  /**
   * Shutdown the adapter
   */
  async shutdown(): Promise<void> {
    this._isAvailable = false;
    this._initialized = false;
    this.config = null;
    this.webPush = null;
    logger.info('Push adapter shutdown');
  }

  /**
   * Validate a push subscription object
   */
  private validateSubscription(subscription: PushSubscription): string | null {
    if (!subscription.endpoint) {
      return 'Missing endpoint in subscription';
    }

    try {
      new URL(subscription.endpoint);
    } catch {
      return 'Invalid endpoint URL in subscription';
    }

    if (!subscription.keys) {
      return 'Missing keys in subscription';
    }

    if (!subscription.keys.p256dh) {
      return 'Missing p256dh key in subscription';
    }

    if (!subscription.keys.auth) {
      return 'Missing auth key in subscription';
    }

    return null;
  }

  /**
   * Check if a string is valid base64
   */
  private isValidBase64(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    try {
      return btoa(atob(str)) === str;
    } catch {
      // In Node.js, use Buffer
      try {
        return Buffer.from(str, 'base64').toString('base64') === str;
      } catch {
        return false;
      }
    }
  }

  /**
   * Mask the endpoint for logging (privacy)
   */
  private maskEndpoint(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      const pathParts = url.pathname.split('/');
      if (pathParts.length > 1) {
        const lastPart = pathParts[pathParts.length - 1];
        pathParts[pathParts.length - 1] = lastPart.substring(0, 8) + '...' + lastPart.substring(lastPart.length - 4);
      }
      return `${url.origin}${pathParts.join('/')}`;
    } catch {
      return endpoint.substring(0, 50) + '...';
    }
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `push_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Map web-push errors to error codes
   */
  private mapErrorToCode(error: unknown): string {
    if (!(error instanceof Error)) return 'unknown_error';

    const message = error.message.toLowerCase();
    const statusCode = (error as { statusCode?: number }).statusCode;

    // HTTP status codes
    if (statusCode === 404 || statusCode === 410) {
      return 'subscription_expired';
    }
    if (statusCode === 401) {
      return 'invalid_credentials';
    }
    if (statusCode === 429) {
      return 'rate_limited';
    }

    // Message-based detection
    if (message.includes('expired') || message.includes('unsubscribed')) {
      return 'subscription_expired';
    }
    if (message.includes('invalid') && message.includes('subscription')) {
      return 'subscription_invalid';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'network_error';
    }

    return 'send_failed';
  }
}

// Singleton instance
let pushAdapterInstance: PushAdapter | null = null;

/**
 * Get the push adapter singleton
 */
export function getPushAdapter(): PushAdapter {
  if (!pushAdapterInstance) {
    pushAdapterInstance = new PushAdapter();
  }
  return pushAdapterInstance;
}

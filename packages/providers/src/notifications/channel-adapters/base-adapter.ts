/**
 * Base Channel Adapter
 *
 * Abstract base class for all channel adapters.
 * Provides common functionality and defines the interface that all adapters must implement.
 */

import { createLogger } from '@fundifyhub/logger';
import type {
  NotificationChannel,
  NotificationPriority,
} from '@fundifyhub/types';

const logger = createLogger({ serviceName: 'NotificationAdapter' });

/** Parameters for channel send operation */
export interface ChannelSendParams {
  recipient: string;
  subject?: string;
  content: string;
  htmlContent?: string;
  metadata?: Record<string, unknown>;
  priority: NotificationPriority;
}

/** Result of a channel send operation */
export interface ChannelSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Channel adapter interface */
export interface IChannelAdapter {
  readonly channel: NotificationChannel;
  readonly isAvailable: boolean;

  send(params: ChannelSendParams): Promise<ChannelSendResult>;
  healthCheck(): Promise<boolean>;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

/** Non-retryable error codes */
export const NON_RETRYABLE_ERROR_CODES = new Set([
  'invalid_email',
  'invalid_phone',
  'user_not_found',
  'blocked',
  'unsubscribed',
  'opt_out',
  'invalid_template',
  'missing_variables',
  'content_too_long',
  'invalid_credentials',
  'service_disabled',
]);

/**
 * Abstract base adapter that all channel adapters extend
 */
export abstract class BaseChannelAdapter implements IChannelAdapter {
  abstract readonly channel: NotificationChannel;
  protected _isAvailable = false;
  protected _initialized = false;

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Initialize the adapter (connect to services, validate credentials, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Send a notification through this channel
   */
  abstract send(params: ChannelSendParams): Promise<ChannelSendResult>;

  /**
   * Check if the channel service is healthy
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Cleanup resources when shutting down
   */
  abstract shutdown(): Promise<void>;

  /**
   * Check if an error is retryable
   */
  protected isRetryableError(errorCode?: string): boolean {
    if (!errorCode) return true;
    return !NON_RETRYABLE_ERROR_CODES.has(errorCode);
  }

  /**
   * Create a success result
   */
  protected successResult(messageId?: string, metadata?: Record<string, unknown>): ChannelSendResult {
    return {
      success: true,
      messageId,
      timestamp: new Date(),
      metadata,
    };
  }

  /**
   * Create a failure result
   */
  protected failureResult(error: string, errorCode?: string, metadata?: Record<string, unknown>): ChannelSendResult {
    logger.error(`[${this.channel}] Send failed: ${error} (code: ${errorCode || 'unknown'})`);
    return {
      success: false,
      error,
      errorCode,
      timestamp: new Date(),
      metadata,
    };
  }
}

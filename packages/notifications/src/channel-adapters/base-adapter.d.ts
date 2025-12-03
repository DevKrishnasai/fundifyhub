/**
 * Base Channel Adapter
 *
 * Abstract base class for all channel adapters.
 * Provides common functionality and defines the interface that all adapters must implement.
 */
import type { NotificationChannel, NotificationPriority } from '@fundifyhub/types';
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
export declare const NON_RETRYABLE_ERROR_CODES: Set<string>;
/**
 * Abstract base adapter that all channel adapters extend
 */
export declare abstract class BaseChannelAdapter implements IChannelAdapter {
    abstract readonly channel: NotificationChannel;
    protected _isAvailable: boolean;
    protected _initialized: boolean;
    get isAvailable(): boolean;
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
    protected isRetryableError(errorCode?: string): boolean;
    /**
     * Create a success result
     */
    protected successResult(messageId?: string, metadata?: Record<string, unknown>): ChannelSendResult;
    /**
     * Create a failure result
     */
    protected failureResult(error: string, errorCode?: string, metadata?: Record<string, unknown>): ChannelSendResult;
}
//# sourceMappingURL=base-adapter.d.ts.map
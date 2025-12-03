/**
 * Email Channel Adapter
 *
 * Handles sending email notifications via SMTP using nodemailer.
 * Integrates with the service manager for connection management.
 */
import { NotificationChannel } from '@fundifyhub/types';
import { BaseChannelAdapter, type ChannelSendParams, type ChannelSendResult } from './base-adapter';
/** Email adapter configuration */
export interface EmailAdapterConfig {
    /** SMTP host */
    host: string;
    /** SMTP port */
    port: number;
    /** Use secure connection (TLS) */
    secure: boolean;
    /** SMTP authentication */
    auth: {
        user: string;
        pass: string;
    };
    /** Default from email address */
    fromEmail: string;
    /** Default from name */
    fromName?: string;
    /** Connection timeout in milliseconds */
    connectionTimeout?: number;
    /** Socket timeout in milliseconds */
    socketTimeout?: number;
}
/**
 * Email channel adapter using nodemailer
 *
 * Note: This adapter is designed to work with the existing service-manager
 * architecture. In production, it uses the transporter from service-manager.
 * For testing/standalone usage, it can create its own transporter.
 */
export declare class EmailAdapter extends BaseChannelAdapter {
    readonly channel = NotificationChannel.EMAIL;
    private config;
    /**
     * Initialize with optional config.
     * If no config provided, will use service-manager's transporter.
     */
    initialize(config?: EmailAdapterConfig): Promise<void>;
    /**
     * Send an email notification
     */
    send(params: ChannelSendParams): Promise<ChannelSendResult>;
    /**
     * Check if email service is healthy
     */
    healthCheck(): Promise<boolean>;
    /**
     * Shutdown the adapter
     */
    shutdown(): Promise<void>;
    /**
     * Validate email format
     */
    private isValidEmail;
    /**
     * Generate a unique message ID
     */
    private generateMessageId;
    /**
     * Map error messages to error codes
     */
    private mapErrorToCode;
}
/**
 * Get or create email adapter singleton
 */
export declare function getEmailAdapter(): EmailAdapter;
export default EmailAdapter;
//# sourceMappingURL=email-adapter.d.ts.map
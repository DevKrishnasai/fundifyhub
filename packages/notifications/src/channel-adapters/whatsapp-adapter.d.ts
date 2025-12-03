/**
 * WhatsApp Channel Adapter
 *
 * Handles sending WhatsApp notifications via whatsapp-web.js.
 * Integrates with the service manager for connection management.
 */
import { NotificationChannel } from '@fundifyhub/types';
import { BaseChannelAdapter, type ChannelSendParams, type ChannelSendResult } from './base-adapter';
/** WhatsApp adapter configuration */
export interface WhatsAppAdapterConfig {
    /** Default country dial code (without +) */
    defaultCountryCode: string;
    /** Client session ID for persistence */
    clientId?: string;
}
/**
 * WhatsApp channel adapter using whatsapp-web.js
 *
 * Note: This adapter is designed to work with the existing service-manager
 * architecture. In production, it uses the client from service-manager.
 */
export declare class WhatsAppAdapter extends BaseChannelAdapter {
    readonly channel = NotificationChannel.WHATSAPP;
    private config;
    /**
     * Initialize with optional config
     */
    initialize(config?: Partial<WhatsAppAdapterConfig>): Promise<void>;
    /**
     * Send a WhatsApp notification
     */
    send(params: ChannelSendParams): Promise<ChannelSendResult>;
    /**
     * Check if WhatsApp service is healthy
     */
    healthCheck(): Promise<boolean>;
    /**
     * Shutdown the adapter
     */
    shutdown(): Promise<void>;
    /**
     * Format phone number for WhatsApp
     * Removes non-digits and adds country code if needed
     */
    private formatPhoneNumber;
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
 * Get or create WhatsApp adapter singleton
 */
export declare function getWhatsAppAdapter(): WhatsAppAdapter;
export default WhatsAppAdapter;
//# sourceMappingURL=whatsapp-adapter.d.ts.map